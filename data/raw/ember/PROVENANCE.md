# Ember — provenance

Source: Ember (Yearly Electricity Data and US Electricity Data)
URL: https://ember-energy.org/data/
License: CC-BY 4.0
Maintainer: Ember (energy think tank)

Files in this directory:

- `ember_yearly.csv` — yearly global electricity data in long
  format (228 countries, multiple variables including
  `CO2 intensity` in `gCO2/kWh`).
- `ember_us_states.csv` — US state-level electricity data in
  long format (50 states plus DC, same `CO2 intensity` variable).

Access date: 28 April 2026
Access method: direct CSV download from ember-energy.org/data
Preprocessing applied at ingestion: none

Notes:

- Latest year of coverage in both files: 2025.
- Updated twice monthly upstream; files in this directory are
  point-in-time snapshots.
- The yearly file uses `Area` and `ISO 3 code` for country
  identification; the US states file uses `State` and `State
  code`. Reconciliation handled in the integration notebook.
- Mirror: Our World in Data publishes a cleaned bundle at
  github.com/owid/energy-data as a fallback access path.
