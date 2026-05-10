# Thirsty Machines

What does it actually cost the planet when you press send on an AI prompt — and where does that cost land?

A data visualisation project tracing the per-query environmental footprint of large language model inference across energy, water, and carbon, and locating that footprint geographically across data centre regions, electricity grids, and water basins.

Built for the Data Visualisation 2026 course at LUISS Guido Carli, MSc Data Science and Management.

## Live site

The full project is published at **[thirsty-machines.vercel.app](https://thirsty-machines.vercel.app/)** — the interactive prompt-pipeline component, six embedded Tableau dashboards, and the white-hat / black-hat static pair, threaded together with explanatory prose and a findings section.

Direct anchors:

- Interactive prompt-pipeline component (C1): <https://thirsty-machines.vercel.app/#one-prompt>
- White-hat / black-hat static pair (C7): <https://thirsty-machines.vercel.app/#two-stories>

The C7 static pair is also committed as standalone PNGs at `web/assets/c7_white_hat.png` and `web/assets/c7_black_hat.png`. The C1 component has its own standalone view at `web/components/prompt-pipeline/index.html`.

## Tableau dashboards

- [Training compute trajectory](https://public.tableau.com/views/ThirstyMachinesTrainingcomputetrajectory/Trainingcomputetrajectory) — frontier AI models with disclosed training compute, plotted by publication date and FLOP.
- [Cloud region map](https://public.tableau.com/app/profile/eliya.allam/viz/ThirstyMachinesCloudregionmap/Cloudregionmap) — 37 AWS and Azure cloud regions with grid carbon intensity and water-stress overlays.
- [Model energy ranking](https://public.tableau.com/shared/Q884JPRJ3) — 66 LLM models ranked by per-query energy across short, medium, and long prompts.
- [Aggregate scaling](https://public.tableau.com/views/ThirstyMachinesAggregatescaling/AggregateScaling) — per-query energy, water, and carbon scaled to 1B / 50B / 100B prompts with everyday equivalences.
- [Efficiency vs query length](https://public.tableau.com/views/ThirstyMachinesEfficiencyvsquerylength/Efficiencyvsquerylength) — 12 representative models with per-query energy traced across short, medium, and long prompts to surface within-model scaling curves.
- [System map](https://public.tableau.com/views/ThirstyMachinesSystemmap/SystemMap) — Sankey trace of one query from per-query energy through Virginia's grid to emitted carbon.

All six Tableau dashboards are published.

## Repository structure

- `data/` — raw downloads (gitignored), processed outputs (gitignored), reference tables, and per-source provenance
- `docs/` — project brief, data feasibility memo, dataset rationale, repository standards
- `notebooks/` — Python notebooks for cleaning, integration, and exploratory analysis
- `report/` — five-page paper-style report and AI use appendix
- `src/` — Python modules factored out of notebooks for reuse
- `tableau/` — Tableau workbook files
- `web/` — assembled static site (`index.html`, `styles/`, `scripts/`), prompt-pipeline D3 component, and the C7 static figure assets

## Reproducing the analysis

To read the project, visit the [live site](https://thirsty-machines.vercel.app/) — it carries the same eight visual components and the connecting prose as a single narrative read-through. The steps below are for reproducing the analysis from raw data.

1. Clone this repository.
2. Create a Python virtual environment and install dependencies:

```bash
   python -m venv .venv
   source .venv/bin/activate    # on Windows: .venv\Scripts\activate
   pip install -r requirements.txt
```
3. Download the source datasets following the instructions in `docs/dataset-rationale.md`. Each `data/raw/<source>/` directory contains a `PROVENANCE.md` documenting the exact source URL, access date, and any required preprocessing.
4. Run the notebooks in `notebooks/` in numerical order.
5. The web component can be served locally with any static-file server pointed at `web/`.

## Data sources

This project integrates five primary public datasets, all under permissive licenses (CC-BY 4.0 or Open Database License). Full attribution and licensing details are documented in `docs/dataset-rationale.md`.

## License

The code and prose in this repository are released under the MIT License (see `LICENSE`). The data files redistributed in `data/raw/` retain their original licenses, documented per source in the corresponding `PROVENANCE.md` files.

## Authors

Eliya Allam and Mattia Cervelli, LUISS Guido Carli, MSc Data Science and Management, 2026.
