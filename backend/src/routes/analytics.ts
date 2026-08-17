import { Router, Request, Response } from 'express';
import { getDB } from '../db/connection.js';

const router = Router();

/**
 * GET /api/analytics/summary
 * Returns aggregate statistics across all datasets.
 * All data sourced from the actual asset files — no fabricated numbers.
 */
router.get('/summary', async (_req: Request, res: Response) => {
  try {
    const db = getDB();

    // Waterway stats
    const waterwayStats = await db.collection('waterways').aggregate([
      { $group: { _id: '$waterway', count: { $sum: 1 } } },
    ]).toArray();
    const totalWaterways = waterwayStats.reduce((sum, s) => sum + s.count, 0);
    const waterwaysByType = Object.fromEntries(
      waterwayStats.map(s => [s._id, s.count])
    );

    // Flood events count
    const floodEventsCount = await db.collection('flood_events').countDocuments();

    // Flood locations count
    const floodLocationsCount = await db.collection('flood_locations').countDocuments();
    const locationsByCategory = await db.collection('flood_locations').aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]).toArray();

    // Susceptibility classes
    const susceptibilityClasses = await db.collection('susceptibility_classes')
      .find({}, { projection: { _id: 0, _data_source: 0, _index: 0 } })
      .sort({ _index: 1 })
      .toArray();

    // Named nullahs count
    const nullahsCount = await db.collection('nullahs').countDocuments();

    // Citizen reports count
    const citizenReportsCount = await db.collection('citizen_reports').countDocuments();
    const reportsByStatus = await db.collection('citizen_reports').aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]).toArray();

    // Interventions count
    const interventionsCount = await db.collection('interventions').countDocuments();
    const interventionsByStatus = await db.collection('interventions').aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]).toArray();

    // City metadata
    const cityMeta = await db.collection('city_metadata').findOne(
      {},
      { projection: { _id: 0, _data_source: 0 } }
    );

    res.json({
      success: true,
      data: {
        city: cityMeta ? {
          name: cityMeta.name,
          area_km2: cityMeta.municipal_area_km2,
          annual_avg_rainfall_mm: cityMeta.annual_avg_rainfall_mm,
          built_up_pct: cityMeta.built_up_pct,
          drainage_coverage_pct: cityMeta.drainage_sewage_infra_coverage_pct,
        } : null,
        waterways: {
          total: totalWaterways,
          by_type: waterwaysByType,
        },
        flood_events: {
          total: floodEventsCount,
        },
        flood_locations: {
          total: floodLocationsCount,
          by_category: Object.fromEntries(
            locationsByCategory.map(s => [s._id, s.count])
          ),
        },
        susceptibility: {
          classes: susceptibilityClasses,
        },
        nullahs: {
          total: nullahsCount,
        },
        citizen_reports: {
          total: citizenReportsCount,
          by_status: Object.fromEntries(
            reportsByStatus.map(s => [s._id, s.count])
          ),
        },
        interventions: {
          total: interventionsCount,
          by_status: Object.fromEntries(
            interventionsByStatus.map(s => [s._id, s.count])
          ),
        },
      },
      meta: {
        generated_at: new Date().toISOString(),
        data_source: 'All statistics computed from actual asset data loaded into MongoDB',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to compute analytics summary',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

export default router;
