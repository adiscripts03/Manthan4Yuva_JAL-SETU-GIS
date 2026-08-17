"""
fetch_drainage_osm.py

Pulls Nagpur's real surface drainage network -- rivers (Nag, Pili, Pohra)
and mapped nallahs/drains -- from OpenStreetMap via the Overpass API.

This is real, crowdsourced-but-verifiable geometry, not synthetic data.
Coverage of minor nallahs in OSM varies (some stretches are well-mapped,
some aren't mapped at all) -- treat gaps in the output as "not yet mapped
in OSM", not "no drain exists there". Cross-check visually against
satellite imagery for anything mission-critical.

IMPORTANT: This script needs internet access to run (it wasn't run inside
the sandbox that generated it -- run it on your own machine).

Usage:
    pip install requests
    python fetch_drainage_osm.py

Output:
    nagpur_drainage.geojson   (LineString features: rivers + nallahs)
"""

import json
import requests

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# Bounding box roughly covering Nagpur city + immediate surrounds
# (south, west, north, east)
BBOX = "21.02,78.95,21.25,79.20"

QUERY = f"""
[out:json][timeout:60];
(
  way["waterway"~"river|stream|canal|drain|ditch"]({BBOX});
  relation["waterway"="river"]({BBOX});
);
out geom;
"""

def fetch():
    headers = {"User-Agent": "nagpur-flood-risk-map-fetch/1.0 (personal civic project)"}
    resp = requests.post(OVERPASS_URL, data={"data": QUERY}, headers=headers, timeout=90)
    resp.raise_for_status()
    return resp.json()


def to_geojson(osm_data):
    features = []
    for el in osm_data.get("elements", []):
        if el["type"] != "way" or "geometry" not in el:
            continue
        coords = [[pt["lon"], pt["lat"]] for pt in el["geometry"]]
        tags = el.get("tags", {})
        features.append({
            "type": "Feature",
            "geometry": {"type": "LineString", "coordinates": coords},
            "properties": {
                "osm_id": el["id"],
                "name": tags.get("name", "unnamed"),
                "waterway_type": tags.get("waterway", "unknown"),
                "intermittent": tags.get("intermittent", "no"),
            },
        })
    return {"type": "FeatureCollection", "features": features}


def main():
    print("Querying Overpass API for Nagpur waterways... (can take ~30-60s)")
    osm_data = fetch()
    geojson = to_geojson(osm_data)

    with open("nagpur_drainage.geojson", "w", encoding="utf-8") as f:
        json.dump(geojson, f, indent=2)

    named = [f for f in geojson["features"] if f["properties"]["name"] != "unnamed"]
    print(f"Done. {len(geojson['features'])} waterway segments total "
          f"({len(named)} named, rest are unnamed minor drains).")
    print("Saved to nagpur_drainage.geojson")


if __name__ == "__main__":
    main()
