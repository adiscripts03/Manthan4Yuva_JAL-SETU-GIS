import { Router, Request, Response } from 'express';
import { getDB } from '../db/connection.js';

const router = Router();

/**
 * GET /api/flood-events
 * Returns all historical flood events.
 * Data source: assets/nagpur_flood_data.json → historical_flood_events
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const db = getDB();
    const events = await db.collection('flood_events')
      .find({}, { projection: { _data_source: 0 } })
      .sort({ _index: 1 })
      .toArray();

    res.json({
      success: true,
      data: events,
      meta: {
        total: events.length,
        data_source: 'assets/nagpur_flood_data.json → historical_flood_events',
        note: 'Events compiled from primary news sources, government reports, and the VNIT Nagpur flood susceptibility study',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve flood events',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

/**
 * GET /api/flood-events/:index
 * Returns a single flood event by its index (0-based).
 */
router.get('/:index', async (req: Request, res: Response) => {
  try {
    const indexParam = String(req.params.index);
    const index = parseInt(indexParam, 10);
    if (isNaN(index) || index < 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INDEX',
          message: 'Event index must be a non-negative integer',
        },
      });
      return;
    }

    const db = getDB();
    const event = await db.collection('flood_events').findOne(
      { _index: index },
      { projection: { _data_source: 0 } }
    );

    if (!event) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Flood event with index ${index} not found`,
        },
      });
      return;
    }

    res.json({
      success: true,
      data: event,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve flood event',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

export default router;
