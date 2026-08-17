import { Router, Request, Response } from 'express';
import { getDB } from '../db/connection.js';

const router = Router();

/**
 * GET /api/wards
 * Returns ward reference data (38 prabhags).
 * Data source: assets/nagpur_flood_data.json → wards_38_prabhags
 * 
 * NOTE: This is text-based ward data (landmark descriptions),
 * not polygon geometry. No ward boundary polygons are available.
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const db = getDB();
    const wardData = await db.collection('wards').findOne(
      {},
      { projection: { _id: 0, _data_source: 0 } }
    );

    if (!wardData) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Ward data not found. Database may not be seeded.',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: wardData,
      meta: {
        data_source: 'NMC Nagpur 38-prabhag structure, published by Nagpur Today',
        note: 'Landmark-based boundary descriptions only. No polygon geometry available.',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve ward data',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

export default router;
