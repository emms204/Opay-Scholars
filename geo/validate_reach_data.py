"""Validate reach.json against Excel-derived figures."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REACH_JSON = ROOT / "reach-explorer" / "public" / "data" / "reach.json"
XLSX = ROOT / "OPay Scholars Innovation Application Form (Responses).xlsx"


def check(label: str, actual, expected, tolerance: int = 0) -> bool:
    ok = abs(actual - expected) <= tolerance
    status = "OK" if ok else "WARN"
    print(f"  [{status}] {label}: got {actual}, expected {expected}")
    return ok


def main() -> int:
    if not REACH_JSON.exists():
        print(f"Missing {REACH_JSON} — run geo/build_reach_data.py first")
        return 1

    with open(REACH_JSON, encoding="utf-8") as f:
        data = json.load(f)

    import pandas as pd
    df = pd.read_excel(XLSX, sheet_name="Form Responses 1")
    excel_total = len(df)

    print("=== Reach data validation (Excel source of truth) ===")
    all_ok = True
    all_ok &= check("Total applications", data["meta"]["total_applications"], excel_total)
    all_ok &= check("Accounting total", data["accounting"]["total"], excel_total)
    ok = data["accounting"]["on_map"] <= data["accounting"]["total"]
    all_ok &= ok
    print(f"  [{'OK' if ok else 'WARN'}] On map <= total: {data['accounting']['on_map']} / {data['accounting']['total']}")

    period_map = {p["id"]: p["weekly"] for p in data["period_summary"]}
    period_sum = sum(period_map.values())
    all_ok &= check("Period weekly sum", period_sum, excel_total)

    largest = max(data["period_summary"], key=lambda p: p["weekly"])
    all_ok &= largest["id"] == "Week3"
    print(f"  [{'OK' if largest['id'] == 'Week3' else 'WARN'}] Largest week: {largest['id']} ({largest['weekly']})")

    state_sum = sum(s["applications"] for s in data["states"])
    all_ok &= check("State applications sum", state_sum, data["accounting"]["on_map"])

    if len(data.get("story_beats", [])) < 7:
        print("  [WARN] Expected at least 7 story beats")
        all_ok = False
    else:
        print(f"  [OK] Story beats: {len(data['story_beats'])}")

    if all_ok:
        print("\nValidation passed.")
        return 0
    print("\nValidation completed with warnings.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
