import { Router, Request, Response } from 'express';
import { getDB } from '../db/connection.js';
import { recordProof } from '../services/blockchain.js';

const router = Router();

/**
 * POST /api/analysis-reports
 * Save a generated analysis report and record its hash on the blockchain.
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const now = new Date();

    const reportData = {
      ...req.body,
      created_at: now,
      updated_at: now,
    };

    const result = await db.collection('analysis_reports').insertOne(reportData);
    const recordId = result.insertedId.toString();

    // The stable fields must exactly match what will be used for verification
    const proofResult = await recordProof('analysis-reports', recordId, {
      ward: reportData.ward,
      startDate: reportData.startDate,
      endDate: reportData.endDate,
      rainfall: reportData.rainfall,
      drain_coverage: reportData.drain_coverage,
      events: reportData.events,
      hotspots: reportData.hotspots,
      waterways: reportData.waterways,
      coverage: reportData.coverage,
      flood_affected_locations: reportData.flood_affected_locations,
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
      await db.collection('analysis_reports').updateOne(
        { _id: result.insertedId },
        { $set: { blockchain } }
      );
    }

    res.status(201).json({
      success: true,
      data: {
        _id: result.insertedId,
        ...reportData,
        blockchain,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create analysis report',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

/**
 * GET /api/analysis-reports
 * Retrieve all saved analysis reports.
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const db = getDB();
    const reports = await db.collection('analysis_reports')
      .find({})
      .sort({ created_at: -1 })
      .toArray();

    res.json({
      success: true,
      data: reports,
      meta: {
        total: reports.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve analysis reports',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

export default router;
