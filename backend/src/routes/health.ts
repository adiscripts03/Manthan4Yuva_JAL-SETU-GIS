import { Router, Request, Response } from 'express';
import { getDB } from '../db/connection.js';

const router = Router();

/**
 * GET /api/health
 * Returns backend status and database connection health.
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const db = getDB();
    await db.command({ ping: 1 });

    // Get collection counts for status reporting
    const collections = await db.listCollections().toArray();
    const collectionCounts: Record<string, number> = {};
    for (const col of collections) {
      collectionCounts[col.name] = await db.collection(col.name).countDocuments();
    }

    res.json({
      success: true,
      data: {
        status: 'healthy',
        database: 'connected',
        uptime_seconds: Math.floor(process.uptime()),
        collections: collectionCounts,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Backend is running but database is unreachable',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

export default router;
