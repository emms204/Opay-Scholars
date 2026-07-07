"""Compute map label anchor points from Nigeria state GeoJSON."""
from __future__ import annotations

import json
from pathlib import Path

from shapely.geometry import shape

ROOT = Path(__file__).resolve().parent.parent
GEO = ROOT / "reach-explorer" / "public" / "geo" / "nigeria-states.geojson"
LOOKUP = Path(__file__).resolve().parent / "state_zone_lookup.json"
OUT = ROOT / "reach-explorer" / "public" / "data" / "state_label_anchors.json"

# Label-optimal overrides for elongated / dense states (lng, lat)
OVERRIDES: dict[str, list[float]] = {
    "Borno": [13.15, 11.85],
    "Adamawa": [12.45, 9.35],
    "Taraba": [10.55, 8.25],
    "Yobe": [11.75, 12.0],
    "Bayelsa": [6.2, 4.95],
    "Rivers": [6.75, 5.15],
    "Delta": [5.85, 5.55],
    "Abia": [7.45, 5.55],
    "Imo": [7.15, 5.65],
    "Anambra": [6.95, 6.15],
    "Enugu": [7.35, 6.55],
    "Ebonyi": [8.05, 6.25],
    "Cross River": [8.45, 5.95],
    "Akwa Ibom": [7.85, 5.05],
    "Edo": [5.95, 6.75],
    "Lagos": [3.55, 6.45],
    "Ogun": [3.55, 7.05],
    "Niger": [5.55, 9.85],
    "Kwara": [4.85, 8.55],
}


def main() -> None:
    geo = json.loads(GEO.read_text())
    lookup = json.loads(LOOKUP.read_text())
    aliases = lookup.get("geojson_name_aliases", {})
    anchors: dict[str, dict[str, float]] = {}

    for feat in geo["features"]:
        raw = feat["properties"].get("name") or feat["properties"].get("STATE_NAME", "")
        name = aliases.get(raw, raw)
        if name not in lookup["states"]:
            continue
        if name in OVERRIDES:
            lng, lat = OVERRIDES[name]
        else:
            pt = shape(feat["geometry"]).representative_point()
            lng, lat = round(pt.x, 4), round(pt.y, 4)
        anchors[name] = {"lng": lng, "lat": lat}

    OUT.write_text(json.dumps(anchors, indent=2) + "\n")
    print(f"Wrote {len(anchors)} state label anchors → {OUT}")


if __name__ == "__main__":
    main()
