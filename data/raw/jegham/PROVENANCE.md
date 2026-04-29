# Jegham — provenance

Source: Jegham et al., "How Hungry is AI? Benchmarking Energy,
Water, and Carbon Footprint of LLM Inference"
Paper URL: https://arxiv.org/abs/2505.09598 (current version v6,
24 November 2025)
Repository URL: https://github.com/Nidhal-Jegham/HowHungryisAIRepo
License: CC-BY 4.0
Maintainer: Nidhal Jegham et al.

Files in this directory:

Per-query benchmark inputs (per query length):

- `artificialanalysis_cleanshort.csv` — short-prompt benchmark
  data from Artificial Analysis (cleaned).
- `artificialanalysis_cleanmedium.csv` — medium-prompt benchmark
  data.
- `artificialanalysis_cleanlong.csv` — long-prompt benchmark
  data.

Per-query environmental footprint (the project spine):

- `DataSnapshotOct26.csv` — frozen paper-vintage snapshot dated
  26 October 2025. 194 rows covering 66 unique models across
  three query lengths (300, 1000, 1500 tokens) with mean and
  standard-deviation columns for energy (Wh), water (mL site &
  source), and carbon (gCO2e), plus pre-computed aggregates at
  1B, 50B, and 100B query scales.
- `artificialanalysis_environmental.csv` — current live snapshot
  (175 rows, 60 unique models, schema superset of the frozen
  snapshot).
- `Monthly_LLM_Environmental_Footprint.csv` — monthly aggregated
  footprint time series (233 rows, 79 unique models).

Hyperscaler infrastructure multipliers:

- `AWS_Env_Multipliers.csv` — AWS region-level PUE/WUE/CIF.
- `Microsoft_Env_Multipliers.csv` — Microsoft region-level
  PUE/WUE/CIF.

Access date: 28 April 2026
Access method: direct download from the upstream GitHub
repository (raw file URLs from
github.com/Nidhal-Jegham/HowHungryisAIRepo)
Preprocessing applied at ingestion: none

Notes:

- The Power BI dashboard linked from the paper is also a valid
  access path; the GitHub repository is preferred because it
  provides citable commit hashes and machine-readable CSVs
  without UI scraping.
- The AWS multipliers file has an unusual two-block layout: the
  default header row produces "Unnamed" columns, and the file
  is correctly read with `pd.read_csv(..., skiprows=1)`. This
  preprocessing is applied in the integration notebook, not at
  ingestion, so the file in this directory is the upstream
  original.
- Coverage spans seven major model providers (OpenAI, xAI,
  Google, DeepSeek, Anthropic, Meta, Mistral AI) hosted on six
  cloud providers (Azure, xAI, Google, DeepSeek, Anthropic,
  AWS).
- Upstream is updated daily; files in this directory are
  point-in-time snapshots aligned to the access date above.
