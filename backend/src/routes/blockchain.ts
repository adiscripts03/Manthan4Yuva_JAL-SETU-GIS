import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb'; // swap for the project's actual ID type if not MongoDB
import { getDB } from '../db/connection.js'; // adjust import to match project
import {
  isEnabled,
  verifyProof,
  getTotalProofs,
  getExplorerBaseUrl,
  getContractAddress,
} from '../services/blockchain.js';

const router = Router();

// Maps the URL-friendly collection name to the DB collection + the
// exact field subset that was hashed when the proof was written. These
// entries MUST mirror the fields used in the create-handlers in Step 3,
// or verification will always report a mismatch. Add one entry per
// record type you're proving (citizen reports, interventions, etc).
const COLLECTIONS: Record<string, { name: string; fields: (doc: any) => Record<string, unknown> }> = {
  'citizen-reports': {
    name: 'citizen_reports',
    fields: (doc) => ({
      location: doc.location,
      timestamp: doc.timestamp,
      estimated_depth: doc.estimated_depth,
      description: doc.description,
      photo_url: doc.photo_url,
    }),
  },
    interventions: {
    name: 'interventions',
    fields: (doc) => ({
      work_order_id: doc.work_order_id,
      waterway_osm_id: doc.waterway_osm_id,
      type: doc.type,
      description: doc.description,
      cost_estimate: doc.cost_estimate,
    }),
  },
  'analysis-reports': {
    name: 'analysis_reports',
    fields: (doc) => ({
      ward: doc.ward,
      startDate: doc.startDate,
      endDate: doc.endDate,
      rainfall: doc.rainfall,
      drain_coverage: doc.drain_coverage,
      events: doc.events,
      hotspots: doc.hotspots,
      waterways: doc.waterways,
      coverage: doc.coverage,
      flood_affected_locations: doc.flood_affected_locations,
    }),
  },
};

/**
 * GET /api/blockchain/status
 * Whether blockchain proof is configured, plus headline numbers for
 * the Civic Proof Ledger summary panel.
 */
router.get('/status', async (_req: Request, res: Response) => {
  const total = await getTotalProofs();
  res.json({
    success: true,
    data: {
      enabled: isEnabled(),
      contract_address: getContractAddress() || null,
      explorer_base_url: getExplorerBaseUrl(),
      total_proofs_on_chain: total,
    },
  });
});

/**
 * GET /api/blockchain/verify/:collection/:id
 * Re-hashes the current record data and compares it against what's
 * stored on-chain for that record.
 */
router.get('/verify/:collection/:id', async (req: Request, res: Response) => {
  try {
    const collectionKey = String(req.params.collection);
    const config = COLLECTIONS[collectionKey];
    if (!config) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_COLLECTION', message: `collection must be one of: ${Object.keys(COLLECTIONS).join(', ')}` },
      });
      return;
    }

    const idParam = String(req.params.id);
    let objectId: ObjectId;
    try {
      objectId = new ObjectId(idParam);
    } catch {
      res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid record ID format' } });
      return;
    }

    const db = getDB();
    const doc = await db.collection(config.name).findOne({ _id: objectId });
    if (!doc) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Record not found' } });
      return;
    }

    const result = await verifyProof(idParam, config.fields(doc));
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to verify proof', details: error instanceof Error ? error.message : String(error) },
    });
  }
});

export default router;
