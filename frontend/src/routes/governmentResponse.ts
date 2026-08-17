import { Router, Request, Response } from 'express';
import { getDB } from '../db/connection.js';

const router = Router();

/**
 * GET /api/government-response
 * Returns post-2023 flood government response data.
 * Data source: assets/nagpur_flood_data.json → post_2023_flood_government_response
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const db = getDB();
    const response = await db.collection('government_response').findOne(
      {},
      { projection: { _id: 0, _data_source: 0 } }
    );

    if (!response) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Government response data not found. Database may not be seeded.',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: response,
      meta: {
        data_source: 'assets/nagpur_flood_data.json → post_2023_flood_government_response',
        note: 'Data as of Sept 2025. Covers spending, pumping station progress, and work status after the 2023 flood.',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve government response data',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

export default router;
