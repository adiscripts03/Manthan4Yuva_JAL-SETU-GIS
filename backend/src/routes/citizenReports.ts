import { Router, Request, Response } from 'express';
import { getDB } from '../db/connection.js';
import { parseBbox, bboxToMongoFilter, validateCitizenReport } from '../utils/validation.js';

const router = Router();

/**
 * POST /api/citizen-reports
 * Submit a new flood report from a citizen.
 * 
 * Body:
 * {
 *   "location": { "type": "Point", "coordinates": [79.0882, 21.1458] },
 *   "estimated_depth": "ankle" | "knee" | "waist" | "above_waist",
 *   "description": "Water flooding near...",
 *   "photo_url": "optional URL"
 * }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const errors = validateCitizenReport(req.body);
    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid citizen report data',
          details: errors.join('; '),
        },
      });
      return;
    }

    const db = getDB();
    const now = new Date();

    const report = {
      location: req.body.location,
      timestamp: req.body.timestamp ? new Date(req.body.timestamp) : now,
      estimated_depth: req.body.estimated_depth,
      description: req.body.description.trim(),
      photo_url: req.body.photo_url || undefined,
      status: 'pending' as const,
      created_at: now,
    };

    const result = await db.collection('citizen_reports').insertOne(report);

    res.status(201).json({
      success: true,
      data: {
        _id: result.insertedId,
        ...report,
      },
      meta: {
        message: 'Citizen report submitted successfully',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to submit citizen report',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

/**
 * GET /api/citizen-reports?bbox=west,south,east,north&status=pending|verified|resolved
 * Retrieve citizen flood reports with optional filtering.
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
      Object.assign(filter, bboxToMongoFilter(bbox, 'location'));
    }

    // Status filtering
    const status = req.query.status as string;
    const validStatuses = ['pending', 'verified', 'resolved'];
    if (status) {
      if (!validStatuses.includes(status)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
          },
        });
        return;
      }
      filter.status = status;
    }

    // Limit
    let limit = 100;
    if (req.query.limit !== undefined) {
      const limitValue = req.query.limit as string;
      const parsedLimit = Number(limitValue);
      if (!Number.isInteger(parsedLimit) || parsedLimit < 1) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_LIMIT',
            message: 'limit must be a positive integer',
          },
        });
        return;
      }
      limit = Math.min(parsedLimit, 500);
    }

    const reports = await db.collection('citizen_reports')
      .find(filter)
      .sort({ created_at: -1 })
      .limit(limit)
      .toArray();

    const total = await db.collection('citizen_reports').countDocuments(filter);

    res.json({
      success: true,
      data: reports,
      meta: {
        total,
        returned: reports.length,
        limit,
        bbox: bbox ? [bbox.west, bbox.south, bbox.east, bbox.north] : undefined,
        status_filter: status || undefined,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve citizen reports',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

export default router;
