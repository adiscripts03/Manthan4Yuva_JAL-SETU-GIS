import { ObjectId } from 'mongodb';

// ──────────────────────────────────────────────────
// GeoJSON geometry types used across collections
// ──────────────────────────────────────────────────

export interface GeoJSONPoint {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
}

export interface GeoJSONLineString {
  type: 'LineString';
  coordinates: [number, number][];
}

export interface GeoJSONMultiLineString {
  type: 'MultiLineString';
  coordinates: [number, number][][];
}

export type WaterwayGeometry = GeoJSONLineString | GeoJSONMultiLineString;

// ──────────────────────────────────────────────────
// City Metadata (from nagpur_flood_data.json)
// ──────────────────────────────────────────────────

export interface CityMetadata {
  _id?: ObjectId;
  name: string;
  center_lat: number;
  center_lng: number;
  municipal_area_km2: number;
  elevation_avg_m: number;
  population_density_per_km2: number;
  annual_avg_rainfall_mm: number;
  built_up_pct: number;
  built_up_pct_decade_ago: number;
  soil_clayey_pct: number;
  soil_clay_loam_pct: number;
  drainage_sewage_infra_coverage_pct: number;
  rivers: string[];
}

// ──────────────────────────────────────────────────
// Historical Flood Events
// ──────────────────────────────────────────────────

export interface FloodEvent {
  _id?: ObjectId;
  date: string;
  rainfall_mm?: string | number;
  rainfall_mm_5day_max?: number;
  duration?: string;
  deaths?: number;
  evacuated?: string;
  houses_affected?: number;
  areas_affected?: string[];
  cause?: string;
  cause_per_press?: string;
  impact?: string;
  relief_announced?: string;
  accountability_angle?: string;
  note?: string;
  sources?: string[];
}

// ──────────────────────────────────────────────────
// Government Response
// ──────────────────────────────────────────────────

export interface GovernmentResponse {
  _id?: ObjectId;
  integrated_drainage_plan_approved_nov_2023_crore: number;
  additional_sanctioned_feb_2024_crore: number;
  sanctioned_for: string;
  released_as_of_sept_2025_crore: number;
  pumping_stations_operational: string;
  status: string;
}

// ──────────────────────────────────────────────────
// Named Nullahs / Water Channels
// ──────────────────────────────────────────────────

export interface Nullah {
  _id?: ObjectId;
  name: string;
  referenced_near: string;
}

// ──────────────────────────────────────────────────
// Waterways (from nagpur_drainage.geojson / OSM)
// ──────────────────────────────────────────────────

export interface Waterway {
  _id?: ObjectId;
  osm_id: string;         // @id from OSM
  name?: string;
  waterway: string;        // river | stream | drain | canal
  geometry: WaterwayGeometry;
  name_mr?: string;        // Marathi name
  name_ar?: string;        // Arabic name
  name_ur?: string;        // Urdu name
  width?: string;
  intermittent?: string;
  tunnel?: string;
  source?: string;
}

// ──────────────────────────────────────────────────
// Known Flood Locations (from nagpur_known_flood_locations.geojson)
// ──────────────────────────────────────────────────

export interface FloodLocation {
  _id?: ObjectId;
  name: string;
  category: string;       // flood_affected_area | named_nullah_reference
  source_event?: string;
  data_confidence: string; // "estimated"
  note?: string;
  geometry: GeoJSONPoint;
}

// ──────────────────────────────────────────────────
// VNIT Frequency Ratio Model
// ──────────────────────────────────────────────────

export interface FREntry {
  range?: string;
  class?: string;
  type?: string;
  area_pct: number;
  flood_points: number;
  FR: number;
  infiltration?: string;
  depth_m?: string;
}

export interface FrequencyRatioModel {
  _id?: ObjectId;
  model_accuracy_pct: number;
  validation_accuracy_pct: number;
  historical_flood_points_used: {
    total: number;
    training: number;
    validation: number;
  };
  altitude_m: FREntry[];
  slope_deg: FREntry[];
  twi: FREntry[];
  lulc: FREntry[];
  soil_texture: FREntry[];
  rainfall_mm: FREntry[];
  surface_runoff_by_land_use: FREntry[];
  distance_from_river_m: FREntry[];
  lithology: FREntry[];
  landform: FREntry[];
}

export interface SusceptibilityClass {
  _id?: ObjectId;
  class: string;
  area_ha: number;
  area_pct: number;
}

// ──────────────────────────────────────────────────
// Citizen Reports (user-generated)
// ──────────────────────────────────────────────────

export interface CitizenReport {
  _id?: ObjectId;
  location: GeoJSONPoint;
  timestamp: Date;
  estimated_depth: 'ankle' | 'knee' | 'waist' | 'above_waist';
  description: string;
  photo_url?: string;
  status: 'pending' | 'verified' | 'resolved';
  created_at: Date;
}

// ──────────────────────────────────────────────────
// Interventions (CRUD-ready, initially empty)
// ──────────────────────────────────────────────────

export interface Intervention {
  _id?: ObjectId;
  drain_id?: string;
  waterway_osm_id?: string;
  work_order_id: string;
  type: 'desilting' | 'repair' | 'widening' | 'other';
  description: string;
  status: 'planned' | 'in_progress' | 'completed';
  cost_estimate?: number;
  before_photo_url?: string;
  after_photo_url?: string;
  created_at: Date;
  updated_at: Date;
}

// ──────────────────────────────────────────────────
// API Response types
// ──────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    total?: number;
    filtered?: number;
    bbox?: number[];
    data_source?: string;
    data_confidence?: string;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: string;
  };
}

export interface BboxQuery {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface RiskScoreResult {
  lat: number;
  lng: number;
  overall_score: number;
  max_possible_score: number;
  normalized_score: number;   // 0-100
  factors: RiskFactor[];
  nearest_flood_location?: {
    name: string;
    distance_km: number;
  };
  nearest_waterway?: {
    name?: string;
    type: string;
    distance_km: number;
  };
  data_limitations: string[];
}

export interface RiskFactor {
  parameter: string;
  value_range: string;
  fr_value: number;
  max_fr: number;
  interpretation: string;
}
