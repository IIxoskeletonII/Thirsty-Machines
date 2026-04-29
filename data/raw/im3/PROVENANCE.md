# IM3 Open Source Data Center Atlas — provenance

Source: Mongird, K., Thurber, T., Vernon, C., et al. (2026).
"IM3 Open Source Data Center Atlas." Pacific Northwest National
Laboratory.
URL: https://www.osti.gov/biblio/3017294
Version: February 2026 (filename suffix v2026_02_09)
License: Open Database License (ODbL)
Maintainer: Pacific Northwest National Laboratory (IM3 project)

Files in this directory:

- `im3_open_source_data_center_atlas_v2026_02_09.csv` —
  geocoded US data-centre facility atlas. 1,479 rows with
  columns id, state, state_abb, state_id, county, county_id,
  operator, ref, name, sqft, lon, lat, type. Coordinates in
  WGS84 (EPSG:4326). Three layer types: building (1,239
  rows), campus (135 rows), point (105 rows).

Access date: 28 April 2026
Access method: direct CSV download from the OSTI biblio page
Preprocessing applied at ingestion: none

Notes:

- Source data: OpenStreetMap, augmented with US Census 2024
  county boundaries.
- The dataset reports facility footprint in square feet (`sqft`)
  rather than electrical capacity in megawatts. The map
  visualisation encodes facility size as footprint accordingly.
- Operator attribution is sparse (~58% on the campus layer),
  but most unattributed major-hyperscaler facilities can be
  back-filled by parsing the `name` field. This back-fill is
  applied in the integration notebook.
- ODbL requires attribution to OpenStreetMap and IM3 in any
  derivative work that redistributes the data.
