import { Db } from 'mongodb';
import { loadAllAssets } from './loader.js';

/**
 * Seeds all MongoDB collections from the asset files.
 * 
 * This script:
 * 1. Loads all asset files from assets/
 * 2. Transforms raw data into collection documents
 * 3. Upserts data into MongoDB collections (idempotent — safe to re-run)
 * 
 * All data comes ONLY from the supplied assets. No data is fabricated.
 */
export async function seedDatabase(db: Db): Promise<void> {
  console.log('[Seed] Starting database seeding...');

  const assets = loadAllAssets();

  // ── 1. City Metadata ──────────────────────────────────
  await db.collection('city_metadata').deleteMany({});
  await db.collection('city_metadata').insertOne({
    ...assets.floodData.city_metadata,
    _data_source: 'assets/nagpur_flood_data.json → city_metadata',
  });
  console.log('[Seed] ✓ city_metadata seeded (1 document)');

  // ── 2. Historical Flood Events ────────────────────────
  await db.collection('flood_events').deleteMany({});
  const floodEvents = assets.floodData.historical_flood_events.map((event, index) => ({
    ...event,
    _index: index,
    _data_source: 'assets/nagpur_flood_data.json → historical_flood_events',
  }));
  if (floodEvents.length > 0) {
    await db.collection('flood_events').insertMany(floodEvents);
  }
  console.log(`[Seed] ✓ flood_events seeded (${floodEvents.length} documents)`);

  // ── 3. Government Response ────────────────────────────
  await db.collection('government_response').deleteMany({});
  await db.collection('government_response').insertOne({
    ...assets.floodData.post_2023_flood_government_response,
    _data_source: 'assets/nagpur_flood_data.json → post_2023_flood_government_response',
  });
  console.log('[Seed] ✓ government_response seeded (1 document)');

  // ── 4. Named Nullahs ──────────────────────────────────
  await db.collection('nullahs').deleteMany({});
  const nullahs = assets.floodData.named_nullahs_and_water_channels_from_ward_boundaries.map(
    (nullah, index) => ({
      ...nullah,
      _index: index,
      _data_source: 'assets/nagpur_flood_data.json → named_nullahs_and_water_channels_from_ward_boundaries',
    })
  );
  if (nullahs.length > 0) {
    await db.collection('nullahs').insertMany(nullahs);
  }
  console.log(`[Seed] ✓ nullahs seeded (${nullahs.length} documents)`);

  // ── 5. Wards ──────────────────────────────────────────
  await db.collection('wards').deleteMany({});
  // The wards data is a single string with all ward info — store as-is
  await db.collection('wards').insertOne({
    total_wards: 38,
    description: assets.floodData.wards_38_prabhags[0], // Single descriptive entry
    _data_source: 'assets/nagpur_flood_data.json → wards_38_prabhags',
  });
  console.log('[Seed] ✓ wards seeded (1 document)');

  // ── 6. VNIT Frequency Ratio Model ─────────────────────
  await db.collection('risk_model').deleteMany({});
  const frModel = assets.floodData.vnit_frequency_ratio_model as Record<string, unknown>;
  // Separate _note from the actual model data
  const { _note, ...modelData } = frModel;
  await db.collection('risk_model').insertOne({
    ...modelData,
    _note,
    _data_source: 'assets/nagpur_flood_data.json → vnit_frequency_ratio_model (Gaurkhede & Adane 2023, VNIT Nagpur)',
  });
  console.log('[Seed] ✓ risk_model seeded (1 document)');

  // ── 7. Flood Susceptibility Classes ────────────────────
  await db.collection('susceptibility_classes').deleteMany({});
  const classes = assets.floodData.flood_susceptibility_class_areas.map((cls, index) => ({
    ...cls,
    _index: index,
    _data_source: 'assets/nagpur_flood_data.json → flood_susceptibility_class_areas',
  }));
  if (classes.length > 0) {
    await db.collection('susceptibility_classes').insertMany(classes);
  }
  console.log(`[Seed] ✓ susceptibility_classes seeded (${classes.length} documents)`);

  // ── 8. Waterways (from OSM GeoJSON) ────────────────────
  await db.collection('waterways').deleteMany({});
  const waterways = assets.waterways.features.map((feature) => {
    const props = feature.properties;
    return {
      osm_id: props.osm_id as string,
      name: (props.name as string && props.name !== "unnamed") ? props.name as string : undefined,
      waterway: (props.waterway_type as string) || 'unknown',
      geometry: feature.geometry,
      intermittent: (props.intermittent as string) || undefined,
      _data_source: 'assets/nagpur_drainage.geojson (OpenStreetMap Overpass Turbo export)',
      _data_confidence: 'verified_osm',
    };
  });
  if (waterways.length > 0) {
    await db.collection('waterways').insertMany(waterways);
  }
  console.log(`[Seed] ✓ waterways seeded (${waterways.length} documents)`);

  // ── 9. Known Flood Locations ───────────────────────────
  await db.collection('flood_locations').deleteMany({});
  const floodLocations = assets.floodLocations.features.map((feature) => {
    const props = feature.properties;
    return {
      name: props.name as string,
      category: props.category as string,
      source_event: (props.source_event as string) || undefined,
      data_confidence: (props.data_confidence as string) || 'estimated',
      note: (props.note as string) || undefined,
      geometry: feature.geometry,
      _data_source: 'assets/nagpur_known_flood_locations.geojson',
    };
  });
  if (floodLocations.length > 0) {
    await db.collection('flood_locations').insertMany(floodLocations);
  }
  console.log(`[Seed] ✓ flood_locations seeded (${floodLocations.length} documents)`);

  // ── 10. Data Sources / Provenance ─────────────────────
  await db.collection('data_sources').deleteMany({});
  const dataSources = assets.dataSources.map((source, index) => ({
    ...source,
    _index: index,
    refreshed_at: new Date(),
    _data_source: 'assets/data_sources.json',
  }));
  if (dataSources.length > 0) {
    await db.collection('data_sources').insertMany(dataSources);
  }
  console.log(`[Seed] ✓ data_sources seeded (${dataSources.length} documents)`);

  // ── 11. Citizen Reports (empty — user-generated) ───────
  // Don't delete existing citizen reports on re-seed, just ensure collection exists
  const reportCollections = await db.listCollections({ name: 'citizen_reports' }).toArray();
  if (reportCollections.length === 0) {
    await db.createCollection('citizen_reports');
    console.log('[Seed] ✓ citizen_reports collection created (empty)');
  } else {
    console.log('[Seed] ✓ citizen_reports collection already exists');
  }

  // ── 12. Interventions (empty — ready for real data) ────
  const interventionCollections = await db.listCollections({ name: 'interventions' }).toArray();
  if (interventionCollections.length === 0) {
    await db.createCollection('interventions');
    console.log('[Seed] ✓ interventions collection created (empty)');
  } else {
    console.log('[Seed] ✓ interventions collection already exists');
  }

  console.log('[Seed] Database seeding complete.');
}
