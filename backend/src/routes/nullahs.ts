import { Router, Request, Response } from 'express';
import { getDB } from '../db/connection.js';

const router = Router();

/**
 * GET /api/nullahs
 * Returns named nullahs/water channels from NMC ward boundary descriptions.
 * Data source: assets/nagpur_flood_data.json → named_nullahs_and_water_channels_from_ward_boundaries
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const db = getDB();
    const nullahs = await db.collection('nullahs')
      .find({}, { projection: { _data_source: 0 } })
      .sort({ _index: 1 })
      .toArray();

    res.json({
      success: true,
      data: nullahs,
      meta: {
        total: nullahs.length,
        data_source: 'NMC ward boundary descriptions via nagpur_flood_data.json',
        note: 'These are text-based references with landmark descriptions, not precise GIS coordinates',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve nullahs',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

export default router;
