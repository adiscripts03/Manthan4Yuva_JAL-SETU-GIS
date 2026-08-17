import assert from 'node:assert/strict';
import fs from 'node:fs';
import { MongoClient, ObjectId } from 'mongodb';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:5050';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27018';
const DB_NAME = process.env.DB_NAME || 'jal_setu_validation';

const floodData = JSON.parse(fs.readFileSync(new URL('../../assets/nagpur_flood_data.json', import.meta.url), 'utf8'));
const floodLocations = JSON.parse(fs.readFileSync(new URL('../../assets/nagpur_known_flood_locations.geojson', import.meta.url), 'utf8'));
const waterways = JSON.parse(fs.readFileSync(new URL('../../assets/nagpur_drainage.geojson', import.meta.url), 'utf8'));
const dataSources = JSON.parse(fs.readFileSync(new URL('../../assets/data_sources.json', import.meta.url), 'utf8'));

const tests = [];
function test(name, fn) {
    tests.push({ name, fn });
}

async function request(path, options = {}) {
    const res = await fetch(`${BASE_URL}${path}`, {
        headers: options.body && !options.headers ? { 'content-type': 'application/json' } : options.headers,
        ...options,
    });
    const text = await res.text();
    let body;
    try {
        body = text ? JSON.parse(text) : null;
    } catch {
        body = text;
    }
    return { status: res.status, body };
}

function expectSuccess(response, status = 200) {
    assert.equal(response.status, status);
    assert.equal(response.body.success, true);
}

function expectError(response, status, code) {
    assert.equal(response.status, status);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, code);
}

function assetWaterwayDoc(feature) {
    const props = feature.properties;
    return {
        osm_id: String(props.osm_id ?? props['@id']),
        name: props.name,
        waterway: props.waterway_type || props.waterway || props.type || 'unknown',
        geometry: feature.geometry,
    };
}

let client;
let db;
let createdReportId;
let createdInterventionId;

test('assets load with expected top-level schema and counts', () => {
    assert.equal(floodData.city_metadata.name, 'Nagpur');
    assert.equal(floodData.historical_flood_events.length, 4);
    assert.equal(floodData.named_nullahs_and_water_channels_from_ward_boundaries.length, 9);
    assert.equal(floodData.flood_susceptibility_class_areas.length, 5);
    assert.equal(floodLocations.type, 'FeatureCollection');
    assert.equal(floodLocations.features.length, 13);
    assert.equal(waterways.type, 'FeatureCollection');
    assert.equal(waterways.features.length, 282);
    assert.equal(dataSources.length, 5);
});

test('asset geometries use valid GeoJSON coordinates', () => {
    for (const feature of floodLocations.features) {
        assert.equal(feature.geometry.type, 'Point');
        const [lng, lat] = feature.geometry.coordinates;
        assert.ok(lng >= -180 && lng <= 180);
        assert.ok(lat >= -90 && lat <= 90);
    }
    for (const feature of waterways.features) {
        assert.ok(['LineString', 'MultiLineString'].includes(feature.geometry.type));
        assert.ok(Array.isArray(feature.geometry.coordinates));
    }
});

test('database seeded all authoritative asset collections without dropping records', async () => {
    assert.equal(await db.collection('city_metadata').countDocuments(), 1);
    assert.equal(await db.collection('flood_events').countDocuments(), floodData.historical_flood_events.length);
    assert.equal(await db.collection('nullahs').countDocuments(), floodData.named_nullahs_and_water_channels_from_ward_boundaries.length);
    assert.equal(await db.collection('susceptibility_classes').countDocuments(), floodData.flood_susceptibility_class_areas.length);
    assert.equal(await db.collection('flood_locations').countDocuments(), floodLocations.features.length);
    assert.equal(await db.collection('waterways').countDocuments(), waterways.features.length);
    assert.equal(await db.collection('data_sources').countDocuments(), dataSources.length);
});

test('seed preserves representative source values', async () => {
    const city = await db.collection('city_metadata').findOne({});
    assert.equal(city.annual_avg_rainfall_mm, floodData.city_metadata.annual_avg_rainfall_mm);
    const event0 = await db.collection('flood_events').findOne({ _index: 0 });
    assert.equal(event0.date, floodData.historical_flood_events[0].date);
    assert.equal(event0.houses_affected, floodData.historical_flood_events[0].houses_affected);
    const firstWaterway = assetWaterwayDoc(waterways.features[0]);
    const storedWaterway = await db.collection('waterways').findOne({ osm_id: firstWaterway.osm_id });
    assert.equal(storedWaterway.name, firstWaterway.name);
    assert.deepEqual(storedWaterway.geometry, firstWaterway.geometry);
});

test('GET /api exposes backend index', async () => {
    const res = await request('/api');
    assert.equal(res.status, 200);
    assert.equal(res.body.name, 'Jal Setu Nagpur — Backend API');
    assert.ok(res.body.endpoints.health);
});

test('GET /api/health reports database collections', async () => {
    const res = await request('/api/health');
    expectSuccess(res);
    assert.equal(res.body.data.status, 'healthy');
    assert.equal(res.body.data.collections.waterways, waterways.features.length);
});

test('GET /api/city matches city metadata asset', async () => {
    const res = await request('/api/city');
    expectSuccess(res);
    assert.equal(res.body.data.name, floodData.city_metadata.name);
    assert.equal(res.body.data.center_lat, floodData.city_metadata.center_lat);
});

test('GET /api/flood-events returns all events in source order', async () => {
    const res = await request('/api/flood-events');
    expectSuccess(res);
    assert.equal(res.body.meta.total, floodData.historical_flood_events.length);
    assert.equal(res.body.data[0].date, floodData.historical_flood_events[0].date);
});

test('GET /api/flood-events/:index returns the selected event', async () => {
    const res = await request('/api/flood-events/0');
    expectSuccess(res);
    assert.equal(res.body.data.date, floodData.historical_flood_events[0].date);
});

test('GET /api/flood-events rejects invalid and missing event indexes safely', async () => {
    expectError(await request('/api/flood-events/-1'), 400, 'INVALID_INDEX');
    expectError(await request('/api/flood-events/9999'), 404, 'NOT_FOUND');
});

test('GET /api/nullahs returns all named nullahs', async () => {
    const res = await request('/api/nullahs');
    expectSuccess(res);
    assert.equal(res.body.meta.total, floodData.named_nullahs_and_water_channels_from_ward_boundaries.length);
    assert.equal(res.body.data[0].name, floodData.named_nullahs_and_water_channels_from_ward_boundaries[0].name);
});

test('GET /api/wards returns the ward reference document', async () => {
    const res = await request('/api/wards');
    expectSuccess(res);
    assert.equal(res.body.data.total_wards, 38);
    assert.equal(res.body.data.description, floodData.wards_38_prabhags[0]);
});

test('GET /api/government-response returns post-2023 response data', async () => {
    const res = await request('/api/government-response');
    expectSuccess(res);
    assert.equal(
        res.body.data.integrated_drainage_plan_approved_nov_2023_crore,
        floodData.post_2023_flood_government_response.integrated_drainage_plan_approved_nov_2023_crore
    );
});

test('GET /api/waterways returns all source waterways', async () => {
    const res = await request('/api/waterways');
    expectSuccess(res);
    assert.equal(res.body.meta.total, waterways.features.length);
    assert.equal(res.body.data.length, waterways.features.length);
});

test('GET /api/waterways/stats counts by type from the asset file', async () => {
    const expected = {};
    for (const feature of waterways.features) {
        const type = feature.properties.waterway || feature.properties.type || 'unknown';
        expected[type] = (expected[type] || 0) + 1;
    }
    const res = await request('/api/waterways/stats');
    expectSuccess(res);
    assert.equal(res.body.data.total, waterways.features.length);
    assert.deepEqual(res.body.data.by_type, expected);
});

test('GET /api/waterways filters by valid type', async () => {
    const expected = waterways.features.filter(feature => feature.properties.waterway === 'drain').length;
    const res = await request('/api/waterways?type=drain');
    expectSuccess(res);
    assert.equal(res.body.meta.total, expected);
    assert.ok(res.body.data.every(item => item.waterway === 'drain'));
});

test('GET /api/waterways rejects invalid type and malformed bbox', async () => {
    expectError(await request('/api/waterways?type=lake'), 400, 'INVALID_TYPE');
    expectError(await request('/api/waterways?bbox=79,21,not-a-number,22'), 400, 'INVALID_BBOX');
});

test('GET /api/waterways/:osmId returns a known OSM waterway', async () => {
    const first = assetWaterwayDoc(waterways.features[0]);
    const res = await request(`/api/waterways/${encodeURIComponent(first.osm_id)}`);
    expectSuccess(res);
    assert.equal(res.body.data.osm_id, first.osm_id);
    assert.equal(res.body.data.name, first.name);
});

test('GET /api/waterways/:osmId returns 404 for nonexistent waterway', async () => {
    expectError(await request('/api/waterways/way%2Fdoes-not-exist'), 404, 'NOT_FOUND');
});

test('GET /api/flood-locations returns and filters known flood locations', async () => {
    const all = await request('/api/flood-locations');
    expectSuccess(all);
    assert.equal(all.body.meta.total, floodLocations.features.length);
    const category = 'flood_affected_area';
    const expected = floodLocations.features.filter(feature => feature.properties.category === category).length;
    const filtered = await request(`/api/flood-locations?category=${category}`);
    expectSuccess(filtered);
    assert.equal(filtered.body.data.length, expected);
});

test('GET /api/flood-locations rejects malformed bbox', async () => {
    expectError(await request('/api/flood-locations?bbox=79,21,78,22'), 400, 'INVALID_BBOX');
});

test('GET /api/risk-model returns VNIT FR model tables', async () => {
    const res = await request('/api/risk-model');
    expectSuccess(res);
    assert.equal(res.body.data.model_accuracy_pct, floodData.vnit_frequency_ratio_model.model_accuracy_pct);
    assert.ok(Array.isArray(res.body.data.distance_from_river_m));
    assert.ok(Array.isArray(res.body.data.rainfall_mm));
});

test('GET /api/risk-model/susceptibility returns class areas', async () => {
    const res = await request('/api/risk-model/susceptibility');
    expectSuccess(res);
    assert.deepEqual(res.body.data, floodData.flood_susceptibility_class_areas);
});

test('GET /api/risk-model/score computes a deterministic partial risk score', async () => {
    const res = await request('/api/risk-model/score?lat=21.1458&lng=79.0882');
    expectSuccess(res);
    assert.equal(res.body.data.lat, 21.1458);
    assert.equal(res.body.data.lng, 79.0882);
    assert.ok(res.body.data.normalized_score >= 0 && res.body.data.normalized_score <= 100);
    assert.ok(res.body.data.factors.some(f => f.parameter === 'Distance from River/Waterway'));
    assert.ok(res.body.data.data_limitations.some(v => v.includes('DEM')));
});

test('GET /api/risk-model/score rejects invalid coordinates', async () => {
    expectError(await request('/api/risk-model/score?lat=abc&lng=79'), 400, 'INVALID_COORDINATES');
    expectError(await request('/api/risk-model/score?lat=91&lng=79'), 400, 'INVALID_COORDINATES');
});

test('GET /api/analytics/summary aggregates seeded data', async () => {
    const res = await request('/api/analytics/summary');
    expectSuccess(res);
    assert.equal(res.body.data.city.name, floodData.city_metadata.name);
    assert.equal(res.body.data.waterways.total, waterways.features.length);
    assert.equal(res.body.data.flood_events.total, floodData.historical_flood_events.length);
    assert.equal(res.body.data.flood_locations.total, floodLocations.features.length);
    assert.equal(res.body.data.nullahs.total, floodData.named_nullahs_and_water_channels_from_ward_boundaries.length);
});

test('GET /api/data-sources returns ingested and candidate source provenance', async () => {
    const res = await request('/api/data-sources');
    expectSuccess(res);
    assert.equal(res.body.meta.total, dataSources.length);
    assert.ok(res.body.data.some(source => source.id === 'osm_overpass_drainage' && source.status === 'ingested'));
    assert.ok(res.body.data.some(source => source.id === 'imd_weather_api' && source.status === 'credentials_required'));
});

test('GET /api/citizen-reports initially returns an empty collection', async () => {
    const res = await request('/api/citizen-reports');
    expectSuccess(res);
    assert.equal(res.body.meta.total, 0);
    assert.deepEqual(res.body.data, []);
});

test('POST /api/citizen-reports validates required fields', async () => {
    const res = await request('/api/citizen-reports', {
        method: 'POST',
        body: JSON.stringify({ description: '' }),
    });
    expectError(res, 400, 'VALIDATION_ERROR');
});

test('POST /api/citizen-reports rejects malformed JSON with a client error', async () => {
    const res = await request('/api/citizen-reports', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{"location":',
    });
    expectError(res, 400, 'BAD_JSON');
});

test('POST /api/citizen-reports creates a valid pending report', async () => {
    const res = await request('/api/citizen-reports', {
        method: 'POST',
        body: JSON.stringify({
            location: { type: 'Point', coordinates: [79.0882, 21.1458] },
            estimated_depth: 'knee',
            description: 'Waterlogging observed near test point',
        }),
    });
    expectSuccess(res, 201);
    assert.equal(res.body.data.status, 'pending');
    assert.equal(res.body.data.description, 'Waterlogging observed near test point');
    createdReportId = res.body.data._id;
});

test('GET /api/citizen-reports filters by status and rejects invalid filters', async () => {
    const pending = await request('/api/citizen-reports?status=pending');
    expectSuccess(pending);
    assert.equal(pending.body.meta.total, 1);
    assert.equal(pending.body.data[0]._id, createdReportId);
    expectError(await request('/api/citizen-reports?status=closed'), 400, 'INVALID_STATUS');
    expectError(await request('/api/citizen-reports?bbox=79,21,80'), 400, 'INVALID_BBOX');
});

test('GET /api/citizen-reports rejects invalid numeric limits', async () => {
    const res = await request('/api/citizen-reports?limit=-1');
    expectError(res, 400, 'INVALID_LIMIT');
});

test('GET /api/interventions initially returns an empty collection', async () => {
    const res = await request('/api/interventions');
    expectSuccess(res);
    assert.equal(res.body.meta.total, 0);
    assert.deepEqual(res.body.data, []);
});

test('POST /api/interventions validates required fields', async () => {
    const res = await request('/api/interventions', {
        method: 'POST',
        body: JSON.stringify({ work_order_id: 'WO-BAD' }),
    });
    expectError(res, 400, 'VALIDATION_ERROR');
});

test('POST /api/interventions creates a valid work order', async () => {
    const res = await request('/api/interventions', {
        method: 'POST',
        body: JSON.stringify({
            work_order_id: 'WO-VALIDATION-001',
            type: 'desilting',
            description: 'Desilting validation work order',
            status: 'planned',
            cost_estimate: 50000,
        }),
    });
    expectSuccess(res, 201);
    assert.equal(res.body.data.work_order_id, 'WO-VALIDATION-001');
    assert.equal(res.body.data.status, 'planned');
    createdInterventionId = res.body.data._id;
});

test('POST /api/interventions rejects duplicate work_order_id', async () => {
    const res = await request('/api/interventions', {
        method: 'POST',
        body: JSON.stringify({
            work_order_id: 'WO-VALIDATION-001',
            type: 'desilting',
            description: 'Duplicate validation work order',
            status: 'planned',
        }),
    });
    expectError(res, 409, 'DUPLICATE');
});

test('GET /api/interventions/:id returns created intervention', async () => {
    const res = await request(`/api/interventions/${createdInterventionId}`);
    expectSuccess(res);
    assert.equal(res.body.data.work_order_id, 'WO-VALIDATION-001');
});

test('GET /api/interventions/:id validates ids and missing records', async () => {
    expectError(await request('/api/interventions/not-an-object-id'), 400, 'INVALID_ID');
    expectError(await request(`/api/interventions/${new ObjectId().toString()}`), 404, 'NOT_FOUND');
});

test('PATCH /api/interventions/:id validates update payloads', async () => {
    expectError(await request(`/api/interventions/${createdInterventionId}`, {
        method: 'PATCH',
        body: JSON.stringify({}),
    }), 400, 'NO_UPDATES');
    expectError(await request(`/api/interventions/${createdInterventionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'blocked' }),
    }), 400, 'INVALID_STATUS');
});

test('PATCH /api/interventions/:id updates allowed fields', async () => {
    const res = await request(`/api/interventions/${createdInterventionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed', after_photo_url: 'https://example.test/after.jpg' }),
    });
    expectSuccess(res);
    assert.equal(res.body.data.status, 'completed');
    assert.equal(res.body.data.after_photo_url, 'https://example.test/after.jpg');
});

test('unknown endpoint and unsupported methods fail safely', async () => {
    expectError(await request('/api/does-not-exist'), 404, 'NOT_FOUND');
    const res = await request('/api/city', { method: 'POST', body: JSON.stringify({}) });
    expectError(res, 404, 'NOT_FOUND');
});

async function cleanup() {
    if (!db) return;
    await db.collection('citizen_reports').deleteMany({});
    await db.collection('interventions').deleteMany({});
}

async function main() {
    client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db(DB_NAME);
    await cleanup();

    const failures = [];
    let passed = 0;

    for (const { name, fn } of tests) {
        try {
            await fn();
            passed += 1;
            console.log(`PASS ${name}`);
        } catch (error) {
            failures.push({ name, error });
            console.log(`FAIL ${name}`);
            console.log(`  ${error?.stack || error}`);
        }
    }

    await cleanup();
    await client.close();

    console.log('\nValidation summary');
    console.log(`Total: ${tests.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failures.length}`);

    if (failures.length > 0) {
        process.exitCode = 1;
    }
}

main().catch(async (error) => {
    console.error(error);
    if (client) await client.close();
    process.exit(1);
});
