# WRI Aqueduct 4.0 — provenance

Source: World Resources Institute, Aqueduct 4.0 (Country
Rankings Download)
URL: https://www.wri.org/data/aqueduct-40-country-rankings
Repository: https://github.com/wri/Aqueduct40
License: CC-BY 4.0
Maintainer: World Resources Institute

Files in this directory:

- `Aqueduct40_rankings_download_Y2023M07D05.xlsx` — the
  Aqueduct 4.0 country and province rankings download. Five
  sheets: Read Me, country_baseline (2,456 rows),
  country_future (8,856 rows), province_baseline (42,771 rows),
  province_future (161,730 rows). Filename suffix Y2023M07D05
  is the publication date (5 July 2023) of the 4.0 release.

Access date: 28 April 2026
Access method: direct XLSX download from the WRI rankings page
Preprocessing applied at ingestion: none

Notes:

- The project uses `country_baseline` and `province_baseline`
  sheets, filtered to `indicator_name == "bws"` and
  `weight == "Tot"`. Other indicator families (`rfr` for
  riverine flood risk, `drr` for drought risk) and weighting
  schemes (`Dom`, `Ind`, `Ag`, etc.) are present in the file
  but not used in v1.
- Singapore returns sentinel value -9999 in the `bws` indicator
  because Aqueduct's hydrological-basin methodology does not
  produce a clean baseline-water-stress score for city-states
  without an agricultural watershed. Documented as a known
  limitation in the dataset rationale memo.
- Reading XLSX requires the openpyxl Python package
  (added to requirements.txt at integration time).
- Full data dictionary published at
  github.com/wri/Aqueduct40/blob/master/data_dictionary_water-risk-atlas.md
