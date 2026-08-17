import { Router, Request, Response } from 'express';
import { getDB } from '../db/connection.js';
import { parseBbox, bboxToMongoFilter } from '../utils/validation.js';

const router = Router();

/**
 * GET /api/flood-locations?bbox=west,south,east,north
 * Returns known flood-affected locations with optional bbox filtering.
 * Data source: assets/nagpur_known_flood_locations.geojson
 * 
 * NOTE: These are area-level centroids (estimated), not precise flood points.
 * The data_confidence field is "estimated" for all points.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const filter: Record<string, unknown> = {};

    // Bbox filtering
    const bbox = parseBbox(req.query.bbox as string);
    if (req.query.bbox && !bbox) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_BBOX',
          message: 'Invalid bbox format. Expected: west,south,east,north',
        },
      });
      return;
    }

    if (bbox) {
      Object.assign(filter, bboxToMongoFilter(bbox));
    }

    // Category filtering
    const category = req.query.category as string;
    if (category) {
      filter.category = category;
    }

    const locations = await db.collection('flood_locations')
      .find(filter, { projection: { _data_source: 0 } })
      .toArray();

    res.json({
      success: true,
      data: locations,
      meta: {
        total: locations.length,
        bbox: bbox ? [bbox.west, bbox.south, bbox.east, bbox.north] : undefined,
        data_source: 'assets/nagpur_known_flood_locations.geojson',
        data_confidence: 'estimated — area-level centroids from news-reported flood locations, not precise submergence points',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve flood locations',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

export default router;
