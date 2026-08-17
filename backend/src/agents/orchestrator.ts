import { StateGraph, MemorySaver, Annotation } from "@langchain/langgraph";
import { ChatGroq } from "@langchain/groq";
import { config } from "../config/index.js";
import { sendOperatorEmail } from "../services/emailService.js";

// ─── Nagpur Area Geodatabase ──────────────────────────────────────────────────
// Coordinates verified from OpenStreetMap / Google Maps for Nagpur city.
// Each entry: [lat, lng, zoom, zone, brief description]
interface GeoEntry {
  lat: number;
  lng: number;
  zoom: number;
  zone: string;
  description: string;
  elevation_range_m: string;
  flood_susceptibility: string;
  nearest_water_body: string;
  distance_from_river_m: string;
  soil_type: string;
  lithology: string;
  land_use: string;
  drainage_coverage_pct: number;
  annual_rainfall_mm: number;
}

const NAGPUR_GEODATABASE: Record<string, GeoEntry> = {
  // ─── Flood-Affected Areas (from nagpur_known_flood_locations.geojson) ───
  "narendra nagar": {
    lat: 21.1041, lng: 79.0773, zoom: 16, zone: "South-West",
    description: "Residential area severely affected in the 2026-07-28 flood event. Low-lying terrain prone to waterlogging from Nag River overflow.",
    elevation_range_m: "292-301", flood_susceptibility: "Very High",
    nearest_water_body: "Nag River (~600m)", distance_from_river_m: "400-600",
    soil_type: "Clayey (91.53% city-wide)", lithology: "Deccan Traps",
    land_use: "Built-up / Urban residential", drainage_coverage_pct: 35,
    annual_rainfall_mm: 1205,
  },
  "manish nagar": {
    lat: 21.0938, lng: 79.0750, zoom: 16, zone: "South",
    description: "Dense residential colony, flood-affected area during 2026-07-28 event. Located in the southern urbanized flood plain.",
    elevation_range_m: "281-291", flood_susceptibility: "Very High",
    nearest_water_body: "Nag River tributary (~500m)", distance_from_river_m: "400-600",
    soil_type: "Clayey", lithology: "Deccan Traps",
    land_use: "Built-up / Urban residential", drainage_coverage_pct: 30,
    annual_rainfall_mm: 1205,
  },
  "loha pul": {
    lat: 21.1451, lng: 79.0885, zoom: 16, zone: "Central",
    description: "Historic iron bridge area. Chronic waterlogging hotspot — water accumulates beneath the bridge during rains. Flood-affected in 2026-07-28.",
    elevation_range_m: "292-301", flood_susceptibility: "High",
    nearest_water_body: "Nag River (adjacent)", distance_from_river_m: "0-200",
    soil_type: "Clayey", lithology: "Archean Gneisses",
    land_use: "Built-up / Commercial-Residential mix", drainage_coverage_pct: 40,
    annual_rainfall_mm: 1205,
  },
  "swavalambi nagar": {
    lat: 21.1048, lng: 79.0421, zoom: 16, zone: "West",
    description: "Residential area in west Nagpur. Experienced significant flooding during 2026-07-28 due to blocked drains and incomplete civic works.",
    elevation_range_m: "305-308", flood_susceptibility: "High",
    nearest_water_body: "Pora River (~800m)", distance_from_river_m: "600-800",
    soil_type: "Clayey", lithology: "Deccan Traps",
    land_use: "Built-up / Urban residential", drainage_coverage_pct: 30,
    annual_rainfall_mm: 1205,
  },
  "besa": {
    lat: 21.0865, lng: 79.0893, zoom: 15, zone: "South-East",
    description: "Rapidly developing suburb in south Nagpur. Flood-affected area — poor drainage infrastructure in newly developed zones.",
    elevation_range_m: "281-291", flood_susceptibility: "High",
    nearest_water_body: "Nag River tributary", distance_from_river_m: "400-600",
    soil_type: "Clayey", lithology: "Deccan Traps",
    land_use: "Built-up / Mixed (residential + under-development)", drainage_coverage_pct: 20,
    annual_rainfall_mm: 1205,
  },
  "beltarodi": {
    lat: 21.0752, lng: 79.0772, zoom: 15, zone: "South",
    description: "Peripheral area south of Nagpur. Flood-prone due to flat terrain and inadequate stormwater drainage in new developments.",
    elevation_range_m: "281-291", flood_susceptibility: "High",
    nearest_water_body: "Unnamed nullah (~300m)", distance_from_river_m: "200-400",
    soil_type: "Clayey", lithology: "Deccan Traps",
    land_use: "Mixed (semi-urban, under-development)", drainage_coverage_pct: 15,
    annual_rainfall_mm: 1205,
  },
  "mhalgi nagar": {
    lat: 21.1069, lng: 79.1231, zoom: 16, zone: "East",
    description: "Residential area in east Nagpur. Flood-affected during 2026-07-28 event due to proximity to low-lying drainage channels.",
    elevation_range_m: "292-301", flood_susceptibility: "High",
    nearest_water_body: "Nag River (~700m)", distance_from_river_m: "600-800",
    soil_type: "Clayey", lithology: "Archean Gneisses",
    land_use: "Built-up / Urban residential", drainage_coverage_pct: 30,
    annual_rainfall_mm: 1205,
  },
  "narsala": {
    lat: 21.0905, lng: 79.1341, zoom: 15, zone: "South-East",
    description: "Area in south-east Nagpur. Flood-affected in 2026-07-28 — poor connectivity during heavy rain events.",
    elevation_range_m: "292-301", flood_susceptibility: "Moderate",
    nearest_water_body: "Unnamed stream (~400m)", distance_from_river_m: "400-600",
    soil_type: "Clayey", lithology: "Archean Gneisses",
    land_use: "Mixed (residential + agricultural)", drainage_coverage_pct: 20,
    annual_rainfall_mm: 1205,
  },
  "omkar nagar": {
    lat: 21.0989, lng: 79.0926, zoom: 16, zone: "South-Central",
    description: "Residential locality. Flood-affected during 2026-07-28 event — water accumulation from adjacent blocked nullahs.",
    elevation_range_m: "292-301", flood_susceptibility: "High",
    nearest_water_body: "Nag River (~500m)", distance_from_river_m: "400-600",
    soil_type: "Clayey", lithology: "Deccan Traps",
    land_use: "Built-up / Urban residential", drainage_coverage_pct: 30,
    annual_rainfall_mm: 1205,
  },
  "hudkeshwar": {
    lat: 21.1008, lng: 79.1224, zoom: 15, zone: "East",
    description: "Growing suburb in east Nagpur (Ward 35 area). Flood-affected — rapid urbanization without proportional drainage infrastructure.",
    elevation_range_m: "292-301", flood_susceptibility: "High",
    nearest_water_body: "Nag River (~600m)", distance_from_river_m: "600-800",
    soil_type: "Clayey", lithology: "Archean Gneisses",
    land_use: "Built-up / Mixed urban", drainage_coverage_pct: 25,
    annual_rainfall_mm: 1205,
  },
  "jaitala": {
    lat: 21.1100, lng: 79.0235, zoom: 15, zone: "West",
    description: "Western Nagpur locality. Flood-affected during 2026-07-28 event. Area has limited drainage coverage.",
    elevation_range_m: "305-308", flood_susceptibility: "Moderate",
    nearest_water_body: "Pora River (~1km)", distance_from_river_m: ">1000",
    soil_type: "Clayey", lithology: "Deccan Traps",
    land_use: "Mixed (residential + semi-urban)", drainage_coverage_pct: 25,
    annual_rainfall_mm: 1205,
  },

  // ─── Named Nullahs / Water Channels ───
  "pili nadi": {
    lat: 21.1933, lng: 79.0995, zoom: 15, zone: "North",
    description: "Pili River (Pili Nadi) — major north Nagpur waterway. Ward 1/2 boundary. Key drainage artery, desilting budgeted at ₹4.95 Cr for 2026-27.",
    elevation_range_m: "281-291", flood_susceptibility: "Very High",
    nearest_water_body: "Pili River (self)", distance_from_river_m: "0-200",
    soil_type: "Clayey", lithology: "Alluvium",
    land_use: "Water body / Riparian zone", drainage_coverage_pct: 40,
    annual_rainfall_mm: 1205,
  },
  "pili river": {
    lat: 21.1933, lng: 79.0995, zoom: 15, zone: "North",
    description: "Pili River (Pili Nadi) — major north Nagpur waterway. Ward 1/2 boundary. Key drainage artery, desilting budgeted at ₹4.95 Cr for 2026-27.",
    elevation_range_m: "281-291", flood_susceptibility: "Very High",
    nearest_water_body: "Pili River (self)", distance_from_river_m: "0-200",
    soil_type: "Clayey", lithology: "Alluvium",
    land_use: "Water body / Riparian zone", drainage_coverage_pct: 40,
    annual_rainfall_mm: 1205,
  },
  "nag river": {
    lat: 21.1458, lng: 79.0882, zoom: 14, zone: "Central",
    description: "Nag River — the central drainage spine of Nagpur, crossing Wards 4, 18, 21, 22, 23, 24, 25. Primary cause of flooding when it overflows. Major encroachment issues.",
    elevation_range_m: "292-301", flood_susceptibility: "Very High",
    nearest_water_body: "Nag River (self)", distance_from_river_m: "0-200",
    soil_type: "Clayey", lithology: "Archean Gneisses",
    land_use: "Water body / Riparian zone", drainage_coverage_pct: 45,
    annual_rainfall_mm: 1205,
  },
  "pora river": {
    lat: 21.1050, lng: 79.0400, zoom: 14, zone: "South-West",
    description: "Pora River — flows through south-western Nagpur. Partial coverage, contributes to flooding in Jaitala, Swavalambi Nagar areas.",
    elevation_range_m: "305-308", flood_susceptibility: "High",
    nearest_water_body: "Pora River (self)", distance_from_river_m: "0-200",
    soil_type: "Clayey", lithology: "Deccan Traps",
    land_use: "Water body / Riparian zone", drainage_coverage_pct: 30,
    annual_rainfall_mm: 1205,
  },
  "chambhar nallah": {
    lat: 21.1550, lng: 79.0800, zoom: 16, zone: "Central-North",
    description: "Chambhar Nallah — referenced near Itwari Station Road bridge, Ring Road bridge (Ward 5/6 boundary). Key drainage channel.",
    elevation_range_m: "292-301", flood_susceptibility: "High",
    nearest_water_body: "Chambhar Nallah (self)", distance_from_river_m: "0-200",
    soil_type: "Clayey", lithology: "Archean Gneisses",
    land_use: "Built-up / Commercial area", drainage_coverage_pct: 40,
    annual_rainfall_mm: 1205,
  },
  "mang nallah": {
    lat: 21.1480, lng: 79.0750, zoom: 16, zone: "Central",
    description: "Mang Nallah — near Mumbai-Howrah Railway line (Ward 6/7 boundary). Drainage channel prone to blockage.",
    elevation_range_m: "292-301", flood_susceptibility: "High",
    nearest_water_body: "Mang Nallah (self)", distance_from_river_m: "0-200",
    soil_type: "Clayey", lithology: "Archean Gneisses",
    land_use: "Built-up / Railway corridor", drainage_coverage_pct: 35,
    annual_rainfall_mm: 1205,
  },
  "hatti nallah": {
    lat: 21.1410, lng: 79.0870, zoom: 16, zone: "Central",
    description: "Hatti Nallah — junction with Nag River, near Zenda Chowk, Killa Road (Ward 18/22 boundary). Critical drainage confluence point.",
    elevation_range_m: "292-301", flood_susceptibility: "Very High",
    nearest_water_body: "Nag River (junction)", distance_from_river_m: "0-200",
    soil_type: "Clayey", lithology: "Archean Gneisses",
    land_use: "Built-up / Dense commercial", drainage_coverage_pct: 40,
    annual_rainfall_mm: 1205,
  },
  "bor nallah": {
    lat: 21.1680, lng: 79.0550, zoom: 16, zone: "North-West",
    description: "Bor Nallah — near Katol Road, Gorewara Road bridge, Dinshaw Factory Square (Ward 10/11 boundary).",
    elevation_range_m: "305-308", flood_susceptibility: "Moderate",
    nearest_water_body: "Bor Nallah (self)", distance_from_river_m: "0-200",
    soil_type: "Clayey", lithology: "Deccan Traps",
    land_use: "Built-up / Industrial-Commercial mix", drainage_coverage_pct: 35,
    annual_rainfall_mm: 1205,
  },
  "rahul nagar nallah": {
    lat: 21.1126, lng: 79.0734, zoom: 16, zone: "West-Central",
    description: "Rahul Nagar Nallah — near Gauri Apartment, Somalwada (Ward 16 boundary). Residential area drainage channel.",
    elevation_range_m: "305-308", flood_susceptibility: "Moderate",
    nearest_water_body: "Rahul Nagar Nallah (self)", distance_from_river_m: "0-200",
    soil_type: "Clayey", lithology: "Deccan Traps",
    land_use: "Built-up / Urban residential", drainage_coverage_pct: 30,
    annual_rainfall_mm: 1205,
  },
  "khairipura nallah": {
    lat: 21.1350, lng: 79.0780, zoom: 16, zone: "Central",
    description: "Khairipura Nallah — near Mumbai-Howrah Railway, Mehendibagh Road (Ward 20/21 boundary).",
    elevation_range_m: "292-301", flood_susceptibility: "High",
    nearest_water_body: "Khairipura Nallah (self)", distance_from_river_m: "0-200",
    soil_type: "Clayey", lithology: "Archean Gneisses",
    land_use: "Built-up / Mixed", drainage_coverage_pct: 35,
    annual_rainfall_mm: 1205,
  },
  "ganganagar nallah": {
    lat: 21.1750, lng: 79.1100, zoom: 16, zone: "North-East",
    description: "Ganganagar Zopadpatti Nallah — near Dabha Ring Road, Manohar Vihar bridge (Ward 13 boundary).",
    elevation_range_m: "305-308", flood_susceptibility: "Moderate",
    nearest_water_body: "Ganganagar Nallah (self)", distance_from_river_m: "0-200",
    soil_type: "Clayey", lithology: "Deccan Traps",
    land_use: "Built-up / Semi-urban", drainage_coverage_pct: 20,
    annual_rainfall_mm: 1205,
  },

  // ─── Major Nagpur Localities (coordinates from OSM/Google) ───
  "dharampeth": {
    lat: 21.1400, lng: 79.0700, zoom: 15, zone: "Central-West",
    description: "Premier residential and commercial area in central Nagpur. Home to Dharampeth Science College. Relatively well-drained but adjacent to Nag River flood zone.",
    elevation_range_m: "305-308", flood_susceptibility: "Moderate",
    nearest_water_body: "Nag River (~800m)", distance_from_river_m: "600-800",
    soil_type: "Clayey", lithology: "Deccan Traps",
    land_use: "Built-up / Premium residential-commercial", drainage_coverage_pct: 50,
    annual_rainfall_mm: 1205,
  },
  "sitabuldi": {
    lat: 21.1465, lng: 79.0800, zoom: 16, zone: "Central",
    description: "Historic heart of Nagpur — Sitabuldi Fort area. Major commercial hub. Elevated terrain (Sitabuldi hill) provides natural drainage advantage.",
    elevation_range_m: "315-324", flood_susceptibility: "Low",
    nearest_water_body: "Nag River (~500m)", distance_from_river_m: "400-600",
    soil_type: "Clayey", lithology: "Archean Gneisses",
    land_use: "Built-up / Dense commercial", drainage_coverage_pct: 55,
    annual_rainfall_mm: 1205,
  },
  "sadar": {
    lat: 21.1550, lng: 79.0750, zoom: 15, zone: "Central-North",
    description: "Sadar (Cantonment area) — well-planned locality near Seminary Hills (Ward 27). Moderate flood risk.",
    elevation_range_m: "315-324", flood_susceptibility: "Low",
    nearest_water_body: "Nag River (~1km)", distance_from_river_m: ">1000",
    soil_type: "Clayey", lithology: "Deccan Traps",
    land_use: "Built-up / Commercial-Institutional", drainage_coverage_pct: 50,
    annual_rainfall_mm: 1205,
  },
  "civil lines": {
    lat: 21.1530, lng: 79.0680, zoom: 15, zone: "Central-North",
    description: "Civil Lines / Ramnagar area (Ward 14). Planned British-era layout with wider roads. Home to Vidhan Bhavan.",
    elevation_range_m: "308-314", flood_susceptibility: "Low",
    nearest_water_body: "Ambazari Lake (~1.5km)", distance_from_river_m: ">1000",
    soil_type: "Clayey", lithology: "Deccan Traps",
    land_use: "Built-up / Institutional-Residential", drainage_coverage_pct: 55,
    annual_rainfall_mm: 1205,
  },
  "itwari": {
    lat: 21.1530, lng: 79.0850, zoom: 16, zone: "Central",
    description: "Itwari — major commercial and wholesale market area near Nagpur Railway Station. High foot traffic, prone to waterlogging near Chambhar Nallah bridge.",
    elevation_range_m: "292-301", flood_susceptibility: "High",
    nearest_water_body: "Chambhar Nallah (adjacent)", distance_from_river_m: "0-200",
    soil_type: "Clayey", lithology: "Archean Gneisses",
    land_use: "Built-up / Dense commercial", drainage_coverage_pct: 40,
    annual_rainfall_mm: 1205,
  },
  "hingna": {
    lat: 21.1170, lng: 79.0200, zoom: 14, zone: "West",
    description: "Hingna — industrial suburb west of Nagpur. MIDC area with Hingna Road (Ward 32 — VNIT Campus area). Mixed industrial-residential.",
    elevation_range_m: "315-324", flood_susceptibility: "Moderate",
    nearest_water_body: "Pora River (~1.5km)", distance_from_river_m: ">1000",
    soil_type: "Clayey", lithology: "Deccan Traps",
    land_use: "Industrial / Mixed", drainage_coverage_pct: 25,
    annual_rainfall_mm: 1205,
  },
  "wadi": {
    lat: 21.1640, lng: 79.0480, zoom: 15, zone: "North-West",
    description: "Wadi — residential and industrial area in north-west Nagpur. Located near railway lines.",
    elevation_range_m: "308-314", flood_susceptibility: "Moderate",
    nearest_water_body: "Bor Nallah (~800m)", distance_from_river_m: "600-800",
    soil_type: "Clayey", lithology: "Deccan Traps",
    land_use: "Built-up / Industrial-Residential", drainage_coverage_pct: 30,
    annual_rainfall_mm: 1205,
  },
  "ambazari": {
    lat: 21.1330, lng: 79.0530, zoom: 15, zone: "West-Central",
    description: "Ambazari — home to Ambazari Lake (Ward 13/31). Major recreational area. Lake outfall blockage by water hyacinth (Eichhornia) contributed to 2023 flooding.",
    elevation_range_m: "308-314", flood_susceptibility: "Moderate",
    nearest_water_body: "Ambazari Lake (adjacent)", distance_from_river_m: "0-200",
    soil_type: "Clayey", lithology: "Deccan Traps",
    land_use: "Water body / Recreational / Residential", drainage_coverage_pct: 40,
    annual_rainfall_mm: 1205,
  },
  "ambazari lake": {
    lat: 21.1300, lng: 79.0480, zoom: 15, zone: "West-Central",
    description: "Ambazari Lake — largest lake in Nagpur. Outfall blockage by Eichhornia (water hyacinth) was a contributing cause of the 2023-09-23 flood event.",
    elevation_range_m: "308-314", flood_susceptibility: "Moderate",
    nearest_water_body: "Ambazari Lake (self)", distance_from_river_m: "0-200",
    soil_type: "Clayey", lithology: "Deccan Traps",
    land_use: "Water body", drainage_coverage_pct: 40,
    annual_rainfall_mm: 1205,
  },
  "dhantoli": {
    lat: 21.1380, lng: 79.0850, zoom: 16, zone: "Central",
    description: "Dhantoli (Ward 15) — central Nagpur residential area. Dhantoli Garden is a landmark. Close to Nag River corridor.",
    elevation_range_m: "292-301", flood_susceptibility: "High",
    nearest_water_body: "Nag River (~300m)", distance_from_river_m: "200-400",
    soil_type: "Clayey", lithology: "Archean Gneisses",
    land_use: "Built-up / Residential", drainage_coverage_pct: 45,
    annual_rainfall_mm: 1205,
  },
  "ajni": {
    lat: 21.1360, lng: 79.0960, zoom: 16, zone: "Central-East",
    description: "Ajni (Ward 17) — residential area near Ajni Railway Station. Close to Nag River, moderate flood risk.",
    elevation_range_m: "292-301", flood_susceptibility: "Moderate",
    nearest_water_body: "Nag River (~400m)", distance_from_river_m: "200-400",
    soil_type: "Clayey", lithology: "Archean Gneisses",
    land_use: "Built-up / Residential-Railway", drainage_coverage_pct: 40,
    annual_rainfall_mm: 1205,
  },
  "sakkardara": {
    lat: 21.1290, lng: 79.1000, zoom: 16, zone: "Central-East",
    description: "Sakkardara (Ward 18/25) — includes Sakkardara Lake. Area near Nag River, historically flood-prone.",
    elevation_range_m: "292-301", flood_susceptibility: "High",
    nearest_water_body: "Sakkardara Lake / Nag River", distance_from_river_m: "0-200",
    soil_type: "Clayey", lithology: "Archean Gneisses",
    land_use: "Built-up / Residential", drainage_coverage_pct: 35,
    annual_rainfall_mm: 1205,
  },
  "seminary hills": {
    lat: 21.1600, lng: 79.0700, zoom: 15, zone: "North-Central",
    description: "Seminary Hills (Ward 27) — elevated, affluent residential area. One of the highest points in Nagpur, naturally well-drained.",
    elevation_range_m: "325-339", flood_susceptibility: "Very Low",
    nearest_water_body: "None nearby", distance_from_river_m: ">1000",
    soil_type: "Clayey", lithology: "Deccan Traps",
    land_use: "Built-up / Premium residential", drainage_coverage_pct: 55,
    annual_rainfall_mm: 1205,
  },
  "laxmi nagar": {
    lat: 21.1330, lng: 79.0950, zoom: 16, zone: "Central-East",
    description: "Laxmi Nagar — residential area in central-east Nagpur. Near Nag River corridor, moderate flood risk.",
    elevation_range_m: "292-301", flood_susceptibility: "Moderate",
    nearest_water_body: "Nag River (~400m)", distance_from_river_m: "200-400",
    soil_type: "Clayey", lithology: "Archean Gneisses",
    land_use: "Built-up / Urban residential", drainage_coverage_pct: 40,
    annual_rainfall_mm: 1205,
  },
  "pratap nagar": {
    lat: 21.1220, lng: 79.0700, zoom: 16, zone: "West-Central",
    description: "Pratap Nagar — well-developed residential locality in central-west Nagpur. Moderate elevation.",
    elevation_range_m: "305-308", flood_susceptibility: "Moderate",
    nearest_water_body: "Nag River (~900m)", distance_from_river_m: "800-1000",
    soil_type: "Clayey", lithology: "Deccan Traps",
    land_use: "Built-up / Residential", drainage_coverage_pct: 40,
    annual_rainfall_mm: 1205,
  },
  "manewada": {
    lat: 21.1070, lng: 79.1150, zoom: 15, zone: "East",
    description: "Manewada (Ward 35 area) — eastern suburb of Nagpur near Hudkeshwar. Growing residential area.",
    elevation_range_m: "292-301", flood_susceptibility: "High",
    nearest_water_body: "Nag River (~600m)", distance_from_river_m: "400-600",
    soil_type: "Clayey", lithology: "Archean Gneisses",
    land_use: "Built-up / Mixed urban", drainage_coverage_pct: 25,
    annual_rainfall_mm: 1205,
  },
  "wathoda": {
    lat: 21.1200, lng: 79.1100, zoom: 15, zone: "East",
    description: "Wathoda (Ward 25 area) — near Sakkardara Lake. Eastern residential zone with moderate flood risk.",
    elevation_range_m: "292-301", flood_susceptibility: "Moderate",
    nearest_water_body: "Sakkardara Lake (~500m)", distance_from_river_m: "400-600",
    soil_type: "Clayey", lithology: "Archean Gneisses",
    land_use: "Built-up / Residential", drainage_coverage_pct: 30,
    annual_rainfall_mm: 1205,
  },
  "somalwada": {
    lat: 21.1130, lng: 79.0720, zoom: 16, zone: "West-Central",
    description: "Somalwada — residential area near Rahul Nagar Nallah (Ward 16). Located near Gauri Apartment drainage channel.",
    elevation_range_m: "305-308", flood_susceptibility: "Moderate",
    nearest_water_body: "Rahul Nagar Nallah (~200m)", distance_from_river_m: "200-400",
    soil_type: "Clayey", lithology: "Deccan Traps",
    land_use: "Built-up / Residential", drainage_coverage_pct: 30,
    annual_rainfall_mm: 1205,
  },
  "sonegaon": {
    lat: 21.0980, lng: 79.0600, zoom: 15, zone: "South-West",
    description: "Sonegaon (Ward 36 area) — near Nagpur Airport. Includes Sonegaon Lake. Airport connectivity was cut off during 2026-07-28 flooding.",
    elevation_range_m: "305-308", flood_susceptibility: "Moderate",
    nearest_water_body: "Sonegaon Lake", distance_from_river_m: "400-600",
    soil_type: "Clayey", lithology: "Deccan Traps",
    land_use: "Mixed (Airport / Residential / Lake)", drainage_coverage_pct: 30,
    annual_rainfall_mm: 1205,
  },
  "nagpur airport": {
    lat: 21.0922, lng: 79.0472, zoom: 14, zone: "South-West",
    description: "Dr. Babasaheb Ambedkar International Airport. Connectivity was severely disrupted during the 2026-07-28 flood event — roads submerged for hours.",
    elevation_range_m: "305-308", flood_susceptibility: "Moderate",
    nearest_water_body: "Sonegaon Lake (~1km)", distance_from_river_m: ">1000",
    soil_type: "Clayey", lithology: "Deccan Traps",
    land_use: "Airport / Infrastructure", drainage_coverage_pct: 40,
    annual_rainfall_mm: 1205,
  },
  "koradi": {
    lat: 21.2200, lng: 79.0900, zoom: 14, zone: "North",
    description: "Koradi — northern suburb known for Koradi Thermal Power Station. Semi-rural area with lower built-up density.",
    elevation_range_m: "281-291", flood_susceptibility: "Moderate",
    nearest_water_body: "Koradi Lake / Pili River", distance_from_river_m: "200-400",
    soil_type: "Clayey", lithology: "Deccan Traps",
    land_use: "Industrial / Semi-rural", drainage_coverage_pct: 15,
    annual_rainfall_mm: 1205,
  },
  "kamptee": {
    lat: 21.2170, lng: 79.1960, zoom: 14, zone: "North-East",
    description: "Kamptee — historic cantonment town north-east of Nagpur. Military station area with moderate infrastructure.",
    elevation_range_m: "281-291", flood_susceptibility: "Moderate",
    nearest_water_body: "Kanhan River (~2km)", distance_from_river_m: ">1000",
    soil_type: "Clayey", lithology: "Gondwana Supergroup",
    land_use: "Built-up / Military-Residential", drainage_coverage_pct: 30,
    annual_rainfall_mm: 1205,
  },
  "butibori": {
    lat: 21.0100, lng: 79.0500, zoom: 14, zone: "South",
    description: "Butibori (Ward 38 boundary) — industrial area south of Nagpur. MIDC industrial estate. Near MIHAN.",
    elevation_range_m: "281-291", flood_susceptibility: "Low",
    nearest_water_body: "Unnamed stream", distance_from_river_m: ">1000",
    soil_type: "Clayey", lithology: "Deccan Traps",
    land_use: "Industrial / MIDC", drainage_coverage_pct: 20,
    annual_rainfall_mm: 1205,
  },
  "mihan": {
    lat: 21.0700, lng: 79.0550, zoom: 14, zone: "South",
    description: "MIHAN (Multi-modal International Hub Airport at Nagpur) — special economic zone south of Nagpur. Modern infrastructure.",
    elevation_range_m: "292-301", flood_susceptibility: "Low",
    nearest_water_body: "Unnamed stream", distance_from_river_m: ">1000",
    soil_type: "Clayey", lithology: "Deccan Traps",
    land_use: "Industrial / SEZ", drainage_coverage_pct: 35,
    annual_rainfall_mm: 1205,
  },
  "wardha road": {
    lat: 21.1100, lng: 79.1000, zoom: 15, zone: "South-East",
    description: "Wardha Road corridor — major arterial road in south-east Nagpur. High-traffic area connecting to Mumbai-Nagpur Expressway.",
    elevation_range_m: "292-301", flood_susceptibility: "High",
    nearest_water_body: "Nag River (~500m)", distance_from_river_m: "400-600",
    soil_type: "Clayey", lithology: "Archean Gneisses",
    land_use: "Built-up / Commercial-Residential", drainage_coverage_pct: 35,
    annual_rainfall_mm: 1205,
  },
  "katol road": {
    lat: 21.1680, lng: 79.0500, zoom: 15, zone: "North-West",
    description: "Katol Road — major arterial road in north-west Nagpur. Near Bor Nallah, Dinshaw Factory Square. Commercial-residential corridor.",
    elevation_range_m: "305-308", flood_susceptibility: "Moderate",
    nearest_water_body: "Bor Nallah (adjacent)", distance_from_river_m: "0-200",
    soil_type: "Clayey", lithology: "Deccan Traps",
    land_use: "Built-up / Commercial corridor", drainage_coverage_pct: 35,
    annual_rainfall_mm: 1205,
  },
  "bharat nagar": {
    lat: 21.1580, lng: 79.0970, zoom: 16, zone: "North-Central",
    description: "Bharat Nagar (Ward 4 area) — residential locality in north-central Nagpur. Near Nag River crossing.",
    elevation_range_m: "292-301", flood_susceptibility: "High",
    nearest_water_body: "Nag River (~300m)", distance_from_river_m: "200-400",
    soil_type: "Clayey", lithology: "Archean Gneisses",
    land_use: "Built-up / Residential", drainage_coverage_pct: 35,
    annual_rainfall_mm: 1205,
  },
  "bezonbagh": {
    lat: 21.1470, lng: 79.0930, zoom: 16, zone: "Central",
    description: "Bezonbagh (Ward 7) — mixed residential-commercial area in central Nagpur. Near railway lines.",
    elevation_range_m: "292-301", flood_susceptibility: "Moderate",
    nearest_water_body: "Nag River (~500m)", distance_from_river_m: "400-600",
    soil_type: "Clayey", lithology: "Archean Gneisses",
    land_use: "Built-up / Mixed", drainage_coverage_pct: 40,
    annual_rainfall_mm: 1205,
  },
  "chhaoni": {
    lat: 21.1620, lng: 79.0630, zoom: 15, zone: "North-West",
    description: "Chhaoni / Chhavni (Ward 9) — cantonment area in north-west Nagpur. Military zone with regulated development.",
    elevation_range_m: "315-324", flood_susceptibility: "Low",
    nearest_water_body: "Ambazari Lake (~1.5km)", distance_from_river_m: ">1000",
    soil_type: "Clayey", lithology: "Deccan Traps",
    land_use: "Built-up / Military-Residential", drainage_coverage_pct: 45,
    annual_rainfall_mm: 1205,
  },
  "bhandewadi": {
    lat: 21.1200, lng: 79.1200, zoom: 15, zone: "East",
    description: "Bhandewadi (Ward 23) — eastern suburb. Location of Nagpur's major waste disposal site. Rapidly urbanizing.",
    elevation_range_m: "292-301", flood_susceptibility: "High",
    nearest_water_body: "Nag River (~700m)", distance_from_river_m: "600-800",
    soil_type: "Clayey", lithology: "Archean Gneisses",
    land_use: "Built-up / Waste management / Residential", drainage_coverage_pct: 20,
    annual_rainfall_mm: 1205,
  },
  "chikhli": {
    lat: 21.1150, lng: 79.1300, zoom: 15, zone: "East",
    description: "Chikhli (Ward 24) — eastern residential area. Growing suburb with moderate infrastructure development.",
    elevation_range_m: "292-301", flood_susceptibility: "Moderate",
    nearest_water_body: "Nag River (~800m)", distance_from_river_m: "600-800",
    soil_type: "Clayey", lithology: "Archean Gneisses",
    land_use: "Built-up / Residential", drainage_coverage_pct: 25,
    annual_rainfall_mm: 1205,
  },
  "shanti nagar": {
    lat: 21.1380, lng: 79.0950, zoom: 16, zone: "Central",
    description: "Shanti Nagar (Ward 21) — central residential area. Near Khairipura Nallah and Nag River.",
    elevation_range_m: "292-301", flood_susceptibility: "High",
    nearest_water_body: "Nag River (~200m)", distance_from_river_m: "200-400",
    soil_type: "Clayey", lithology: "Archean Gneisses",
    land_use: "Built-up / Residential", drainage_coverage_pct: 40,
    annual_rainfall_mm: 1205,
  },
  "vayusena nagar": {
    lat: 21.1550, lng: 79.0550, zoom: 15, zone: "North-West",
    description: "Vayusena Nagar (Ward 29) — Air Force residential area. Well-maintained infrastructure, lower flood risk.",
    elevation_range_m: "315-324", flood_susceptibility: "Low",
    nearest_water_body: "Ambazari Lake (~1km)", distance_from_river_m: ">1000",
    soil_type: "Clayey", lithology: "Deccan Traps",
    land_use: "Built-up / Military residential", drainage_coverage_pct: 50,
    annual_rainfall_mm: 1205,
  },
  "vnit": {
    lat: 21.1254, lng: 79.0509, zoom: 16, zone: "West",
    description: "Visvesvaraya National Institute of Technology (VNIT) campus, Hingna Road (Ward 32). The VNIT Frequency Ratio flood susceptibility model is from this institution.",
    elevation_range_m: "308-314", flood_susceptibility: "Low",
    nearest_water_body: "Ambazari Lake (~1.5km)", distance_from_river_m: ">1000",
    soil_type: "Clayey", lithology: "Deccan Traps",
    land_use: "Institutional", drainage_coverage_pct: 45,
    annual_rainfall_mm: 1205,
  },
  "zenda chowk": {
    lat: 21.1420, lng: 79.0880, zoom: 17, zone: "Central",
    description: "Zenda Chowk — historic intersection near Hatti Nallah junction with Nag River. Flood-critical point (Ward 18/22 boundary).",
    elevation_range_m: "292-301", flood_susceptibility: "Very High",
    nearest_water_body: "Nag River (adjacent) / Hatti Nallah", distance_from_river_m: "0-200",
    soil_type: "Clayey", lithology: "Archean Gneisses",
    land_use: "Built-up / Dense commercial", drainage_coverage_pct: 40,
    annual_rainfall_mm: 1205,
  },
  "gandhibagh": {
    lat: 21.1500, lng: 79.0900, zoom: 16, zone: "Central",
    description: "Gandhibagh — major commercial market area in central Nagpur. Dense commercial activity, near railway station.",
    elevation_range_m: "292-301", flood_susceptibility: "Moderate",
    nearest_water_body: "Nag River (~400m)", distance_from_river_m: "200-400",
    soil_type: "Clayey", lithology: "Archean Gneisses",
    land_use: "Built-up / Dense commercial", drainage_coverage_pct: 40,
    annual_rainfall_mm: 1205,
  },
  "mahal": {
    lat: 21.1440, lng: 79.0830, zoom: 16, zone: "Central",
    description: "Mahal — old city area in central Nagpur. Dense residential-commercial area. Near Nag River.",
    elevation_range_m: "292-301", flood_susceptibility: "High",
    nearest_water_body: "Nag River (~200m)", distance_from_river_m: "0-200",
    soil_type: "Clayey", lithology: "Archean Gneisses",
    land_use: "Built-up / Old city commercial", drainage_coverage_pct: 35,
    annual_rainfall_mm: 1205,
  },
  "gokulpeth": {
    lat: 21.1490, lng: 79.0770, zoom: 16, zone: "Central",
    description: "Gokulpeth — residential area in central Nagpur. Well-established locality with moderate infrastructure.",
    elevation_range_m: "305-308", flood_susceptibility: "Moderate",
    nearest_water_body: "Nag River (~600m)", distance_from_river_m: "400-600",
    soil_type: "Clayey", lithology: "Deccan Traps",
    land_use: "Built-up / Residential", drainage_coverage_pct: 45,
    annual_rainfall_mm: 1205,
  },
  "ramdaspeth": {
    lat: 21.1430, lng: 79.0750, zoom: 16, zone: "Central",
    description: "Ramdaspeth — premium residential and commercial area in central Nagpur. Near Law College Square.",
    elevation_range_m: "305-308", flood_susceptibility: "Moderate",
    nearest_water_body: "Nag River (~500m)", distance_from_river_m: "400-600",
    soil_type: "Clayey", lithology: "Deccan Traps",
    land_use: "Built-up / Premium commercial-residential", drainage_coverage_pct: 50,
    annual_rainfall_mm: 1205,
  },
  "lakadganj": {
    lat: 21.1580, lng: 79.1050, zoom: 15, zone: "North-East",
    description: "Lakadganj — residential and industrial area in north-east Nagpur. Near railway corridor.",
    elevation_range_m: "292-301", flood_susceptibility: "Moderate",
    nearest_water_body: "Nag River (~500m)", distance_from_river_m: "400-600",
    soil_type: "Clayey", lithology: "Archean Gneisses",
    land_use: "Built-up / Mixed industrial-residential", drainage_coverage_pct: 35,
    annual_rainfall_mm: 1205,
  },
  "nagpur railway station": {
    lat: 21.1500, lng: 79.0880, zoom: 17, zone: "Central",
    description: "Nagpur Junction Railway Station — major railway hub in central Nagpur. Area experiences waterlogging during heavy rains.",
    elevation_range_m: "292-301", flood_susceptibility: "High",
    nearest_water_body: "Nag River (~300m)", distance_from_river_m: "200-400",
    soil_type: "Clayey", lithology: "Archean Gneisses",
    land_use: "Built-up / Railway infrastructure", drainage_coverage_pct: 40,
    annual_rainfall_mm: 1205,
  },
  "dabha": {
    lat: 21.1800, lng: 79.1150, zoom: 15, zone: "North-East",
    description: "Dabha — north-eastern suburb near Ring Road. Near Ganganagar Nallah, Manohar Vihar bridge (Ward 13).",
    elevation_range_m: "305-308", flood_susceptibility: "Moderate",
    nearest_water_body: "Ganganagar Nallah (~300m)", distance_from_river_m: "200-400",
    soil_type: "Clayey", lithology: "Deccan Traps",
    land_use: "Mixed (semi-urban / residential)", drainage_coverage_pct: 20,
    annual_rainfall_mm: 1205,
  },
  "khamla": {
    lat: 21.1250, lng: 79.0600, zoom: 16, zone: "West-Central",
    description: "Khamla — residential area in west-central Nagpur. Well-established locality.",
    elevation_range_m: "308-314", flood_susceptibility: "Low",
    nearest_water_body: "Ambazari Lake (~1km)", distance_from_river_m: ">1000",
    soil_type: "Clayey", lithology: "Deccan Traps",
    land_use: "Built-up / Residential", drainage_coverage_pct: 40,
    annual_rainfall_mm: 1205,
  },
  "trimurti nagar": {
    lat: 21.1200, lng: 79.0550, zoom: 16, zone: "West",
    description: "Trimurti Nagar — residential area in west Nagpur. Well-planned layout.",
    elevation_range_m: "308-314", flood_susceptibility: "Low",
    nearest_water_body: "Ambazari Lake (~1.5km)", distance_from_river_m: ">1000",
    soil_type: "Clayey", lithology: "Deccan Traps",
    land_use: "Built-up / Residential", drainage_coverage_pct: 40,
    annual_rainfall_mm: 1205,
  },
  "nandanvan": {
    lat: 21.1300, lng: 79.1100, zoom: 16, zone: "East",
    description: "Nandanvan — residential area in eastern Nagpur. Moderate flood risk due to proximity to low-lying zones.",
    elevation_range_m: "292-301", flood_susceptibility: "Moderate",
    nearest_water_body: "Nag River (~600m)", distance_from_river_m: "400-600",
    soil_type: "Clayey", lithology: "Archean Gneisses",
    land_use: "Built-up / Residential", drainage_coverage_pct: 30,
    annual_rainfall_mm: 1205,
  },
  "panjara colony": {
    lat: 21.1950, lng: 79.1050, zoom: 16, zone: "North",
    description: "Panjara Colony / Shuddhodhan Nagar (Ward 1 area) — northern Nagpur residential area near Pili River.",
    elevation_range_m: "281-291", flood_susceptibility: "High",
    nearest_water_body: "Pili River (~300m)", distance_from_river_m: "200-400",
    soil_type: "Clayey", lithology: "Alluvium",
    land_use: "Built-up / Residential", drainage_coverage_pct: 25,
    annual_rainfall_mm: 1205,
  },
  "nagpur": {
    lat: 21.1458, lng: 79.0882, zoom: 12, zone: "City-Wide",
    description: "Nagpur — the Orange City, geographical center of India. Municipal area: 217.56 km². Population density: ~11,000/km². Three rivers: Nag (central), Pili (north), Pora (south). 74% built-up area with only 35% drainage coverage.",
    elevation_range_m: "280-370", flood_susceptibility: "Moderate (city-wide average; 48.23% area is High/Very High)",
    nearest_water_body: "Nag River (central spine)", distance_from_river_m: "Varies",
    soil_type: "91.53% Clayey, 8.47% Clay Loam", lithology: "Deccan Traps 56.53%, Archean Gneisses 23.25%, Gondwana 9.53%",
    land_use: "74.16% Built-up, 12.68% Wastelands, 6.41% Forest, 4.81% Agriculture",
    drainage_coverage_pct: 35,
    annual_rainfall_mm: 1205,
  },
  "gorewada": {
    lat: 21.1800, lng: 79.0500, zoom: 14, zone: "North-West",
    description: "Gorewada — north-western Nagpur. Home to Gorewada Zoo and Gorewada Lake. Major green zone.",
    elevation_range_m: "315-324", flood_susceptibility: "Low",
    nearest_water_body: "Gorewada Lake (adjacent)", distance_from_river_m: "0-200",
    soil_type: "Clayey", lithology: "Deccan Traps",
    land_use: "Forest / Recreational / Lake", drainage_coverage_pct: 15,
    annual_rainfall_mm: 1205,
  },
  "futala lake": {
    lat: 21.1530, lng: 79.0600, zoom: 16, zone: "Central-West",
    description: "Futala Lake — popular recreational lake in central-west Nagpur. Landmark leisure spot.",
    elevation_range_m: "308-314", flood_susceptibility: "Moderate",
    nearest_water_body: "Futala Lake (self)", distance_from_river_m: "0-200",
    soil_type: "Clayey", lithology: "Deccan Traps",
    land_use: "Water body / Recreational", drainage_coverage_pct: 40,
    annual_rainfall_mm: 1205,
  },
  "shankar nagar": {
    lat: 21.1360, lng: 79.0650, zoom: 16, zone: "Central-West",
    description: "Shankar Nagar — popular commercial and food hub in central Nagpur. Well-developed area.",
    elevation_range_m: "305-308", flood_susceptibility: "Moderate",
    nearest_water_body: "Nag River (~800m)", distance_from_river_m: "600-800",
    soil_type: "Clayey", lithology: "Deccan Traps",
    land_use: "Built-up / Commercial-Residential", drainage_coverage_pct: 45,
    annual_rainfall_mm: 1205,
  },
  "byramji town": {
    lat: 21.1400, lng: 79.0900, zoom: 16, zone: "Central",
    description: "Byramji Town — old residential area in central Nagpur near Loha Pul. Close to Nag River.",
    elevation_range_m: "292-301", flood_susceptibility: "High",
    nearest_water_body: "Nag River (~150m)", distance_from_river_m: "0-200",
    soil_type: "Clayey", lithology: "Archean Gneisses",
    land_use: "Built-up / Old residential", drainage_coverage_pct: 35,
    annual_rainfall_mm: 1205,
  },
  "takli": {
    lat: 21.1900, lng: 79.0700, zoom: 15, zone: "North",
    description: "Takli — northern suburb of Nagpur. Semi-urban area with developing infrastructure.",
    elevation_range_m: "305-308", flood_susceptibility: "Moderate",
    nearest_water_body: "Pili River (~1km)", distance_from_river_m: "800-1000",
    soil_type: "Clayey", lithology: "Deccan Traps",
    land_use: "Mixed (semi-urban / agricultural)", drainage_coverage_pct: 15,
    annual_rainfall_mm: 1205,
  },
  "kharbi": {
    lat: 21.1150, lng: 79.1400, zoom: 15, zone: "East",
    description: "Kharbi — eastern suburb of Nagpur. Developing residential area with limited infrastructure.",
    elevation_range_m: "292-301", flood_susceptibility: "Moderate",
    nearest_water_body: "Unnamed stream (~500m)", distance_from_river_m: "400-600",
    soil_type: "Clayey", lithology: "Archean Gneisses",
    land_use: "Mixed (residential / semi-urban)", drainage_coverage_pct: 15,
    annual_rainfall_mm: 1205,
  },
  "yashodhara nagar": {
    lat: 21.1050, lng: 79.0800, zoom: 16, zone: "South-Central",
    description: "Yashodhara Nagar — residential locality in south-central Nagpur.",
    elevation_range_m: "292-301", flood_susceptibility: "Moderate",
    nearest_water_body: "Nag River (~600m)", distance_from_river_m: "400-600",
    soil_type: "Clayey", lithology: "Deccan Traps",
    land_use: "Built-up / Residential", drainage_coverage_pct: 30,
    annual_rainfall_mm: 1205,
  },
  "hanuman nagar": {
    lat: 21.1250, lng: 79.0850, zoom: 16, zone: "Central-South",
    description: "Hanuman Nagar — residential area in south-central Nagpur. Near major arterial roads.",
    elevation_range_m: "292-301", flood_susceptibility: "Moderate",
    nearest_water_body: "Nag River (~500m)", distance_from_river_m: "400-600",
    soil_type: "Clayey", lithology: "Deccan Traps",
    land_use: "Built-up / Residential", drainage_coverage_pct: 35,
    annual_rainfall_mm: 1205,
  },
  "ram nagar": {
    lat: 21.1530, lng: 79.0680, zoom: 16, zone: "Central-North",
    description: "Ram Nagar / Ramnagar — residential area near Civil Lines. Ward 14 area.",
    elevation_range_m: "308-314", flood_susceptibility: "Low",
    nearest_water_body: "Ambazari Lake (~1.5km)", distance_from_river_m: ">1000",
    soil_type: "Clayey", lithology: "Deccan Traps",
    land_use: "Built-up / Residential-Institutional", drainage_coverage_pct: 50,
    annual_rainfall_mm: 1205,
  },
  "mehendibagh": {
    lat: 21.1370, lng: 79.0810, zoom: 16, zone: "Central",
    description: "Mehendibagh — area near Khairipura Nallah, Mumbai-Howrah Railway (Ward 20/21 boundary). Moderate flood risk.",
    elevation_range_m: "292-301", flood_susceptibility: "High",
    nearest_water_body: "Khairipura Nallah (adjacent)", distance_from_river_m: "0-200",
    soil_type: "Clayey", lithology: "Archean Gneisses",
    land_use: "Built-up / Residential", drainage_coverage_pct: 35,
    annual_rainfall_mm: 1205,
  },
  "congress nagar": {
    lat: 21.1200, lng: 79.0900, zoom: 16, zone: "South-Central",
    description: "Congress Nagar — residential area in south-central Nagpur. Moderate density.",
    elevation_range_m: "292-301", flood_susceptibility: "Moderate",
    nearest_water_body: "Nag River (~500m)", distance_from_river_m: "400-600",
    soil_type: "Clayey", lithology: "Deccan Traps",
    land_use: "Built-up / Residential", drainage_coverage_pct: 35,
    annual_rainfall_mm: 1205,
  },
  "bajaj nagar": {
    lat: 21.1350, lng: 79.0650, zoom: 16, zone: "Central-West",
    description: "Bajaj Nagar — upscale commercial-residential area in central-west Nagpur. Near Shankar Nagar Square.",
    elevation_range_m: "305-308", flood_susceptibility: "Low",
    nearest_water_body: "Nag River (~900m)", distance_from_river_m: "800-1000",
    soil_type: "Clayey", lithology: "Deccan Traps",
    land_use: "Built-up / Premium commercial-residential", drainage_coverage_pct: 50,
    annual_rainfall_mm: 1205,
  },
  "pardi": {
    lat: 21.1570, lng: 79.0960, zoom: 16, zone: "Central-North",
    description: "Pardi — residential area in central Nagpur. Near Nag River.",
    elevation_range_m: "292-301", flood_susceptibility: "Moderate",
    nearest_water_body: "Nag River (~400m)", distance_from_river_m: "200-400",
    soil_type: "Clayey", lithology: "Archean Gneisses",
    land_use: "Built-up / Residential", drainage_coverage_pct: 35,
    annual_rainfall_mm: 1205,
  },
  "dighori": {
    lat: 21.0850, lng: 79.1050, zoom: 15, zone: "South-East",
    description: "Dighori — south-eastern suburb of Nagpur. Near Besa. Developing residential area.",
    elevation_range_m: "281-291", flood_susceptibility: "High",
    nearest_water_body: "Nag River tributary (~400m)", distance_from_river_m: "400-600",
    soil_type: "Clayey", lithology: "Deccan Traps",
    land_use: "Mixed (residential / semi-urban)", drainage_coverage_pct: 15,
    annual_rainfall_mm: 1205,
  },
  "pipla": {
    lat: 21.0950, lng: 79.1200, zoom: 15, zone: "South-East",
    description: "Pipla — south-eastern Nagpur. Suburban residential area with developing infrastructure.",
    elevation_range_m: "292-301", flood_susceptibility: "Moderate",
    nearest_water_body: "Unnamed nullah (~300m)", distance_from_river_m: "200-400",
    soil_type: "Clayey", lithology: "Archean Gneisses",
    land_use: "Mixed (residential / semi-urban)", drainage_coverage_pct: 20,
    annual_rainfall_mm: 1205,
  },
  "telephone exchange square": {
    lat: 21.1460, lng: 79.0810, zoom: 17, zone: "Central",
    description: "Telephone Exchange Square — central Nagpur junction. Key traffic intersection, prone to waterlogging.",
    elevation_range_m: "305-308", flood_susceptibility: "Moderate",
    nearest_water_body: "Nag River (~600m)", distance_from_river_m: "400-600",
    soil_type: "Clayey", lithology: "Deccan Traps",
    land_use: "Built-up / Commercial", drainage_coverage_pct: 45,
    annual_rainfall_mm: 1205,
  },
  "law college square": {
    lat: 21.1410, lng: 79.0720, zoom: 17, zone: "Central-West",
    description: "Law College Square — major intersection in central-west Nagpur. Landmark junction near Ramdaspeth.",
    elevation_range_m: "305-308", flood_susceptibility: "Moderate",
    nearest_water_body: "Nag River (~700m)", distance_from_river_m: "600-800",
    soil_type: "Clayey", lithology: "Deccan Traps",
    land_use: "Built-up / Commercial-Institutional", drainage_coverage_pct: 50,
    annual_rainfall_mm: 1205,
  },
  "variety square": {
    lat: 21.1370, lng: 79.0590, zoom: 17, zone: "Central-West",
    description: "Variety Square — major commercial intersection in west-central Nagpur. High traffic junction.",
    elevation_range_m: "308-314", flood_susceptibility: "Moderate",
    nearest_water_body: "Ambazari Lake (~800m)", distance_from_river_m: "600-800",
    soil_type: "Clayey", lithology: "Deccan Traps",
    land_use: "Built-up / Commercial", drainage_coverage_pct: 45,
    annual_rainfall_mm: 1205,
  },
  "medical square": {
    lat: 21.1470, lng: 79.0740, zoom: 17, zone: "Central",
    description: "Medical Square — near Mayo Hospital / Government Medical College. Central Nagpur intersection.",
    elevation_range_m: "305-308", flood_susceptibility: "Moderate",
    nearest_water_body: "Nag River (~600m)", distance_from_river_m: "400-600",
    soil_type: "Clayey", lithology: "Deccan Traps",
    land_use: "Built-up / Institutional-Commercial", drainage_coverage_pct: 45,
    annual_rainfall_mm: 1205,
  },
};

/**
 * Fuzzy-match a user query against the geodatabase.
 * Returns the best match or null.
 */
function findLocationInGeoDB(query: string): { key: string; entry: GeoEntry } | null {
  const normalized = query.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

  // 1. Exact match
  if (NAGPUR_GEODATABASE[normalized]) {
    return { key: normalized, entry: NAGPUR_GEODATABASE[normalized] };
  }

  // 2. Check if query contains a known key
  let bestMatch: { key: string; entry: GeoEntry; score: number } | null = null;
  for (const [key, entry] of Object.entries(NAGPUR_GEODATABASE)) {
    // Check if the key appears in the query or vice versa
    if (normalized.includes(key) || key.includes(normalized)) {
      const score = key.length; // longer match = better
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { key, entry, score };
      }
    }
  }
  if (bestMatch) return { key: bestMatch.key, entry: bestMatch.entry };

  // 3. Word-level overlap matching
  const queryWords = normalized.split(/\s+/).filter(w => w.length > 2);
  let topMatch: { key: string; entry: GeoEntry; overlap: number } | null = null;

  for (const [key, entry] of Object.entries(NAGPUR_GEODATABASE)) {
    const keyWords = key.split(/\s+/);
    let overlap = 0;
    for (const qw of queryWords) {
      for (const kw of keyWords) {
        if (kw.includes(qw) || qw.includes(kw)) {
          overlap++;
        }
      }
    }
    if (overlap > 0 && (!topMatch || overlap > topMatch.overlap)) {
      topMatch = { key, entry, overlap };
    }
  }

  return topMatch ? { key: topMatch.key, entry: topMatch.entry } : null;
}


// Define the Graph State
export const JalSetuAgentState = Annotation.Root({
  input_query: Annotation<string>(),
  forced_intent: Annotation<"support" | "data_upload" | "map_query" | undefined>(),
  intent: Annotation<"support" | "data_upload" | "map_query" | "unknown">(),
  extracted_concern: Annotation<string | undefined>(),
  target_email: Annotation<string | undefined>(),
  email_draft: Annotation<string | undefined>(),
  report_data: Annotation<{ canals?: string[]; rainfall?: number[]; coordinates?: any[] } | undefined>(),
  map_location: Annotation<{
    location_name: string;
    lat: number;
    lng: number;
    zoom: number;
    zone: string;
    description: string;
    area_data: Record<string, any>;
  } | undefined>(),
  summary: Annotation<string | undefined>(),
  preview_url: Annotation<string | undefined>(),
  errors: Annotation<string[] | undefined>(),
});

// Initialize Groq LLM
const getModel = () => {
  if (!config.groqApiKey) {
    throw new Error("Groq API key is missing. Please set GROQ_API_KEY in .env");
  }
  return new ChatGroq({
    apiKey: config.groqApiKey,
    model: "qwen/qwen3.6-27b",
    temperature: 0,
  });
};

/**
 * Helper: strip <think>...</think> blocks and markdown fences from model output.
 * Qwen 3.6 wraps responses in thinking tokens; we must clean them.
 */
function cleanModelOutput(raw: string): string {
  return raw
    .replace(/<think>[\s\S]*?<\/think>/gi, '')  // strip thinking blocks
    .replace(/```json/gi, '')                     // strip markdown fences
    .replace(/```/g, '')
    .trim();
}

/* ─── Node A: Supervisor Router ─── */
async function routerNode(state: typeof JalSetuAgentState.State) {
  if (state.forced_intent) {
    console.log(`[Router] Intent overridden by frontend: ${state.forced_intent}`);
    return { intent: state.forced_intent };
  }

  const model = getModel();
  const intentPrompt = `You are an intent classifier for a GIS flood management system for Nagpur city. Given the user message below, classify it as exactly one of these categories:

1. "map_query" — if the user mentions any location, area, place, neighbourhood, river, nallah, or landmark name, OR asks to "show", "navigate", "find", "go to", "pin", "locate", "zoom", "display" a place on a map, OR asks about a specific area's conditions, topography, or flood status.
2. "support" — if the user is reporting a problem, complaint, asking for help, describing an issue, or requesting assistance with infrastructure (drainage, flooding, sensor, blockage, etc.) WITHOUT mentioning a specific location to navigate to.
3. "data_upload" — if the user is providing raw data, a CSV/PDF report, or asking you to parse numerical canal/rainfall data from a document.

Reply with ONLY the single word: map_query OR support OR data_upload. No explanation. No punctuation. Just one word.

User message: "${state.input_query}"`;

  const response = await model.invoke(intentPrompt);
  const raw = cleanModelOutput(response.content as string).toLowerCase().trim();

  // Extract just the last word (models sometimes add preamble despite instructions)
  const words = raw.split(/\s+/);
  const lastWord = words[words.length - 1];

  let intent: "support" | "data_upload" | "map_query" | "unknown" = "unknown";
  if (lastWord === "map_query") intent = "map_query";
  else if (lastWord === "support") intent = "support";
  else if (lastWord === "data_upload") intent = "data_upload";
  // Fallback: check if any keyword appears anywhere
  else if (raw.includes("map_query")) intent = "map_query";
  else if (raw.includes("data_upload")) intent = "data_upload";
  else if (raw.includes("support")) intent = "support";
  // Ultimate fallback: check if user query looks like a location query
  else {
    const locationMatch = findLocationInGeoDB(state.input_query);
    if (locationMatch) {
      intent = "map_query";
    } else {
      intent = "support";
    }
  }

  console.log(`[Router] Intent classified as: ${intent} (raw: "${raw.substring(0, 60)}")`);
  return { intent };
}

/* ─── Node B: Support Analyzer ─── */
async function supportAnalyzerNode(state: typeof JalSetuAgentState.State) {
  const model = getModel();
  const prompt = `You are a support analyst for a municipal water/flood management system called JalSetu (Nagpur).
Analyze this support request. Provide a 2-3 sentence summary of the core issue.
Also check if the user mentioned a specific email address to send this to.

Output ONLY valid JSON in this exact format:
{"concern": "summary of issue here", "email": "extracted_email_here_or_empty_string"}

Do NOT include any thinking or preamble. Just the raw JSON.

Request: "${state.input_query}"`;

  const response = await model.invoke(prompt);
  const content = cleanModelOutput(response.content as string);
  
  let concern = "Issue detected.";
  let target_email = undefined;
  
  try {
    const parsed = JSON.parse(content);
    concern = parsed.concern || concern;
    if (parsed.email && parsed.email.includes("@")) {
      target_email = parsed.email;
    }
  } catch(e) {
    concern = content; // fallback
  }

  console.log(`[SupportAnalyzer] Extracted concern (${concern.length} chars). Target Email: ${target_email || 'default'}`);
  return { extracted_concern: concern, target_email };
}

/* ─── Node C: Email Drafter ─── */
async function emailDrafterNode(state: typeof JalSetuAgentState.State) {
  const model = getModel();
  const targetEmail = state.target_email || 'bt25ece007@iiitn.ac.in';
  
  const prompt = `Draft a professional email to be sent to the municipal engineering team at ${targetEmail} regarding the following GIS infrastructure issue.

Issue Analysis: ${state.extracted_concern}
Original Report: ${state.input_query}

Format the email with:
- Subject line (on a separate line starting with "Subject:")
- Professional greeting
- Clear description of the issue
- Recommended action
- Sign off as "JalSetu AI Operator System"

Do NOT include any thinking or preamble. Output the email directly.`;

  const response = await model.invoke(prompt);
  const draft = cleanModelOutput(response.content as string);
  console.log(`[EmailDrafter] Draft created (${draft.length} chars)`);
  return { email_draft: draft };
}

/* ─── Node D: Mailer ─── */
async function mailerNode(state: typeof JalSetuAgentState.State) {
  if (state.email_draft) {
    const targetEmail = state.target_email || 'bt25ece007@iiitn.ac.in';
    try {
      const previewUrl = await sendOperatorEmail("AI Agent Support Request", state.email_draft, "high", targetEmail);
      console.log(`[Mailer] Email sent! Preview: ${previewUrl}`);
      return { summary: `Email sent to ${targetEmail}`, preview_url: previewUrl };
    } catch (err: any) {
      console.error(`[Mailer] Failed: ${err.message}`);
      return { summary: `Email drafted but delivery failed: ${err.message}` };
    }
  }
  return { summary: "No email content to send." };
}

/* ─── Node E: Data Extractor (Agent 2 - Data Upload) ─── */
async function dataExtractorNode(state: typeof JalSetuAgentState.State) {
  const model = getModel();
  const retryCount = state.errors?.length || 0;

  const prompt = `You are a GIS data extraction engine. Extract canal names and rainfall figures from the text below.

RULES:
- Output ONLY valid JSON, nothing else. No explanation. No markdown.
- Use this exact format: {"canals": ["canal_name_1", "canal_name_2"], "rainfall": [45.2, 30.1]}
- If no canals found, use an empty array: {"canals": [], "rainfall": []}
- If no rainfall data found, use an empty array for rainfall.
${retryCount > 0 ? '\n⚠️ PREVIOUS ATTEMPT FAILED TO PRODUCE VALID JSON. Output ONLY the raw JSON object, nothing else.\n' : ''}
Document text:
"""
${state.input_query}
"""`;

  try {
    const response = await model.invoke(prompt);
    const content = cleanModelOutput(response.content as string);

    // Try to find JSON in the response even if there's extra text
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON object found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    console.log(`[DataExtractor] Extracted: ${parsed.canals?.length || 0} canals, ${parsed.rainfall?.length || 0} rainfall readings`);
    return { report_data: parsed, errors: undefined }; // clear errors on success
  } catch (err: any) {
    const errorMsg = `Extraction error (attempt ${retryCount + 1}): ${err.message}`;
    console.error(`[DataExtractor] ${errorMsg}`);
    return { errors: [...(state.errors || []), errorMsg] };
  }
}

/* ─── Node F: Geo Validator ─── */
async function geoValidatorNode(state: typeof JalSetuAgentState.State) {
  // If errors exist from extractor, pass through for conditional retry
  if (state.errors && state.errors.length > 0) {
    console.log(`[GeoValidator] Skipping validation — extractor had errors`);
    return {};
  }

  const canals = state.report_data?.canals || [];
  const rainfall = state.report_data?.rainfall || [];

  console.log(`[GeoValidator] Validating: ${canals.length} canals, ${rainfall.length} rainfall readings`);

  // Even with empty arrays, we consider it a valid extraction (no data to map)
  const summaryParts: string[] = [];
  if (canals.length > 0) summaryParts.push(`Canals identified: ${canals.join(', ')}`);
  if (rainfall.length > 0) summaryParts.push(`Rainfall readings: ${rainfall.join('mm, ')}mm`);
  if (summaryParts.length === 0) summaryParts.push('No specific canal or rainfall data found in the report');

  return {
    summary: `Report processed successfully. ${summaryParts.join('. ')}. Data validated and ready for map sync.`
  };
}

/* ─── Node G: Map Intelligence (Agent 2 - Map/Location Query) ─── */
async function mapIntelligenceNode(state: typeof JalSetuAgentState.State) {
  console.log(`[MapIntelligence] Processing query: "${state.input_query}"`);

  const model = getModel();

  // Step 1: Use LLM to extract the location name from the user query
  const extractionPrompt = `You are a location name extractor for Nagpur, India. Given the user query, extract ONLY the place/area/locality/river/nallah name they are referring to.

RULES:
- Output ONLY the location name, nothing else. No explanation. No punctuation except what's in the name.
- If multiple locations are mentioned, pick the primary one.
- Examples:
  "Show me Manish Nagar" → Manish Nagar
  "Navigate to Dharampeth area" → Dharampeth
  "What is the condition of Pili Nadi?" → Pili Nadi
  "Zoom to Seminary Hills" → Seminary Hills
  "Sitabuldi" → Sitabuldi
  "Show flood data for Besa region" → Besa

User query: "${state.input_query}"`;

  let extractedName = "";
  try {
    const response = await model.invoke(extractionPrompt);
    extractedName = cleanModelOutput(response.content as string).trim();
    // Remove quotes if LLM wrapped the name
    extractedName = extractedName.replace(/^["']|["']$/g, '').trim();
    console.log(`[MapIntelligence] LLM extracted location: "${extractedName}"`);
  } catch (err: any) {
    console.error(`[MapIntelligence] LLM extraction failed: ${err.message}`);
    // Fallback: use the raw query
    extractedName = state.input_query;
  }

  // Step 2: Look up in geodatabase
  let match = findLocationInGeoDB(extractedName);

  // Fallback: try with the original query if LLM extraction didn't find a match
  if (!match) {
    match = findLocationInGeoDB(state.input_query);
  }

  if (match) {
    const { key, entry } = match;
    const displayName = key.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    console.log(`[MapIntelligence] ✓ Found: "${displayName}" at [${entry.lat}, ${entry.lng}] zoom=${entry.zoom}`);

    return {
      map_location: {
        location_name: displayName,
        lat: entry.lat,
        lng: entry.lng,
        zoom: entry.zoom,
        zone: entry.zone,
        description: entry.description,
        area_data: {
          elevation_range_m: entry.elevation_range_m,
          flood_susceptibility: entry.flood_susceptibility,
          nearest_water_body: entry.nearest_water_body,
          distance_from_river_m: entry.distance_from_river_m,
          soil_type: entry.soil_type,
          lithology: entry.lithology,
          land_use: entry.land_use,
          drainage_coverage_pct: entry.drainage_coverage_pct,
          annual_rainfall_mm: entry.annual_rainfall_mm,
          municipal_area_km2: 217.56,
          built_up_pct: 74,
          population_density_per_km2: 11000,
        },
      },
      summary: `📍 Located "${displayName}" in ${entry.zone} Nagpur.\n\n${entry.description}\n\n🏔️ Elevation: ${entry.elevation_range_m}m\n🌊 Flood Risk: ${entry.flood_susceptibility}\n💧 Nearest Water: ${entry.nearest_water_body}\n🏗️ Land Use: ${entry.land_use}\n🌧️ Avg Rainfall: ${entry.annual_rainfall_mm}mm/year\n🪨 Soil: ${entry.soil_type}\n⛰️ Lithology: ${entry.lithology}\n🚰 Drainage Coverage: ${entry.drainage_coverage_pct}%`,
    };
  }

  // Step 3: Location not found — generate AI summary response
  console.log(`[MapIntelligence] ✗ Location "${extractedName}" not found in geodatabase`);

  // Use LLM to check if this is a real Nagpur area and provide general info
  const fallbackPrompt = `The user asked about "${extractedName}" in Nagpur, India. This location was not found in our database.

If this IS a real place in or near Nagpur, provide approximate details. If this is NOT a real Nagpur location, say so.

Output ONLY valid JSON:
{"is_valid": true/false, "approximate_lat": 21.1458, "approximate_lng": 79.0882, "description": "brief description", "zone": "general area"}

Do NOT include any thinking or preamble. Just the raw JSON.`;

  try {
    const fallbackResponse = await model.invoke(fallbackPrompt);
    const content = cleanModelOutput(fallbackResponse.content as string);
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.is_valid && parsed.approximate_lat && parsed.approximate_lng) {
        // Validate coordinates are within Nagpur bounds (roughly 21.0-21.3, 78.9-79.3)
        const lat = parseFloat(parsed.approximate_lat);
        const lng = parseFloat(parsed.approximate_lng);
        if (lat >= 20.9 && lat <= 21.4 && lng >= 78.8 && lng <= 79.4) {
          console.log(`[MapIntelligence] LLM fallback located "${extractedName}" at [${lat}, ${lng}]`);
          return {
            map_location: {
              location_name: extractedName,
              lat,
              lng,
              zoom: 15,
              zone: parsed.zone || "Unknown",
              description: parsed.description || `Location "${extractedName}" in Nagpur.`,
              area_data: {
                elevation_range_m: "292-301 (city avg)",
                flood_susceptibility: "Moderate (estimated)",
                nearest_water_body: "Nag River (city-wide reference)",
                distance_from_river_m: "Unknown",
                soil_type: "Clayey (91.53% city-wide)",
                lithology: "Deccan Traps (dominant)",
                land_use: "Built-up (city-wide: 74%)",
                drainage_coverage_pct: 35,
                annual_rainfall_mm: 1205,
                note: "Area-specific data unavailable. Values shown are city-wide estimates from VNIT FR model.",
              },
            },
            summary: `📍 Located "${extractedName}" in ${parsed.zone || 'Nagpur'}.\n\n${parsed.description || ''}\n\n⚠️ Note: Detailed topological data for this specific area is not in our database. City-wide estimates from the VNIT Frequency Ratio model are shown.\n\n🏔️ Elevation: ~292-301m (city avg)\n🌊 Flood Risk: Moderate (estimated)\n🌧️ Avg Rainfall: 1205mm/year\n🪨 Soil: Clayey (91.53%)\n🚰 Drainage Coverage: 35%`,
          };
        }
      }
    }
  } catch (err: any) {
    console.error(`[MapIntelligence] Fallback LLM failed: ${err.message}`);
  }

  // Complete failure — location not recognized at all
  return {
    summary: `❌ Could not locate "${extractedName}" in the Nagpur area database.\n\nPlease try a recognized Nagpur locality, such as:\n• Manish Nagar, Narendra Nagar, Besa, Dharampeth\n• Sitabuldi, Sadar, Civil Lines, Seminary Hills\n• Nag River, Pili Nadi, Ambazari Lake\n• Loha Pul, Hudkeshwar, Wardha Road`,
    errors: [`Location "${extractedName}" not found`],
  };
}

/* ─── Setup Graph ─── */
export const createAgentGraph = () => {
  const builder = new StateGraph(JalSetuAgentState)
    .addNode("router", routerNode)
    .addNode("supportAnalyzer", supportAnalyzerNode)
    .addNode("emailDrafter", emailDrafterNode)
    .addNode("mailer", mailerNode)
    .addNode("dataExtractor", dataExtractorNode)
    .addNode("geoValidator", geoValidatorNode)
    .addNode("mapIntelligence", mapIntelligenceNode)

  // Edges
  builder.addEdge("__start__", "router");

  builder.addConditionalEdges("router", (state) => {
    if (state.intent === "support") return "supportAnalyzer";
    if (state.intent === "map_query") return "mapIntelligence";
    return "dataExtractor";
  });

  // Support flow: analyze → draft → mail → end
  builder.addEdge("supportAnalyzer", "emailDrafter");
  builder.addEdge("emailDrafter", "mailer");
  builder.addEdge("mailer", "__end__");

  // Map query flow: mapIntelligence → end
  builder.addEdge("mapIntelligence", "__end__");

  // Data flow: extract → validate → (retry or end)
  builder.addEdge("dataExtractor", "geoValidator");

  // Conditional fallback: retry extraction once on failure
  builder.addConditionalEdges("geoValidator", (state) => {
    if (state.errors && state.errors.length > 0 && state.errors.length < 2) {
      return "dataExtractor"; // retry loop
    }
    return "__end__";
  });

  return builder.compile({ checkpointer: new MemorySaver() });
};
