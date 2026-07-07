"""Build reach.json for the Nigeria Innovation Reach Explorer."""
from __future__ import annotations

import json
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from week5_aggregate import PARTNERS, canon  # noqa: E402

XLSX = ROOT / "OPay Scholars Innovation Application Form (Responses).xlsx"
GEO_DIR = Path(__file__).resolve().parent
OUT_JSON = ROOT / "reach-explorer" / "public" / "data" / "reach.json"
REGISTRY_CSV = GEO_DIR / "institution_registry.csv"

PERIODS = ["Week1", "Week2", "Week3", "Week4", "Week5", "FinalDays"]
PERIOD_RANGES = {
    "Week1": (pd.Timestamp("2026-05-25").date(), pd.Timestamp("2026-06-01").date()),
    "Week2": (pd.Timestamp("2026-06-02").date(), pd.Timestamp("2026-06-08").date()),
    "Week3": (pd.Timestamp("2026-06-09").date(), pd.Timestamp("2026-06-15").date()),
    "Week4": (pd.Timestamp("2026-06-16").date(), pd.Timestamp("2026-06-22").date()),
    "Week5": (pd.Timestamp("2026-06-23").date(), pd.Timestamp("2026-06-29").date()),
    "FinalDays": (pd.Timestamp("2026-06-30").date(), pd.Timestamp("2026-07-03").date()),
}

ONLINE_SCHOOLS = {
    "National Open University of Nigeria",
    "Miva Open University",
}

# Partner + major school coordinates (campus/city approx)
SCHOOL_GEO: dict[str, dict] = {
    "Ahmadu Bello University": {"state": "Kaduna", "lat": 11.131, "lng": 7.647, "confidence": "exact"},
    "Alex Ekwueme FU Ndufu Alike (AE-FUNAI)": {"state": "Ebonyi", "lat": 6.264, "lng": 8.087, "confidence": "exact"},
    "Ambrose Alli University": {"state": "Edo", "lat": 6.705, "lng": 6.338, "confidence": "exact"},
    "Bayero University Kano": {"state": "Kano", "lat": 11.995, "lng": 8.429, "confidence": "exact"},
    "Benue State Polytechnic, Ugbokolo": {"state": "Benue", "lat": 7.083, "lng": 7.650, "confidence": "city"},
    "Benue State University (MOAU Makurdi)": {"state": "Benue", "lat": 7.732, "lng": 8.539, "confidence": "exact"},
    "Federal Polytechnic Nekede": {"state": "Imo", "lat": 5.389, "lng": 7.075, "confidence": "exact"},
    "Federal University of Health Sciences Azare": {"state": "Bauchi", "lat": 11.676, "lng": 10.191, "confidence": "exact"},
    "Federal University of Technology, Minna": {"state": "Niger", "lat": 9.615, "lng": 6.547, "confidence": "exact"},
    "Kogi State Polytechnic": {"state": "Kogi", "lat": 7.802, "lng": 6.733, "confidence": "city"},
    "Kwara State University": {"state": "Kwara", "lat": 8.966, "lng": 4.667, "confidence": "exact"},
    "Lagos State University": {"state": "Lagos", "lat": 6.515, "lng": 3.389, "confidence": "exact"},
    "Montgomery Polytechnic, Ikere-Ekiti": {"state": "Ekiti", "lat": 7.498, "lng": 5.227, "confidence": "city"},
    "Nasarawa State University": {"state": "Nasarawa", "lat": 8.847, "lng": 7.873, "confidence": "exact"},
    "Obafemi Awolowo University": {"state": "Osun", "lat": 7.524, "lng": 4.520, "confidence": "exact"},
    "Olabisi Onabanjo University": {"state": "Ogun", "lat": 6.816, "lng": 3.911, "confidence": "exact"},
    "University of Abuja": {"state": "Abuja (FCT)", "lat": 8.893, "lng": 7.393, "confidence": "exact"},
    "University of Calabar": {"state": "Cross River", "lat": 4.958, "lng": 8.341, "confidence": "exact"},
    "University of Ibadan": {"state": "Oyo", "lat": 7.444, "lng": 3.899, "confidence": "exact"},
    "University of Ilorin": {"state": "Kwara", "lat": 8.479, "lng": 4.542, "confidence": "exact"},
    "University of Jos": {"state": "Plateau", "lat": 9.896, "lng": 8.858, "confidence": "exact"},
    "University of Maiduguri": {"state": "Borno", "lat": 11.833, "lng": 13.157, "confidence": "exact"},
    "University of Nigeria, Nsukka": {"state": "Enugu", "lat": 6.856, "lng": 7.395, "confidence": "exact"},
    "University of Uyo": {"state": "Akwa Ibom", "lat": 5.051, "lng": 7.933, "confidence": "exact"},
    "University of Lagos": {"state": "Lagos", "lat": 6.515, "lng": 3.390, "confidence": "exact"},
    "Federal University of Technology, Akure": {"state": "Ondo", "lat": 7.305, "lng": 5.140, "confidence": "exact"},
    "University of Benin": {"state": "Edo", "lat": 6.238, "lng": 5.194, "confidence": "exact"},
    "Federal University of Technology, Owerri": {"state": "Imo", "lat": 5.493, "lng": 7.026, "confidence": "exact"},
    "Nnamdi Azikiwe University, Awka": {"state": "Anambra", "lat": 6.210, "lng": 7.067, "confidence": "exact"},
    "Federal University of Agriculture, Abeokuta": {"state": "Ogun", "lat": 7.213, "lng": 3.446, "confidence": "exact"},
    "Kwara State Polytechnic, Ilorin": {"state": "Kwara", "lat": 8.479, "lng": 4.542, "confidence": "city"},
    "Lagos State University of Science & Technology": {"state": "Lagos", "lat": 6.648, "lng": 3.632, "confidence": "city"},
    "National Open University of Nigeria": {"state": "Online", "lat": 0, "lng": 0, "confidence": "online"},
    "Miva Open University": {"state": "Online", "lat": 0, "lng": 0, "confidence": "online"},
    "Federal University Dutsin-Ma": {"state": "Katsina", "lat": 12.454, "lng": 7.497, "confidence": "exact"},
    "Covenant University": {"state": "Ogun", "lat": 6.671, "lng": 3.174, "confidence": "exact"},
    "Babcock University": {"state": "Ogun", "lat": 6.772, "lng": 3.716, "confidence": "exact"},
    "University of Port Harcourt": {"state": "Rivers", "lat": 4.902, "lng": 6.926, "confidence": "exact"},
    "Kaduna State University": {"state": "Kaduna", "lat": 10.510, "lng": 7.438, "confidence": "exact"},
    "Yobe State University": {"state": "Yobe", "lat": 11.748, "lng": 11.966, "confidence": "exact"},
    "Sokoto State University": {"state": "Sokoto", "lat": 13.062, "lng": 5.240, "confidence": "exact"},
    "Taraba State University, Jalingo": {"state": "Taraba", "lat": 8.894, "lng": 11.360, "confidence": "exact"},
    "Umaru Musa Yar'adua University, Katsina": {"state": "Katsina", "lat": 12.990, "lng": 7.622, "confidence": "exact"},
    "Heritage Polytechnic": {"state": "Akwa Ibom", "lat": 4.950, "lng": 7.850, "confidence": "city"},
    "Federal Polytechnic Nasarawa": {"state": "Nasarawa", "lat": 8.538, "lng": 8.847, "confidence": "city"},
    "Ladoke Akintola University of Technology": {"state": "Oyo", "lat": 7.847, "lng": 4.560, "confidence": "exact"},
    "Osun State University": {"state": "Osun", "lat": 7.771, "lng": 4.567, "confidence": "exact"},
    "Usmanu Danfodiyo University Sokoto": {"state": "Sokoto", "lat": 13.062, "lng": 5.240, "confidence": "exact"},
    "Abubakar Tafawa Balewa University": {"state": "Bauchi", "lat": 10.315, "lng": 9.820, "confidence": "exact"},
    "Thomas Adewumi University": {"state": "Kwara", "lat": 8.130, "lng": 4.840, "confidence": "city"},
    "Northwest University Kano": {"state": "Kano", "lat": 11.991, "lng": 8.524, "confidence": "city"},
    "Michael Okpara University of Agriculture, Umudike": {"state": "Abia", "lat": 5.553, "lng": 7.367, "confidence": "exact"},
    "Veritas University Abuja": {"state": "Abuja (FCT)", "lat": 9.076, "lng": 7.398, "confidence": "city"},
    "Rivers State University": {"state": "Rivers", "lat": 4.815, "lng": 6.998, "confidence": "exact"},
    "Nigerian Army University Biu": {"state": "Borno", "lat": 10.612, "lng": 12.185, "confidence": "exact"},
}

STATE_KEYWORDS = [
    (r"\babia\b", "Abia"), (r"\babuja\b|\bfct\b", "Abuja (FCT)"), (r"\badamawa\b", "Adamawa"),
    (r"\bakwa ibom\b|\buat\b", "Akwa Ibom"), (r"\banambra\b|\bawka\b", "Anambra"),
    (r"\bbauchi\b|\batbu\b", "Bauchi"), (r"\bbayelsa\b", "Bayelsa"), (r"\bbenue\b|\bmakurdi\b", "Benue"),
    (r"\bborno\b|\bmaaiduguri\b|\bbi u\b", "Borno"), (r"\bcross river\b|\bcalabar\b|\bunical\b", "Cross River"),
    (r"\bdelta\b|\babraka\b|\basaba\b", "Delta"), (r"\bebonyi\b|\bafikpo\b|\babakaliki\b", "Ebonyi"),
    (r"\bedo\b|\bbenin\b|\buniben\b", "Edo"), (r"\bekiti\b|\bado-?ekiti\b|\bfuoye\b", "Ekiti"),
    (r"\benugu\b|\bunn\b|\bnsukka\b", "Enugu"), (r"\bgombe\b", "Gombe"), (r"\bimo\b|\bowerri\b|\bfuto\b", "Imo"),
    (r"\bjigawa\b|\bdutse\b", "Jigawa"), (r"\bkaduna\b|\babu\b|\bzaria\b", "Kaduna"),
    (r"\bkano\b|\bbuk\b|\bbayero\b", "Kano"), (r"\bkatsina\b|\bdutsin", "Katsina"),
    (r"\bkebbi\b|\bbirnin kebbi\b", "Kebbi"), (r"\bkogi\b|\blokoja\b", "Kogi"),
    (r"\bkwara\b|\bilorin\b|\bunilorin\b", "Kwara"), (r"\blagos\b|\bunilag\b|\blasu\b", "Lagos"),
    (r"\bnasarawa\b|\bkeffi\b|\blafia\b", "Nasarawa"), (r"\bniger\b|\bminna\b|\bfutminna\b", "Niger"),
    (r"\bogun\b|\babeokuta\b|\bfunaab\b|\bsagamu\b", "Ogun"), (r"\bondo\b|\bakure\b|\bfuta\b", "Ondo"),
    (r"\bosun\b|\bile-?ife\b|\boau\b|\bif e\b", "Osun"), (r"\boyo\b|\bibadan\b|\bui\b", "Oyo"),
    (r"\bplateau\b|\bjos\b|\bunijos\b", "Plateau"), (r"\brivers\b|\bport harcourt\b|\buniport\b", "Rivers"),
    (r"\bsokoto\b|\budusok\b", "Sokoto"), (r"\btaraba\b|\bjalingo\b", "Taraba"),
    (r"\byobe\b|\bdamaturu\b", "Yobe"), (r"\bzamfara\b|\bgusau\b", "Zamfara"),
]


def load_state_lookup() -> dict:
    with open(GEO_DIR / "state_zone_lookup.json", encoding="utf-8") as f:
        return json.load(f)


def period_of(ts: pd.Timestamp) -> str | None:
    if pd.isna(ts):
        return None
    d = ts.date()
    for name, (start, end) in PERIOD_RANGES.items():
        if start <= d <= end:
            return name
    return None


def load_registry() -> dict[str, dict]:
    registry = {k: {**v, "zone": load_state_lookup()["states"].get(v["state"], {}).get("zone", "")}
                for k, v in SCHOOL_GEO.items()}
    if REGISTRY_CSV.exists():
        df = pd.read_csv(REGISTRY_CSV)
        lookup = load_state_lookup()
        for _, row in df.iterrows():
            name = str(row["canon_name"]).strip()
            state = str(row["state"]).strip()
            registry[name] = {
                "state": state,
                "zone": lookup["states"].get(state, {}).get("zone", ""),
                "lat": float(row["lat"]) if pd.notna(row.get("lat")) else 0,
                "lng": float(row.get("lng", 0)) if pd.notna(row.get("lng")) else 0,
                "confidence": str(row.get("location_confidence", "city")),
            }
    return registry


def infer_state(name: str) -> tuple[str | None, str]:
    if not name:
        return None, "unmapped"
    low = name.lower()
    for pat, state in STATE_KEYWORDS:
        if re.search(pat, low):
            return state, "inferred"
    return None, "unmapped"


def resolve_geo(canon_name: str | None, kind: str, registry: dict, lookup: dict) -> dict:
    if kind in ("invalid", "multi") or not canon_name:
        return {"bucket": "unclassified", "state": None, "zone": None, "lat": None, "lng": None, "confidence": "unmapped"}

    if canon_name in ONLINE_SCHOOLS or canon_name in registry and registry[canon_name].get("state") == "Online":
        return {"bucket": "online", "state": "Online", "zone": "Online", "lat": None, "lng": None, "confidence": "online"}

    if canon_name in registry:
        g = registry[canon_name]
        return {"bucket": "mapped", "state": g["state"], "zone": g.get("zone"), "lat": g["lat"], "lng": g["lng"], "confidence": g["confidence"]}

    state, conf = infer_state(canon_name)
    if state:
        centroid = lookup["states"][state]["centroid"]
        zone = lookup["states"][state]["zone"]
        return {"bucket": "mapped", "state": state, "zone": zone, "lat": centroid[1], "lng": centroid[0], "confidence": conf}

    return {"bucket": "unclassified", "state": None, "zone": None, "lat": None, "lng": None, "confidence": "unmapped"}


def empty_periods() -> dict[str, int]:
    return {p: 0 for p in PERIODS}


def periods_from_raw(raw: dict[str, int]) -> dict[str, dict[str, int]]:
    """Build weekly + cumulative buckets directly from Excel row counts."""
    cum = 0
    out: dict[str, dict[str, int]] = {}
    for p in PERIODS:
        weekly = int(raw.get(p, 0))
        cum += weekly
        out[p] = {"weekly": weekly, "cumulative": cum}
    return out


def build() -> dict:
    lookup = load_state_lookup()
    registry = load_registry()
    df = pd.read_excel(XLSX, sheet_name="Form Responses 1")
    df["Timestamp"] = pd.to_datetime(df["Timestamp"], errors="coerce")
    inst = df["Name of Institution"].astype(str).str.strip()
    other = df["If Other, please specify"].astype(str).str.strip()
    combined = inst.where(~inst.str.contains("Other", case=False, na=False), other)
    res = combined.apply(canon)
    df["canon"] = [r[0] for r in res]
    df["kind"] = [r[1] for r in res]
    df["period"] = df["Timestamp"].apply(period_of)

    total = len(df)
    state_counts: Counter = Counter()
    zone_counts: Counter = Counter()
    state_by_period: dict[str, dict[str, int]] = defaultdict(empty_periods)
    zone_by_period: dict[str, dict[str, int]] = defaultdict(empty_periods)
    school_counts: Counter = Counter()
    school_kind: dict[str, str] = {}
    school_by_period: dict[str, dict[str, int]] = defaultdict(empty_periods)
    school_geo: dict[str, dict] = {}
    period_totals: Counter = Counter()
    on_map = 0

    for _, row in df.iterrows():
        period = row["period"] or "FinalDays"
        period_totals[period] += 1
        geo = resolve_geo(row["canon"], row["kind"], registry, lookup)
        bucket = geo["bucket"]

        if bucket == "mapped":
            on_map += 1
            state = geo["state"]
            zone = geo["zone"]
            state_counts[state] += 1
            zone_counts[zone] += 1
            state_by_period[state][period] += 1
            zone_by_period[zone][period] += 1

        if row["canon"] and row["kind"] in ("partner", "nonpartner"):
            school_counts[row["canon"]] += 1
            school_kind[row["canon"]] = row["kind"]
            school_by_period[row["canon"]][period] += 1
            if row["canon"] not in school_geo and geo["bucket"] == "mapped":
                school_geo[row["canon"]] = geo

    states_out = []
    for state_name, meta in lookup["states"].items():
        apps = state_counts[state_name]
        bp = periods_from_raw(dict(state_by_period[state_name]))
        schools_in_state = sum(1 for s, g in school_geo.items() if g.get("state") == state_name)
        states_out.append({
            "id": state_name.lower().replace(" ", "_").replace("(", "").replace(")", ""),
            "name": state_name,
            "zone": meta["zone"],
            "centroid": {"lng": meta["centroid"][0], "lat": meta["centroid"][1]},
            "applications": apps,
            "share": round(apps / on_map * 100, 1) if on_map else 0,
            "by_period": bp,
            "schools_count": schools_in_state,
        })
    states_out.sort(key=lambda x: x["applications"], reverse=True)

    zones_out = []
    for zone_name, state_list in lookup["zones"].items():
        apps = sum(state_counts[s] for s in state_list)
        bp = periods_from_raw(dict(zone_by_period[zone_name]))
        zones_out.append({
            "id": zone_name.lower().replace(" ", "_"),
            "name": zone_name,
            "states": state_list,
            "applications": apps,
            "share": round(apps / on_map * 100, 1) if on_map else 0,
            "by_period": bp,
        })
    zones_out.sort(key=lambda x: x["applications"], reverse=True)

    schools_out = []
    for idx, (name, apps) in enumerate(school_counts.most_common()):
        geo = school_geo.get(name) or resolve_geo(name, school_kind.get(name, "nonpartner"), registry, lookup)
        bp = dict(school_by_period[name])
        cum = 0
        by_period_cum = {}
        for p in PERIODS:
            cum += bp.get(p, 0)
            by_period_cum[p] = {"weekly": bp.get(p, 0), "cumulative": cum}
        schools_out.append({
            "id": f"school_{idx}",
            "name": name,
            "state": geo.get("state"),
            "zone": geo.get("zone"),
            "lat": geo.get("lat"),
            "lng": geo.get("lng"),
            "kind": school_kind.get(name, "nonpartner"),
            "applications": apps,
            "share": round(apps / total * 100, 1) if total else 0,
            "by_period": by_period_cum,
            "confidence": geo.get("confidence", "unmapped"),
            "on_map": geo.get("bucket") == "mapped" and geo.get("lat") is not None,
        })

    period_summary = []
    cum = 0
    reached_states: set[str] = set()
    for p in PERIODS:
        w = int(period_totals.get(p, 0))
        cum += w
        active_states = {
            s["name"] for s in states_out
            if s["by_period"][p]["weekly"] > 0
        }
        cumulative_states = {
            s["name"] for s in states_out
            if s["by_period"][p]["cumulative"] > 0
        }
        new_states = cumulative_states - reached_states
        reached_states = cumulative_states
        active_schools = {
            s["id"] for s in schools_out
            if s["on_map"] and s["by_period"][p]["weekly"] > 0
        }
        mapped_weekly = sum(s["by_period"][p]["weekly"] for s in states_out)
        period_summary.append({
            "id": p,
            "weekly": w,
            "cumulative": cum,
            "mapped_weekly": mapped_weekly,
            "states_active": len(active_states),
            "states_reached": len(cumulative_states),
            "states_new": len(new_states),
            "institutions_active": len(active_schools),
        })

    week1_reached = next(r["states_reached"] for r in period_summary if r["id"] == "Week1")
    week2_new = next(r["states_new"] for r in period_summary if r["id"] == "Week2")
    week3_weekly = next(r["weekly"] for r in period_summary if r["id"] == "Week3")
    institution_count = len(school_counts)
    lagos = next(s for s in states_out if s["name"] == "Lagos")

    story_beats = [
        {
            "id": "total",
            "text": f"{total:,} teams applied across Nigeria during the 40-day campaign window.",
            "duration_ms": 7000,
            "camera": {"center": [8.675, 9.082], "zoom": 5.0, "pitch": 0},
            "layer": "states",
            "period_index": 5,
            "time_mode": "cumulative",
        },
        {
            "id": "week1_spread",
            "text": f"Week 1: {week1_reached} of 37 states lit up within the first seven days.",
            "duration_ms": 8000,
            "camera": {"center": [8.675, 9.082], "zoom": 5.1, "pitch": 35},
            "layer": "states",
            "period_index": 0,
            "time_mode": "cumulative",
        },
        {
            "id": "week2_coverage",
            "text": f"Week 2: the final {week2_new} states joined — full national coverage on the map.",
            "duration_ms": 7000,
            "camera": {"center": [8.675, 9.082], "zoom": 5.2, "pitch": 40},
            "layer": "states",
            "period_index": 1,
            "time_mode": "cumulative",
        },
        {
            "id": "week3_surge",
            "text": f"Week 3: the largest surge — {week3_weekly:,} applications in seven days.",
            "duration_ms": 9000,
            "camera": {"center": [8.675, 9.082], "zoom": 5.2, "pitch": 45},
            "layer": "states",
            "period_index": 2,
            "time_mode": "weekly",
            "playing": True,
        },
        {
            "id": "lagos_dominance",
            "text": f"Lagos led the campaign with {lagos['applications']:,} mapped applications — South-West became the volume centre.",
            "duration_ms": 8000,
            "camera": {"center": [3.4, 6.5], "zoom": 7.2, "pitch": 50},
            "layer": "states",
            "period_index": 2,
            "time_mode": "cumulative",
        },
        {
            "id": "institutions",
            "text": f"{institution_count:,} institutions participated — school points cluster around innovation hubs.",
            "duration_ms": 8000,
            "camera": {"center": [3.45, 6.55], "zoom": 8.5, "pitch": 55},
            "layer": "schools",
            "period_index": 2,
            "time_mode": "weekly",
        },
        {
            "id": "final_push",
            "text": "Final days: a last push before close — every state and the FCT represented on the map.",
            "duration_ms": 8000,
            "camera": {"center": [8.675, 9.082], "zoom": 5.0, "pitch": 35},
            "layer": "states",
            "period_index": 5,
            "time_mode": "weekly",
            "on_exit": {"app_mode": "explore", "period_index": 5, "time_mode": "cumulative"},
        },
    ]

    return {
        "meta": {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "total_applications": total,
            "on_map_applications": on_map,
            "data_through": str(df["Timestamp"].max().date()) if len(df) else None,
            "source": "OPay Scholars Innovation Application Form (Responses).xlsx",
        },
        "accounting": {
            "total": total,
            "on_map": on_map,
        },
        "periods": PERIODS,
        "period_summary": period_summary,
        "states": states_out,
        "zones": zones_out,
        "schools": schools_out,
        "story_beats": story_beats,
    }


def export_registry_template(data: dict, registry: dict) -> None:
    """Write institution_registry.csv from mapped schools not yet in CSV."""
    existing = set(registry.keys())
    rows = []
    for s in data["schools"]:
        if s["on_map"] and s["name"] not in existing:
            rows.append({
                "canon_name": s["name"],
                "state": s["state"],
                "zone": s["zone"],
                "lat": s["lat"],
                "lng": s["lng"],
                "location_confidence": s["confidence"],
            })
    if rows and not REGISTRY_CSV.exists():
        pd.DataFrame(rows).to_csv(REGISTRY_CSV, index=False)


def main() -> None:
    data = build()
    registry = load_registry()
    export_registry_template(data, registry)
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    print(f"Saved: {OUT_JSON}")
    print(f"Accounting: {data['accounting']}")
    print(f"On map: {data['meta']['on_map_applications']}")
    print(f"Top states: {[(s['name'], s['applications']) for s in data['states'][:5]]}")


if __name__ == "__main__":
    main()
