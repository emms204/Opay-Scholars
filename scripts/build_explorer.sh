#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

source /opt/venv/global/bin/activate

echo "==> Building reach.json"
python geo/build_reach_data.py
python geo/validate_reach_data.py

echo "==> Generating Nigeria GeoJSON (if geopandas available)"
python geo/generate_geojson.py 2>/dev/null || echo "    (skipped — using existing geojson)"

echo "==> Building reach-explorer frontend"
cd reach-explorer
npm install
npm run build

echo "==> Done. Open reach-explorer/dist/index.html via a static server."
echo "    e.g.  cd reach-explorer/dist && python -m http.server 8080"
