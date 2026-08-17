import { Db } from 'mongodb';
import * as turf from '@turf/turf';
import type { Feature, LineString, MultiLineString } from 'geojson';
import type { RiskScoreResult, RiskFactor, FREntry } from '../types/index.js';

/**
 * Risk calculator service using the VNIT Frequency Ratio model.
 * 
 * The FR model from Gaurkhede & Adane (2023) provides frequency ratio weights
 * across 10 geospatial parameters. For each parameter, a higher FR value means
 * a stronger correlation with historical flooding.
 * 
 * LIMITATIONS (documented, not hidden):
 * - Without DEM raster data, we cannot determine elevation/slope/TWI for arbitrary points
 * - Without LULC raster data, we use "Built up" as the default (74% of Nagpur)
 * - We CAN compute: distance from nearest waterway, proximity to known flood locations
 * - We serve the full FR parameter tables so clients/future integrations can compute
 *   richer scores when raster data becomes available
 */

interface FRModelData {
  altitude_m: FREntry[];
  slope_deg: FREntry[];
  twi: FREntry[];
  lulc: FREntry[];
  soil_texture: FREntry[];
  rainfall_mm: FREntry[];
  surface_runoff_by_land_use: FREntry[];
  distance_from_river_m: FREntry[];
  lithology: FREntry[];
  landform: FREntry[];
}

/**
 * Computes a flood risk score for a given lat/lng coordinate.
 * 
 * Currently uses available parameters:
 * 1. Distance from nearest waterway → mapped to FR distance_from_river_m table
 * 2. LULC default → "Built up" FR (conservative assumption for urban Nagpur)
 * 3. Soil default → "Clayey" FR (91.53% of Nagpur is clayey soil)
 * 4. Landform default → "Pediment-pediplain complex" FR (95.95% of Nagpur)
 * 5. Rainfall default → city average 1205mm → mapped to FR rainfall table
 * 6. Proximity to known flood locations
 * 
 * Parameters NOT computable without raster data (documented as limitations):
 * - Altitude, Slope, TWI, Lithology, Surface Runoff
 */
export async function computeRiskScore(
  db: Db,
  lat: number,
  lng: number
): Promise<RiskScoreResult> {
  const point = turf.point([lng, lat]);
  const factors: RiskFactor[] = [];
  const dataLimitations: string[] = [];

  // Load FR model from DB
  const modelDoc = await db.collection('risk_model').findOne({});
  if (!modelDoc) {
    throw new Error('Risk model data not found in database. Run seed first.');
  }

  const model = modelDoc as unknown as FRModelData;

  // ── Max FR values per parameter (for normalization) ────
  const maxFRs: Record<string, number> = {
    altitude_m: Math.max(...model.altitude_m.map(e => e.FR)),
    slope_deg: Math.max(...model.slope_deg.map(e => e.FR)),
    twi: Math.max(...model.twi.map(e => e.FR)),
    lulc: Math.max(...model.lulc.map(e => e.FR)),
    soil_texture: Math.max(...model.soil_texture.map(e => e.FR)),
    rainfall_mm: Math.max(...model.rainfall_mm.map(e => e.FR)),
    surface_runoff_by_land_use: Math.max(...model.surface_runoff_by_land_use.map(e => e.FR)),
    distance_from_river_m: Math.max(...model.distance_from_river_m.map(e => e.FR)),
    lithology: Math.max(...model.lithology.map(e => e.FR)),
    landform: Math.max(...model.landform.map(e => e.FR)),
  };

  // ── 1. Distance from nearest waterway ──────────────────
  const nearestWaterway = await db.collection('waterways').findOne(
    {
      geometry: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
        },
      },
    }
  );

  let distanceFromRiverM = 1000; // default fallback
  let nearestWaterwayInfo: RiskScoreResult['nearest_waterway'] | undefined;

  if (nearestWaterway) {
    // Calculate actual distance to nearest waterway
    const wwGeom = nearestWaterway.geometry;
    const wwFeature = turf.feature(wwGeom);
    const nearestPt = turf.nearestPointOnLine(wwFeature as Feature<LineString | MultiLineString>, point);
    distanceFromRiverM = (nearestPt.properties?.dist ?? 1) * 1000; // turf returns km

    nearestWaterwayInfo = {
      name: nearestWaterway.name || undefined,
      type: nearestWaterway.waterway,
      distance_km: parseFloat((distanceFromRiverM / 1000).toFixed(3)),
    };
  }

  // Map distance to FR table entry
  const distEntry = findDistanceEntry(model.distance_from_river_m, distanceFromRiverM);
  factors.push({
    parameter: 'Distance from River/Waterway',
    value_range: distEntry.range || 'unknown',
    fr_value: distEntry.FR,
    max_fr: maxFRs.distance_from_river_m,
    interpretation: distEntry.FR >= 1.0 ? 'Increases flood risk' : 'Decreases flood risk',
  });

  // ── 2. LULC — default to "Built up" (74% of Nagpur) ───
  const builtUpEntry = model.lulc.find(e => e.class === 'Built up');
  if (builtUpEntry) {
    factors.push({
      parameter: 'Land Use / Land Cover',
      value_range: 'Built up (default — 74% of Nagpur area)',
      fr_value: builtUpEntry.FR,
      max_fr: maxFRs.lulc,
      interpretation: 'Urban built-up areas have moderate flood correlation (FR=1.24)',
    });
  }
  dataLimitations.push('LULC: Using default "Built up" class. Actual LULC classification requires satellite raster data.');

  // ── 3. Soil — default to "Clayey" (91.53% of Nagpur) ──
  const clayeyEntry = model.soil_texture.find(e => e.class === 'Clayey');
  if (clayeyEntry) {
    factors.push({
      parameter: 'Soil Texture',
      value_range: 'Clayey (default — 91.53% of Nagpur area)',
      fr_value: clayeyEntry.FR,
      max_fr: maxFRs.soil_texture,
      interpretation: 'Clayey soil has low infiltration, contributes to surface runoff',
    });
  }

  // ── 4. Landform — default to pediment-pediplain ────────
  const pediplainEntry = model.landform.find(e => e.type?.includes('pediment-pediplain'));
  if (pediplainEntry) {
    factors.push({
      parameter: 'Landform',
      value_range: 'Pediment-pediplain complex (95.95% of Nagpur)',
      fr_value: pediplainEntry.FR,
      max_fr: maxFRs.landform,
      interpretation: 'Dominant landform type with moderate flood correlation (FR=1.03)',
    });
  }

  // ── 5. Rainfall — default to city average ──────────────
  const rainfallEntry = findRainfallEntry(model.rainfall_mm, 1205);
  if (rainfallEntry) {
    factors.push({
      parameter: 'Annual Rainfall',
      value_range: rainfallEntry.range || '~1205mm (city average)',
      fr_value: rainfallEntry.FR,
      max_fr: maxFRs.rainfall_mm,
      interpretation: rainfallEntry.FR >= 1.0 ? 'High-rainfall zone correlates with flooding' : 'Moderate rainfall zone',
    });
  }
  dataLimitations.push('Rainfall: Using city average (1205mm). Spatially-varying rainfall data requires IMD gridded data or station records.');

  // ── Parameters we CANNOT compute ───────────────────────
  dataLimitations.push('Altitude: Requires SRTM DEM raster data (not in assets).');
  dataLimitations.push('Slope: Requires DEM-derived slope raster (not in assets).');
  dataLimitations.push('TWI (Topographic Wetness Index): Requires DEM-derived TWI raster (not in assets).');
  dataLimitations.push('Lithology: Requires geological map raster/vector data (not in assets).');
  dataLimitations.push('Surface Runoff: Requires land-use + curve number calculation (not in assets).');

  // ── 6. Proximity to known flood locations ──────────────
  const nearestFloodLoc = await db.collection('flood_locations').findOne(
    {
      geometry: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
        },
      },
    }
  );

  let nearestFloodInfo: RiskScoreResult['nearest_flood_location'] | undefined;
  let floodProximityBonus = 0;

  if (nearestFloodLoc) {
    const floodPoint = turf.point(nearestFloodLoc.geometry.coordinates);
    const distKm = turf.distance(point, floodPoint, { units: 'kilometers' });
    nearestFloodInfo = {
      name: nearestFloodLoc.name,
      distance_km: parseFloat(distKm.toFixed(3)),
    };

    // Proximity bonus: closer to known flood location = higher risk
    if (distKm < 0.5) floodProximityBonus = 2.0;
    else if (distKm < 1.0) floodProximityBonus = 1.5;
    else if (distKm < 2.0) floodProximityBonus = 1.0;
    else if (distKm < 5.0) floodProximityBonus = 0.5;
  }

  if (floodProximityBonus > 0) {
    factors.push({
      parameter: 'Proximity to Known Flood Location',
      value_range: `${nearestFloodInfo?.distance_km}km from ${nearestFloodInfo?.name}`,
      fr_value: floodProximityBonus,
      max_fr: 2.0,
      interpretation: floodProximityBonus >= 1.5
        ? 'Very close to a historically flood-affected area'
        : 'Near a known flood-affected area',
    });
  }

  // ── Calculate overall score ────────────────────────────
  const totalFR = factors.reduce((sum, f) => sum + f.fr_value, 0);
  const totalMaxFR = factors.reduce((sum, f) => sum + f.max_fr, 0);
  const normalizedScore = totalMaxFR > 0
    ? Math.round((totalFR / totalMaxFR) * 100)
    : 0;

  return {
    lat,
    lng,
    overall_score: parseFloat(totalFR.toFixed(2)),
    max_possible_score: parseFloat(totalMaxFR.toFixed(2)),
    normalized_score: Math.min(normalizedScore, 100),
    factors,
    nearest_flood_location: nearestFloodInfo,
    nearest_waterway: nearestWaterwayInfo,
    data_limitations: dataLimitations,
  };
}

/**
 * Finds the matching distance_from_river entry for a given distance in meters.
 */
function findDistanceEntry(entries: FREntry[], distanceM: number): FREntry {
  if (distanceM <= 200) return entries.find(e => e.range === '0-200') || entries[0];
  if (distanceM <= 400) return entries.find(e => e.range === '200-400') || entries[1];
  if (distanceM <= 600) return entries.find(e => e.range === '400-600') || entries[2];
  if (distanceM <= 800) return entries.find(e => e.range === '600-800') || entries[3];
  if (distanceM <= 1000) return entries.find(e => e.range === '800-1000') || entries[4];
  return entries.find(e => e.range === '>1000') || entries[entries.length - 1];
}

/**
 * Finds the matching rainfall entry for a given annual rainfall in mm.
 */
function findRainfallEntry(entries: FREntry[], rainfallMm: number): FREntry | undefined {
  if (rainfallMm < 1200) return entries.find(e => e.range === '<1200');
  if (rainfallMm <= 1203) return entries.find(e => e.range === '1201-1203');
  if (rainfallMm <= 1206) return entries.find(e => e.range === '1204-1206');
  if (rainfallMm <= 1209) return entries.find(e => e.range === '1207-1209');
  if (rainfallMm <= 1212) return entries.find(e => e.range === '1210-1212');
  if (rainfallMm <= 1214) return entries.find(e => e.range === '1213-1214');
  if (rainfallMm <= 1217) return entries.find(e => e.range === '1215-1217');
  return entries.find(e => e.range === '1218-1226');
}
