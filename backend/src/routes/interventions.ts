import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../db/connection.js';
import { validateIntervention } from '../utils/validation.js';
import { recordProof } from '../services/blockchain.js';

const router = Router();

/**
 * POST /api/interventions
 * Create a new intervention/work order record.
 * Collection starts empty — ready for real data.
 * 
 * Body:
 * {
 *   "work_order_id": "WO-2026-001",
 *   "type": "desilting" | "repair" | "widening" | "other",
 *   "description": "Desilting of Chambhar Nallah near Ring Road bridge",
 *   "status": "planned" | "in_progress" | "completed",
 *   "waterway_osm_id": "way/123456" (optional),
 *   "cost_estimate": 50000 (optional),
 *   "before_photo_url": "..." (optional),
 *   "after_photo_url": "..." (optional)
 * }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const errors = validateIntervention(req.body);
    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid intervention data',
          details: errors.join('; '),
        },
      });
      return;
    }

    const db = getDB();
    const now = new Date();

    // Check for duplicate work_order_id
    const existing = await db.collection('interventions').findOne({
      work_order_id: req.body.work_order_id,
    });
    if (existing) {
      res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE',
          message: `Intervention with work_order_id "${req.body.work_order_id}" already exists`,
        },
      });
      return;
    }

    const intervention = {
      work_order_id: req.body.work_order_id,
      waterway_osm_id: req.body.waterway_osm_id || undefined,
      type: req.body.type,
      description: req.body.description.trim(),
      status: req.body.status,
      cost_estimate: req.body.cost_estimate || undefined,
      before_photo_url: req.body.before_photo_url || undefined,
      after_photo_url: req.body.after_photo_url || undefined,
      created_at: now,
      updated_at: now,
    };

    const result = await db.collection('interventions').insertOne(intervention);
    const recordId = result.insertedId.toString();

    const proofResult = await recordProof('intervention', recordId, {
      work_order_id: intervention.work_order_id,
      waterway_osm_id: intervention.waterway_osm_id,
      type: intervention.type,
      description: intervention.description,
      cost_estimate: intervention.cost_estimate,
    });

    const blockchain = proofResult.success
      ? {
          status: 'confirmed' as const,
          tx_hash: proofResult.txHash,
          data_hash: proofResult.dataHash,
          explorer_url: proofResult.explorerUrl,
        }
      : {
          status: 'unavailable' as const,
          error: proofResult.error,
        };

    if (proofResult.success) {
      await db.collection('interventions').updateOne(
        { _id: result.insertedId },
        { $set: { blockchain } }
      );
    }

    res.status(201).json({
      success: true,
      data: {
        _id: result.insertedId,
        ...intervention,
        blockchain,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create intervention',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

/**
 * GET /api/interventions?status=planned|in_progress|completed
 * Retrieve interventions with optional status filtering.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const filter: Record<string, unknown> = {};

    const status = req.query.status as string;
    const validStatuses = ['planned', 'in_progress', 'completed'];
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

    const interventions = await db.collection('interventions')
      .find(filter)
      .sort({ updated_at: -1 })
      .toArray();

    res.json({
      success: true,
      data: interventions,
      meta: {
        total: interventions.length,
        status_filter: status || undefined,
        note: 'Collection starts empty. Populate with real intervention/work-order data.',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve interventions',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

/**
 * GET /api/interventions/:id
 * Get a single intervention by MongoDB _id.
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    let objectId: ObjectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid intervention ID format',
        },
      });
      return;
    }

    const db = getDB();
    const intervention = await db.collection('interventions').findOne({ _id: objectId });

    if (!intervention) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Intervention with ID "${id}" not found`,
        },
      });
      return;
    }

    res.json({
      success: true,
      data: intervention,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve intervention',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

/**
 * PATCH /api/interventions/:id
 * Update an existing intervention (e.g., change status, add photos).
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    let objectId: ObjectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid intervention ID format',
        },
      });
      return;
    }

    const db = getDB();

    // Only allow updating specific fields
    const allowedFields = [
      'status', 'description', 'cost_estimate',
      'before_photo_url', 'after_photo_url',
    ];
    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'NO_UPDATES',
          message: `No valid fields to update. Allowed: ${allowedFields.join(', ')}`,
        },
      });
      return;
    }

    // Validate status if provided
    if (updates.status) {
      const validStatuses = ['planned', 'in_progress', 'completed'];
      if (!validStatuses.includes(updates.status as string)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
          },
        });
        return;
      }
    }

    updates.updated_at = new Date();

    const result = await db.collection('interventions').findOneAndUpdate(
      { _id: objectId },
      { $set: updates },
      { returnDocument: 'after' }
    );

    if (!result) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Intervention with ID "${id}" not found`,
        },
      });
      return;
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update intervention',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

export default router;
