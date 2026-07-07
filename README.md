# Opay-Scholars

Interactive map of **OPay Scholars 2026** application reach across Nigeria — weekly growth, geographic spread, and a guided story mode.

**Live app:** deploy from `reach-explorer/` on [Vercel](https://vercel.com) (see below).

## Repository layout

| Path | Purpose |
|------|---------|
| `reach-explorer/` | React + deck.gl + MapLibre frontend (Vercel deploy root) |
| `geo/` | Python pipeline that builds `reach.json` from the Excel responses file |
| `scripts/` | One-shot build script for data + frontend |
| `week5_aggregate.py` | Partner list & name canonicalization used by the geo pipeline |

## Run locally

```bash
# Frontend only (uses committed reach.json)
cd reach-explorer
npm install
npm run dev
```

Open http://localhost:5173

### Rebuild data from Excel

Place `OPay Scholars Innovation Application Form (Responses).xlsx` in the repo root (gitignored — contains applicant PII), then:

```bash
source /path/to/venv/bin/activate
pip install pandas openpyxl
python geo/build_reach_data.py
python geo/validate_reach_data.py
```

Or use the full script:

```bash
./scripts/build_explorer.sh
```

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import the project in [Vercel](https://vercel.com/new).
3. Set **Root Directory** to `reach-explorer`.
4. Framework preset: **Vite** (defaults: `npm run build`, output `dist`).
5. Deploy — no environment variables required.

The app is a static SPA; `reach.json` and GeoJSON ship from `reach-explorer/public/`.

## Tests

```bash
cd reach-explorer
npm run test:e2e
```

## Data source

Figures in the UI come from the Excel application responses file, aggregated by `geo/build_reach_data.py`. The committed `reach.json` is the deployable snapshot (2,293 applications; 1,911 mapped to states on the map).
