"""Clip Toronto Open Data 3D Massing to St. George campus.

Usage:
  pip install pyshp
  curl -L -o massing.zip "https://ckan0.cf.opendata.inter.prod-toronto.ca/dataset/387b2e3b-2a76-4199-8b3b-0b7d22e2ec10/resource/667237d6-4d3c-4cf3-8cb7-e91c48d59375/download/3dmassingshapefile_2025_wgs84.zip"
  unzip massing.zip -d massing
  python scripts/clip-massing.py massing/3DMassingShapefile_2025_WGS84.shp public/data/massing-stgeorge.geojson

Despite the file name, geometry is EPSG:3857 (Web Mercator), so it is converted here.
Some "Site Plan" footprints (Bahen's main block, for one) have no height. They inherit the tallest
LiDAR part whose centroid falls inside them, or DEFAULT_HEIGHT.
"""
import json
import math
import sys

import shapefile

BBOX = (-79.4035, 43.6565, -79.3895, 43.6680)  # lng/lat, St. George core
R = 6378137.0
DEFAULT_HEIGHT = 12.0


def to_lnglat(x, y):
    lng = math.degrees(x / R)
    lat = math.degrees(2 * math.atan(math.exp(y / R)) - math.pi / 2)
    return [round(lng, 6), round(lat, 6)]


def point_in_ring(x, y, ring):
    inside = False
    for (x1, y1), (x2, y2) in zip(ring, ring[1:]):
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            inside = not inside
    return inside


def ring_area_m2(ring):
    a = sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(ring, ring[1:]))
    return abs(a) / 2


def main(src, dst):
    reader = shapefile.Reader(src)
    fields = [f[0] for f in reader.fields[1:]]
    parts = []  # (ring_xy, height, centroid_xy)
    for rec in reader.iterShapeRecords():
        props = dict(zip(fields, rec.record))
        lng, lat = props["LONGITUDE"], props["LATITUDE"]
        if not (BBOX[0] <= lng <= BBOX[2] and BBOX[1] <= lat <= BBOX[3]):
            continue
        shape = rec.shape
        ends = list(shape.parts) + [len(shape.points)]
        ring = [tuple(p) for p in shape.points[ends[0]:ends[1]]]  # outer ring only
        if len(ring) < 4 or ring_area_m2(ring) < 30:
            continue
        cx = sum(x for x, _ in ring) / len(ring)
        cy = sum(y for _, y in ring) / len(ring)
        parts.append((ring, float(props["MAX_HEIGHT"] or 0), (cx, cy)))

    measured = [p for p in parts if p[1] >= 3]
    features = []
    for ring, height, _ in parts:
        if height < 3:
            inner = [h for r, h, (cx, cy) in measured if point_in_ring(cx, cy, ring)]
            height = max(inner, default=DEFAULT_HEIGHT)
        features.append({
            "type": "Feature",
            "properties": {"height": round(height, 1)},
            "geometry": {"type": "Polygon", "coordinates": [[to_lnglat(x, y) for x, y in ring]]},
        })
    with open(dst, "w") as f:
        json.dump({"type": "FeatureCollection", "features": features}, f, separators=(",", ":"))
    print(f"wrote {len(features)} footprints to {dst}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
