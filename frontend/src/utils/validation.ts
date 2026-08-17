import type { BboxQuery } from '../types/index.js';

/**
 * Parses a bbox query string into a structured object.
 * Expected format: "west,south,east,north" (all in decimal degrees)
 * 
 * Example: "79.05,21.10,79.15,21.20"
 */
export function parseBbox(bboxStr: string | undefined): BboxQuery | null {
  if (!bboxStr || typeof bboxStr !== 'string') return null;

  const parts = bboxStr.split(',').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return null;

  const [west, south, east, north] = parts;

  // Validate coordinate ranges
  if (west < -180 || west > 180) return null;
  if (east < -180 || east > 180) return null;
  if (south < -90 || south > 90) return null;
  if (north < -90 || north > 90) return null;
  if (west > east) return null;
  if (south > north) return null;

  return { west, south, east, north };
}

/**
 * Converts a BboxQuery into a MongoDB $geoWithin/$box query filter.
 */
export function bboxToMongoFilter(bbox: BboxQuery, geometryField: string = 'geometry') {
  return {
    [geometryField]: {
      $geoWithin: {
        $geometry: {
          type: 'Polygon',
          coordinates: [[
            [bbox.west, bbox.south],
            [bbox.east, bbox.south],
            [bbox.east, bbox.north],
            [bbox.west, bbox.north],
            [bbox.west, bbox.south],
          ]],
        },
      },
    },
  };
}

/**
 * Validates that lat/lng values are within valid ranges.
 */
export function validateLatLng(lat: unknown, lng: unknown): { lat: number; lng: number } | null {
  const latNum = Number(lat);
  const lngNum = Number(lng);

  if (isNaN(latNum) || isNaN(lngNum)) return null;
  if (latNum < -90 || latNum > 90) return null;
  if (lngNum < -180 || lngNum > 180) return null;

  return { lat: latNum, lng: lngNum };
}

/**
 * Validates a citizen report submission body.
 * Returns an array of error messages (empty if valid).
 */
export function validateCitizenReport(body: Record<string, unknown>): string[] {
  const errors: string[] = [];

  // Location
  if (!body.location || typeof body.location !== 'object') {
    errors.push('location is required and must be an object with type and coordinates');
  } else {
    const loc = body.location as Record<string, unknown>;
    if (loc.type !== 'Point') {
      errors.push('location.type must be "Point"');
    }
    if (!Array.isArray(loc.coordinates) || loc.coordinates.length !== 2) {
      errors.push('location.coordinates must be an array of [lng, lat]');
    } else {
      const [lng, lat] = loc.coordinates as number[];
      if (typeof lng !== 'number' || typeof lat !== 'number') {
        errors.push('location.coordinates must contain numeric values');
      } else if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
        errors.push('location.coordinates are out of valid range');
      }
    }
  }

  // Estimated depth
  const validDepths = ['ankle', 'knee', 'waist', 'above_waist'];
  if (!body.estimated_depth || !validDepths.includes(body.estimated_depth as string)) {
    errors.push(`estimated_depth is required and must be one of: ${validDepths.join(', ')}`);
  }

  // Description
  if (!body.description || typeof body.description !== 'string' || (body.description as string).trim().length === 0) {
    errors.push('description is required and must be a non-empty string');
  }

  return errors;
}

/**
 * Validates an intervention submission body.
 * Returns an array of error messages (empty if valid).
 */
export function validateIntervention(body: Record<string, unknown>): string[] {
  const errors: string[] = [];

  if (!body.work_order_id || typeof body.work_order_id !== 'string') {
    errors.push('work_order_id is required and must be a string');
  }

  const validTypes = ['desilting', 'repair', 'widening', 'other'];
  if (!body.type || !validTypes.includes(body.type as string)) {
    errors.push(`type is required and must be one of: ${validTypes.join(', ')}`);
  }

  if (!body.description || typeof body.description !== 'string') {
    errors.push('description is required and must be a string');
  }

  const validStatuses = ['planned', 'in_progress', 'completed'];
  if (!body.status || !validStatuses.includes(body.status as string)) {
    errors.push(`status is required and must be one of: ${validStatuses.join(', ')}`);
  }

  return errors;
}
