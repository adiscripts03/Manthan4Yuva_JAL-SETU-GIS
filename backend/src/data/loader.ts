import fs from 'fs';
import path from 'path';
import { config } from '../config/index.js';

/**
 * Raw structure of nagpur_flood_data.json as supplied in assets.
 * This interface matches the exact file layout.
 */
interface RawFloodData {
  _source_note: string;
  city_metadata: Record<string, unknown>;
  historical_flood_events: Record<string, unknown>[];
  post_2023_flood_government_response: Record<string, unknown>;
  named_nullahs_and_water_channels_from_ward_boundaries: Record<string, unknown>[];
  wards_38_prabhags: string[];
  vnit_frequency_ratio_model: Record<string, unknown>;
  flood_susceptibility_class_areas: Record<string, unknown>[];
  still_needs_manual_download: Record<string, unknown>;
}

/**
 * Standard GeoJSON FeatureCollection structure.
 */
interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    properties: Record<string, unknown>;
    geometry: {
      type: string;
      coordinates: unknown;
    };
  }>;
}

export interface LoadedAssets {
  floodData: RawFloodData;
  floodLocations: GeoJSONFeatureCollection;
  waterways: GeoJSONFeatureCollection;
  dataSources: Record<string, unknown>[];
}

/**
 * Reads and parses a JSON file from the assets directory.
 * Throws a descriptive error if the file is missing or malformed.
 */
function loadJSONFile<T>(filename: string): T {
  const filePath = path.join(config.assetsPath, filename);

  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Required asset file not found: ${filePath}\n` +
      `Ensure the assets/ directory contains all required data files.`
    );
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    throw new Error(
      `Failed to parse ${filename}: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

/**
 * Loads all asset files from the assets/ directory.
 * Validates that each file exists and has the expected structure.
 */
export function loadAllAssets(): LoadedAssets {
  console.log(`[DataLoader] Loading assets from: ${config.assetsPath}`);

  const floodData = loadJSONFile<RawFloodData>('nagpur_flood_data.json');
  console.log(`[DataLoader] ✓ nagpur_flood_data.json loaded`);
  console.log(`[DataLoader]   - ${floodData.historical_flood_events.length} historical flood events`);
  console.log(`[DataLoader]   - ${floodData.named_nullahs_and_water_channels_from_ward_boundaries.length} named nullahs`);
  console.log(`[DataLoader]   - ${floodData.wards_38_prabhags.length} ward entries`);

  const floodLocations = loadJSONFile<GeoJSONFeatureCollection>('nagpur_known_flood_locations.geojson');
  console.log(`[DataLoader] ✓ nagpur_known_flood_locations.geojson loaded`);
  console.log(`[DataLoader]   - ${floodLocations.features.length} flood location features`);

  const waterways = loadJSONFile<GeoJSONFeatureCollection>('nagpur_drainage.geojson');
  console.log(`[DataLoader] ✓ nagpur_drainage.geojson loaded`);
  console.log(`[DataLoader]   - ${waterways.features.length} waterway features`);

  const dataSources = loadJSONFile<Record<string, unknown>[]>('data_sources.json');
  console.log(`[DataLoader] ✓ data_sources.json loaded`);
  console.log(`[DataLoader]   - ${dataSources.length} source entries`);

  // Validate basic structure
  if (!floodData.city_metadata) {
    throw new Error('nagpur_flood_data.json is missing city_metadata');
  }
  if (!floodData.vnit_frequency_ratio_model) {
    throw new Error('nagpur_flood_data.json is missing vnit_frequency_ratio_model');
  }
  if (!floodLocations.features || !Array.isArray(floodLocations.features)) {
    throw new Error('nagpur_known_flood_locations.geojson has invalid features array');
  }
  if (!waterways.features || !Array.isArray(waterways.features)) {
    throw new Error('nagpur_drainage.geojson has invalid features array');
  }
  if (!Array.isArray(dataSources)) {
    throw new Error('data_sources.json must contain an array');
  }

  console.log('[DataLoader] All assets loaded and validated successfully.');
  return { floodData, floodLocations, waterways, dataSources };
}
