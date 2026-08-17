import { Router, Request, Response } from 'express';
import { getDB } from '../db/connection.js';
import { validateLatLng } from '../utils/validation.js';
import { computeRiskScore } from '../services/riskCalculator.js';

const router = Router();

/**
 * GET /api/risk-model
 * Returns the full VNIT Frequency Ratio model parameter tables.
 * Data source: assets/nagpur_flood_data.json → vnit_frequency_ratio_model
 * 
 * This is the core analytical data — the only peer-reviewed, Nagpur-specific
 * flood model with published parameter weights.
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const db = getDB();
    const model = await db.collection('risk_model').findOne(
      {},
      { projection: { _id: 0, _data_source: 0 } }
    );

    if (!model) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Risk model data not found. Database may not be seeded.',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: model,
      meta: {
        data_source: 'Gaurkhede & Adane (2023), VNIT Nagpur — Frequency Ratio flood susceptibility model',
        paper_url: 'https://aloki.hu/pdf/2103_23412361.pdf',
        model_accuracy: `${model.model_accuracy_pct}%`,
        validation_accuracy: `${model.validation_accuracy_pct}%`,
        parameters: [
          'altitude_m', 'slope_deg', 'twi', 'lulc', 'soil_texture',
          'rainfall_mm', 'surface_runoff_by_land_use', 'distance_from_river_m',
          'lithology', 'landform',
        ],
        note: 'Higher FR values indicate stronger correlation with historical flooding. Use as weights in risk scoring.',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve risk model',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

/**
 * GET /api/risk-model/susceptibility
 * Returns flood susceptibility class area breakdown.
 * Data source: assets/nagpur_flood_data.json → flood_susceptibility_class_areas
 */
router.get('/susceptibility', async (_req: Request, res: Response) => {
  try {
    const db = getDB();
    const classes = await db.collection('susceptibility_classes')
      .find({}, { projection: { _id: 0, _data_source: 0, _index: 0 } })
      .sort({ _index: 1 })
      .toArray();

    res.json({
      success: true,
      data: classes,
      meta: {
        total_classes: classes.length,
        data_source: 'Gaurkhede & Adane (2023) — flood susceptibility classification for Nagpur',
        note: 'Area percentages only. Polygon geometry for these zones is not available in the supplied assets.',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve susceptibility classes',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

/**
 * GET /api/risk-score?lat=21.1458&lng=79.0882
 * Computes a flood risk score for a given coordinate using the FR model.
 * 
 * Returns the score, contributing factors with FR weights, nearest flood
 * location, nearest waterway, and documented data limitations.
 */
router.get('/score', async (req: Request, res: Response) => {
  try {
    const coords = validateLatLng(req.query.lat, req.query.lng);
    if (!coords) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_COORDINATES',
          message: 'Valid lat and lng query parameters are required',
          details: 'Example: ?lat=21.1458&lng=79.0882',
        },
      });
      return;
    }

    const db = getDB();
    const result = await computeRiskScore(db, coords.lat, coords.lng);

    res.json({
      success: true,
      data: result,
      meta: {
        method: 'VNIT Nagpur Frequency Ratio model (partial — limited by available data)',
        note: 'See data_limitations array for parameters that could not be computed without additional raster data',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to compute risk score',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

export default router;
