import { Router, Request, Response } from 'express';
import { getDB } from '../db/connection.js';
import { parseBbox, bboxToMongoFilter } from '../utils/validation.js';

const router = Router();

/**
 * GET /api/waterways?bbox=west,south,east,north&type=drain|stream|river|canal
 * Returns waterway features filtered by bounding box and/or type.
 * Data source: assets/nagpur_drainage.geojson (OSM Overpass API export)
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
          message: 'Invalid bbox format. Expected: west,south,east,north (decimal degrees)',
          details: 'Example: ?bbox=79.05,21.10,79.15,21.20',
        },
      });
      return;
    }

    if (bbox) {
      Object.assign(filter, bboxToMongoFilter(bbox));
    }

    // Type filtering
    const waterwayType = req.query.type as string;
    const validTypes = ['river', 'stream', 'drain', 'canal'];
    if (waterwayType) {
      if (!validTypes.includes(waterwayType)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TYPE',
            message: `Invalid waterway type. Must be one of: ${validTypes.join(', ')}`,
          },
        });
        return;
      }
      filter.waterway = waterwayType;
    }

    const waterways = await db.collection('waterways')
      .find(filter, { projection: { _data_source: 0, _data_confidence: 0 } })
      .toArray();

    res.json({
      success: true,
      data: waterways,
      meta: {
        total: waterways.length,
        bbox: bbox ? [bbox.west, bbox.south, bbox.east, bbox.north] : undefined,
        type_filter: waterwayType || undefined,
        data_source: 'OpenStreetMap waterways via Overpass Turbo export',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve waterways',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

/**
 * GET /api/waterways/stats
 * Returns waterway count by type.
 */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const db = getDB();
    const stats = await db.collection('waterways').aggregate([
      { $group: { _id: '$waterway', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]).toArray();

    const total = stats.reduce((sum, s) => sum + s.count, 0);

    res.json({
      success: true,
      data: {
        total,
        by_type: Object.fromEntries(stats.map(s => [s._id, s.count])),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve waterway stats',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

/**
 * GET /api/waterways/:osmId
 * Returns a single waterway by its OSM ID.
 */
router.get('/:osmId', async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const waterway = await db.collection('waterways').findOne(
      { osm_id: req.params.osmId },
      { projection: { _data_source: 0, _data_confidence: 0 } }
    );

    if (!waterway) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Waterway with OSM ID "${req.params.osmId}" not found`,
        },
      });
      return;
    }

    res.json({
      success: true,
      data: waterway,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve waterway',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

export default router;
