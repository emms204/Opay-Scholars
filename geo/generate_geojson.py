"""Generate nigeria-states.geojson from Natural Earth admin boundaries."""
import json
from pathlib import Path

import geopandas as gpd

OUT = Path(__file__).resolve().parent.parent / "reach-explorer" / "public" / "geo" / "nigeria-states.geojson"
ALIASES = {
    "Federal Capital Territory": "Abuja (FCT)",
    "Abuja Federal Capital Territory": "Abuja (FCT)",
    "Nassarawa": "Nasarawa",
}


def main() -> None:
    url = "https://naciscdn.org/naturalearth/10m/cultural/ne_10m_admin_1_states_provinces.zip"
    gdf = gpd.read_file(url)
    nga = gdf[gdf["adm0_a3"] == "NGA"].copy()
    nga["name"] = nga["name"].apply(lambda n: ALIASES.get(n, n))
    out = nga[["name", "geometry"]]
    geojson = json.loads(out.to_json())
    for f in geojson["features"]:
        f["id"] = f["properties"]["name"].lower().replace(" ", "_").replace("(", "").replace(")", "")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(geojson, f)
    print(f"Saved {OUT} ({len(geojson['features'])} features)")


if __name__ == "__main__":
    main()
