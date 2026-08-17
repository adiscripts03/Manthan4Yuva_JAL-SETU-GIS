import { Router, Request, Response } from 'express';
import { getDB } from '../db/connection.js';

const router = Router();

/**
 * GET /api/city
 * Returns Nagpur city metadata from nagpur_flood_data.json → city_metadata.
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const db = getDB();
    const cityData = await db.collection('city_metadata').findOne(
      {},
      { projection: { _id: 0 } }
    );

    if (!cityData) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'City metadata not found. Database may not be seeded.',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: cityData,
      meta: {
        data_source: 'assets/nagpur_flood_data.json → city_metadata',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve city metadata',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

export default router;
