import express from 'express';
import cors from 'cors';
import { config, validateConfig } from './config/index.js';
import { connectDB, createIndexes, closeDB } from './db/connection.js';
import { seedDatabase } from './data/seed.js';

// Route imports
import healthRouter from './routes/health.js';
import cityRouter from './routes/city.js';
import waterwaysRouter from './routes/waterways.js';
import floodEventsRouter from './routes/floodEvents.js';
import floodLocationsRouter from './routes/floodLocations.js';
import riskModelRouter from './routes/riskModel.js';
import nullahsRouter from './routes/nullahs.js';
import wardsRouter from './routes/wards.js';
import governmentResponseRouter from './routes/governmentResponse.js';
import citizenReportsRouter from './routes/citizenReports.js';
import interventionsRouter from './routes/interventions.js';
import analyticsRouter from './routes/analytics.js';
import dataSourcesRouter from './routes/dataSources.js';
import aiRouter from './routes/ai.js';
import blockchainRouter from './routes/blockchain.js';

const app = express();

// ── Middleware ────────────────────────────────────────────
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || /^http:\/\/localhost:\d+$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Return client errors for malformed JSON instead of falling through as 500s.
app.use((err: Error, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      success: false,
      error: {
        code: 'BAD_JSON',
        message: 'Malformed JSON request body',
      },
    });
    return;
  }

  next(err);
});

// Request logging (simple, no external dependency)
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── Routes ───────────────────────────────────────────────
app.use('/api/health', healthRouter);
app.use('/api/city', cityRouter);
app.use('/api/waterways', waterwaysRouter);
app.use('/api/flood-events', floodEventsRouter);
app.use('/api/flood-locations', floodLocationsRouter);
app.use('/api/risk-model', riskModelRouter);
app.use('/api/nullahs', nullahsRouter);
app.use('/api/wards', wardsRouter);
app.use('/api/government-response', governmentResponseRouter);
app.use('/api/citizen-reports', citizenReportsRouter);
app.use('/api/interventions', interventionsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/data-sources', dataSourcesRouter);
app.use('/api/ai', aiRouter);
app.use('/api/blockchain', blockchainRouter);

// ── API index ────────────────────────────────────────────
app.get('/api', (_req, res) => {
  res.json({
    name: 'Jal Setu Nagpur — Backend API',
    version: '1.0.0',
    description: 'GIS-based urban flood intelligence platform for Nagpur',
    endpoints: {
      health: 'GET /api/health',
      city: 'GET /api/city',
      waterways: 'GET /api/waterways?bbox=&type=',
      'waterways/:osmId': 'GET /api/waterways/:osmId',
      'waterways/stats': 'GET /api/waterways/stats',
      flood_events: 'GET /api/flood-events',
      'flood_events/:index': 'GET /api/flood-events/:index',
      flood_locations: 'GET /api/flood-locations?bbox=&category=',
      risk_model: 'GET /api/risk-model',
      'risk_model/susceptibility': 'GET /api/risk-model/susceptibility',
      'risk_model/score': 'GET /api/risk-model/score?lat=&lng=',
      nullahs: 'GET /api/nullahs',
      wards: 'GET /api/wards',
      government_response: 'GET /api/government-response',
      citizen_reports: 'GET /api/citizen-reports?bbox=&status=',
      'citizen_reports/submit': 'POST /api/citizen-reports',
      interventions: 'GET /api/interventions?status=',
      'interventions/create': 'POST /api/interventions',
      'interventions/:id': 'GET /api/interventions/:id',
      'interventions/update': 'PATCH /api/interventions/:id',
      analytics_summary: 'GET /api/analytics/summary',
      data_sources: 'GET /api/data-sources',
      ai_agent: 'POST /api/ai/agent',
      blockchain_status: 'GET /api/blockchain/status',
      blockchain_verify: 'GET /api/blockchain/verify/:collection/:id',
    },
  });
});

// ── 404 handler ──────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found. Visit GET /api for available endpoints.',
    },
  });
});

// ── Global error handler ─────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    },
  });
});

// ── Startup ──────────────────────────────────────────────
async function start() {
  try {
    // Validate configuration
    validateConfig();

    // Connect to MongoDB
    const db = await connectDB();

    // Seed database from asset files (idempotent)
    const shouldSeed = process.argv.includes('--seed') ||
      process.env.AUTO_SEED === 'true';

    if (shouldSeed) {
      await seedDatabase(db);
    }

    // Create indexes (idempotent)
    await createIndexes(db);

    // Start server
    app.listen(config.port, () => {
      console.log(`\n${'═'.repeat(50)}`);
      console.log(`  Jal Setu Backend — Running`);
      console.log(`  Port: ${config.port}`);
      console.log(`  API:  http://localhost:${config.port}/api`);
      console.log(`  CORS: ${config.corsOrigins.join(', ')}`);
      console.log(`${'═'.repeat(50)}\n`);
    });
  } catch (error) {
    console.error('[FATAL]', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[Shutdown] Received SIGINT, closing connections...');
  await closeDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[Shutdown] Received SIGTERM, closing connections...');
  await closeDB();
  process.exit(0);
});

start();
