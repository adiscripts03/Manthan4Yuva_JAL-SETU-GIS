import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { config } from '../config/index.js';
import { getDB } from '../db/connection.js';

const router = Router();

/**
 * GET /api/data-sources
 * Returns source provenance for ingested and candidate external datasets.
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const db = getDB();
    let sources = await db.collection('data_sources')
      .find({}, { projection: { _id: 0, _data_source: 0, _index: 0 } })
      .sort({ status: 1, name: 1 })
      .toArray();

    if (sources.length === 0) {
      const filePath = path.join(config.assetsPath, 'data_sources.json');
      sources = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }

    res.json({
      success: true,
      data: sources,
      meta: {
        total: sources.length,
        ingested: sources.filter(source => source.status === 'ingested').length,
        credentials_required: sources.filter(source => source.status === 'credentials_required').length,
        candidate_sources: sources.filter(source => source.status === 'candidate_source').length,
        data_source: 'assets/data_sources.json',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve data sources',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

export default router;
