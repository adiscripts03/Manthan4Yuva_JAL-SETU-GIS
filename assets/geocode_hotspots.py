"""
geocode_hotspots.py

Turns hotspots_seed.csv (real, sourced list of Nagpur waterlogging locations
compiled from news reports and NMC statements) into a GeoJSON point layer
by geocoding each place name with OpenStreetMap's free Nominatim service.

No API key needed. Respects Nominatim's usage policy (max 1 request/sec,
custom User-Agent) -- do not remove the sleep() call or you'll get blocked.

Usage:
    pip install requests
    python geocode_hotspots.py

Output:
    nagpur_hotspots.geojson

Each point gets a manual "risk_weight" you can tune:
    fatality-site / nullah  -> 1.0  (confirmed severe/lethal event)
    hotspot / underpass     -> 0.8  (chronic recurring waterlogging)
    tree-fall                -> 0.3  (weather-related but not primarily flood risk)

NOTE: Nominatim geocoding is approximate (it resolves to the locality/
landmark centroid, not a precise flood extent polygon). For a handful of
key spots, verify the pin manually against Google Maps before shipping to
production -- especially the underpasses (Loha Pul, Narendra Nagar
Underpass) where the exact flood point is a specific road segment, not
the whole locality.
"""

import csv
import json
import time
import sys
import requests

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
HEADERS = {"User-Agent": "nagpur-flood-risk-map/1.0 (personal civic project)"}

RISK_WEIGHTS = {
    "fatality-site": 1.0,
    "nullah": 1.0,
    "hotspot": 0.8,
    "underpass": 0.8,
    "lowlying": 0.7,
    "tree-fall": 0.3,
}

def geocode(place_name):
    """Query Nominatim for a place, biased to Nagpur, Maharashtra, India."""
    params = {
        "q": f"{place_name}, Nagpur, Maharashtra, India",
        "format": "json",
        "limit": 1,
    }
    resp = requests.get(NOMINATIM_URL, params=params, headers=HEADERS, timeout=15)
    resp.raise_for_status()
    results = resp.json()
    if not results:
        return None
    return float(results[0]["lat"]), float(results[0]["lon"])


def main():
    features = []
    skipped = []

    with open("hotspots_seed.csv", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    for i, row in enumerate(rows):
        name = row["name"]
        print(f"[{i+1}/{len(rows)}] Geocoding: {name} ...", file=sys.stderr)
        try:
            coords = geocode(name)
        except requests.RequestException as e:
            print(f"  ! request failed: {e}", file=sys.stderr)
            coords = None

        if coords is None:
            skipped.append(name)
            time.sleep(1)
            continue

        lat, lon = coords
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lon, lat]},
            "properties": {
                "name": name,
                "category": row["category"],
                "note": row["note"],
                "source": row["source"],
                "risk_weight": RISK_WEIGHTS.get(row["category"], 0.5),
            },
        })

        time.sleep(1)  # Nominatim usage policy: max 1 req/sec

    geojson = {"type": "FeatureCollection", "features": features}

    with open("nagpur_hotspots.geojson", "w", encoding="utf-8") as f:
        json.dump(geojson, f, indent=2)

    print(f"\nDone. Geocoded {len(features)}/{len(rows)} locations.", file=sys.stderr)
    if skipped:
        print(f"Could not geocode (add manually): {skipped}", file=sys.stderr)


if __name__ == "__main__":
    main()
