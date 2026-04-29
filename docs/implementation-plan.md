# Thirsty Machines — Implementation Plan

**Project:** Thirsty Machines
**Document version:** 1.1 — 29 April 2026
**Status:** Active. Subject to revision; see revision history at end.

## 1. Purpose and scope

This document sequences the work that turns the project's planning artefacts into the final submitted deliverable. It is a working plan, not a strategic document — the project brief sets the *what* and the *why*; the dataset rationale memo and the feasibility memo justify the data choices; the repository standards document fixes the conventions; this plan covers the *how* and the *in what order*.

It exists because a flat task list ("requirements.txt, ingestion notebook, integration notebook…") does not encode prerequisites, verification steps, or commit boundaries, and a project executed against a flat task list will repeatedly stumble on dependencies that should have been visible in advance. The plan covers six phases from environment setup through final submission, mapped against the eleven days remaining between today and the deadline.

The plan is intended to be re-read at the start of each phase. Material deviations from it are recorded in the revision history at the end of the document, in the same way the project brief was bumped from v1.0 to v1.1 after the data feasibility spike.

## 2. Phases

### Phase 0 — Environment setup

**Prerequisites.** Repository bootstrap complete (done, eight commits in). Python 3.11 installed and discoverable via the Windows `py` launcher (verified 29 April). `.venv/` already gitignored.

**Deliverables.** A virtual environment at `.venv/` in the repository root, pinned to Python 3.11. A pinned `requirements.txt` at the repository root. The venv registered as a Jupyter kernel discoverable from the local notebook environment. A working notebook that opens against the right kernel and successfully imports the project's dependencies.

**Sequence.**
1. Create the virtual environment with `py -3.11 -m venv .venv` from the repository root.
2. Confirm `.venv\Scripts\python.exe` exists at the expected path.
3. Activate the environment and confirm the active interpreter resolves inside `.venv\Scripts\` before installing anything.
4. Create `requirements.txt` with the six pinned dependencies (pandas, numpy, openpyxl, matplotlib, seaborn, jupyter).
5. Install dependencies into the activated environment.
6. Register the venv as a Jupyter kernel under a project-specific name.
7. Open a throwaway notebook against the new kernel and run a single cell importing all six dependencies, confirming no errors.

**Verification.** `python --version` from inside the activated venv returns 3.11.x. `python -m pip list` returns the six pinned dependencies at the exact versions specified. The Jupyter kernel picker shows the project kernel and a notebook opened against it imports pandas without ImportError.

**Commit boundaries.** One commit at the end of the phase containing only `requirements.txt`. The venv directory and the kernel registration are not committed (the venv is gitignored; the kernel registration lives in the user profile, not in the repo).

### Phase 1 — Data ingestion and validation

**Prerequisites.** Phase 0 complete. Raw data files present locally under `data/raw/<source>/` for all five primary datasets (Jegham, Epoch AI, Ember, IM3 Atlas, Aqueduct). Per-source `PROVENANCE.md` files committed and accurate.

**Deliverables.** A single notebook at `notebooks/01_ingestion.ipynb` that reads each in-scope raw file, validates its schema against what the dataset rationale memo and the per-source PROVENANCE documents, materialises a faithful schema-validated snapshot of each input to `data/processed/`, and prints a per-file summary of row count, column count, key-column presence, and any documented sentinel values found. A `data/processed/README.md` documenting what is in the directory and how it was produced.

The phase deliberately performs no analytical transformation. Every PROVENANCE file in this project explicitly records "Preprocessing applied at ingestion: none" and defers all join-preparation logic — column-name reconciliation, sentinel handling, the AWS multipliers `skiprows=1` quirk, IM3 layer filtering, operator backfill — to Phase 2. Phase 1's job is to produce a stable, format-normalised, schema-validated snapshot layer that downstream phases can read deterministically without re-validating upstream every time.

This pattern — a faithful snapshot layer beneath a transformation layer beneath an analytical layer — is the standard separation of concerns in modern data pipelines (sometimes called bronze / silver / gold). It buys three things: stability against upstream churn (Ember and Epoch update on rolling schedules; the snapshot freezes the data at the point of ingestion), reproducibility of the final submitted artefact (anyone re-running the notebooks at any later date gets the May 2026 numbers, not whatever upstream happens to publish that week), and performance (CSV-to-parquet conversion at this layer makes downstream reads order-of-magnitude faster).

**In-scope files per source.**

- **Jegham** — five files. Three environmental-footprint files (`DataSnapshotOct26.csv` as the frozen paper-vintage spine, `artificialanalysis_environmental.csv` as the current live snapshot, `Monthly_LLM_Environmental_Footprint.csv` as the time-series view) and two infrastructure-multiplier files (`AWS_Env_Multipliers.csv`, `Microsoft_Env_Multipliers.csv`). The three `artificialanalysis_clean{short,medium,long}.csv` files in the Jegham directory are upstream benchmark inputs to Jegham's environmental model, not project inputs, and are not ingested.
- **Epoch AI** — one file. `epoch_all_models.csv`.
- **Ember** — two files. `ember_yearly.csv` and `ember_us_states.csv`.
- **IM3 Atlas** — one file. `im3_open_source_data_center_atlas_v2026_02_09.csv` (all 1,479 rows; layer filtering happens in Phase 2).
- **Aqueduct** — one file, two sheets. `Aqueduct40_rankings_download_Y2023M07D05.xlsx`, sheets `country_baseline` and `province_baseline` only. The Read Me, country_future, and province_future sheets are ignored.

Total: ten files read, written out as ten parquet snapshots in `data/processed/`.

**Sequence.**
1. Create the notebook with a top-level markdown cell stating its purpose, its inputs (the five raw directories), and its outputs (the parquet files in `data/processed/`).
2. For each of the five sources, in this order — Jegham, Epoch AI, Ember, IM3 Atlas, Aqueduct — produce a section that reads each in-scope raw file with default pandas read settings (no `skiprows`, no column renaming, no type coercion beyond what pandas infers), validates that the columns the rationale memo and the PROVENANCE documents are present, prints a short schema summary (column names, dtypes, row count, presence of any documented sentinel values such as Aqueduct's -9999 for Singapore), and writes the dataframe as parquet to `data/processed/<source>/<filename>.parquet`.
3. Add a final summary cell that prints, for each materialised snapshot, the source name, the filename, and the row × column shape — so a reader running the notebook end-to-end can confirm at a glance that all ten snapshots landed correctly.
4. Clear all outputs before the notebook is staged for commit.

**Verification.** The notebook runs top-to-bottom in a fresh kernel without errors. Every parquet snapshot in `data/processed/` corresponds to one section of the notebook and contains the rows and columns the PROVENANCE documents. Sentinel values (Aqueduct's -9999 for Singapore, Epoch's missing values in `Training power draw (W)`) are surfaced explicitly in the validation output rather than silently passed through. No exploratory dead ends remain in the notebook. No analytical transformations have been applied — the parquet snapshots are content-faithful to the raw files.

**Commit boundaries.** One commit for the notebook itself. The parquet snapshots in `data/processed/` are gitignored and regenerated by running the notebook; they are never committed. If the `data/processed/README.md` is added in this phase, it can be in the same commit as the notebook or in a small follow-up commit, depending on which feels cleaner in the diff.

### Phase 2 — Data integration

**Prerequisites.** Phase 1 complete. Schema-validated parquet snapshots exist locally in `data/processed/` for all ten in-scope source files.

**Deliverables.** A notebook at `notebooks/02_integration.ipynb` that reads the Phase 1 snapshots and produces the joined analytical tables that downstream visualisation work consumes. The integration produces, at minimum: a per-model table joining Jegham per-query metrics to Epoch AI training metadata, and a per-region table joining cloud regions to grid carbon intensity (Ember) and water stress (Aqueduct), with US states resolved at state level and other countries at country level. All transformation logic that the PROVENANCE files defer to integration time is applied here: the AWS multipliers' `skiprows=1` quirk, Ember's column-name reconciliation between yearly and US-state files, IM3's layer-type filtering and operator backfill from the `name` field, Aqueduct's filtering to `indicator_name == "bws"` and `weight == "Tot"`. Joined outputs are written to `data/processed/integrated/`.

**Sequence.**
1. Create the notebook with the standard top-level cell (purpose, inputs, outputs).
2. Load the Phase 1 parquet snapshots from `data/processed/`.
3. Apply each PROVENANCE-deferred transformation in a labelled section so a reader can audit which file was transformed how.
4. Build the model-level join (Jegham × Epoch). Document any model names that fail to match between the two sources and decide explicitly whether to manually reconcile them, fuzzy-match them, or accept the gap. Whatever the choice, document it in a markdown cell.
5. Build the geographic join. Resolve country names to a canonical form (ISO-3166 alpha-2 or alpha-3 codes are the safest) before joining Ember to Aqueduct. Resolve US state names similarly before joining Ember-US to IM3.
6. Write the joined tables to `data/processed/integrated/`.
7. Print summary statistics on each joined table — row counts, join coverage rates, names of any rows that failed to join — so the integration's quality is auditable.
8. Clear outputs before commit.

**Verification.** The notebook runs top-to-bottom in a fresh kernel without errors. Join coverage is documented and acceptable (specific thresholds depend on what the data shows; the rationale memo's claim that the Virginia / Washington / Arizona triangulation works is the smoke test). Any rows that fail to join are listed explicitly rather than silently dropped.

**Commit boundaries.** One commit for the integration notebook. Outputs in `data/processed/integrated/` are gitignored.

### Phase 3 — Exploratory analysis

**Prerequisites.** Phase 2 complete. Integrated tables present locally.

**Deliverables.** A notebook at `notebooks/03_exploration.ipynb` that exercises the integrated tables to validate the rationale memo's central analytical claim (that the integration permits cross-dataset triangulation, with Virginia/Washington/Arizona as the worked example), surfaces any data-quality issues that did not appear in feasibility, and identifies the specific chart that will go into each of the eight visual components. A short markdown summary in the notebook's final section listing, per visual component, the integrated table that feeds it and the analytical claim the chart will make.

**Sequence.**
1. Create the notebook with the standard top-level cell.
2. Reproduce the rationale memo's Virginia / Washington / Arizona triangulation as the first analytical pass. Confirm that the numbers in the memo (Virginia: 319 facilities, 327 gCO₂/kWh, water stress 2.56; Washington: 82 facilities, 124 gCO₂/kWh, water stress 1.20) are actually what the integrated tables produce. Investigate any discrepancy.
3. Run the per-component chart prototypes. Each of the eight visual components in the brief gets a short subsection that produces the chart in matplotlib or seaborn, validates that the data supports the claim the brief makes the chart for, and notes any data-quality concerns.
4. End with a summary table mapping each visual component to its data source, its chart type, and its analytical claim.
5. Clear outputs before commit.

**Verification.** The triangulation reproduces the rationale memo's numbers within acceptable tolerance, or any discrepancy is documented and explained. Every visual component has a working prototype. No analytical surprises remain hidden in the data.

**Commit boundaries.** One commit for the exploration notebook.

### Phase 4 — Visual implementation

**Prerequisites.** Phases 1–3 complete. The eight visual components are individually feasible (verified in phase 3). Tableau Desktop (or Tableau Desktop Public Edition) installed locally; LUISS academic email available for the full Tableau Desktop license.

**Deliverables.** Six Tableau workbooks covering components 2–6 and the system map (component 8), published to Tableau Public with shareable URLs. The D3 prompt-pipeline animation (component 1) implemented in `web/components/prompt-pipeline/` with source files (HTML, JavaScript, CSS, model-parameter JSON). The white-hat / black-hat static pair (component 7) produced by a Python script at `notebooks/07_static_pair.ipynb` (or `src/static_pair.py` if the team prefers a script over a notebook), with the output PNGs written to `web/assets/`.

**Sequence.** This phase has internal parallelism — the D3 work and the Tableau work do not block each other. The recommended internal order:
1. Build the six Tableau workbooks first, because they are the largest contiguous block of work and because Tableau Public publishing has the highest probability of friction (see risk register).
2. Build the D3 prompt-pipeline animation in parallel where possible. Prototype the animation timing and the SVG pipeline before wiring in the model-parameter switching.
3. Produce the white-hat / black-hat static pair last, because it depends on the integrated tables being stable and on the team having a clear feel for which framings actually land.

**Verification.** Every Tableau workbook published to Tableau Public and accessible via its public URL from a private browser session (i.e. without being logged into Tableau). The D3 component runs in a local browser against a static `index.html` and switches model parameters correctly. The static pair renders to PNG at the resolution the site requires.

**Commit boundaries.** Tableau workbook source files (`.twb` or `.twbx`) committed under `tableau/`. D3 source files committed under `web/components/prompt-pipeline/`. Static pair script committed under `notebooks/` or `src/`. PNG outputs of the static pair committed under `web/assets/` (these are deliverables, not regenerable scratch). Several commits across the phase, each scoped to one logical change.

### Phase 5 — Site and deployment

**Prerequisites.** Phase 4 complete. Tableau Public URLs available for embedding. D3 component working locally.

**Deliverables.** A deployed static site at a public URL with the structured narrative described in section 7 of the brief — opening framing, sections per task, embedded Tableau iframes, hosted D3 component, white-hat / black-hat reflection, findings summary. Continuous deployment configured from the GitHub repository so a push to `main` triggers a redeploy.

**Sequence.**
1. Build the site's HTML and CSS skeleton locally, with placeholder content where Tableau iframes and the D3 component will sit.
2. Wire in the Tableau Public iframe embeds and confirm they render correctly at the page widths the site uses.
3. Wire in the D3 component, confirm it runs in production-like conditions, and confirm responsiveness on a narrow (mobile) viewport.
4. Configure continuous deployment from `main`. Confirm a test commit triggers a successful build.
5. Verify the deployed site end-to-end against a clean browser session — no console errors, all dashboards render, D3 component runs.

**Verification.** Deployed URL loads in a clean browser. All eight visual components are present, render correctly, and behave as designed. A push to `main` triggers a successful redeploy within a few minutes.

**Commit boundaries.** Site source under `web/`. Deployment configuration in whatever file the chosen platform uses. Several commits across the phase.

### Phase 6 — Report and submission

**Prerequisites.** Phase 5 complete. All visual components in their final form.

**Deliverables.** A five-page paper-style report at `report/report.pdf` written to the structure specified in section 4 of the project instructions (introduction and question, data, audience and tasks, system description, rejected alternatives, findings and limitations). A two-page AI use appendix at `report/ai-appendix.pdf` written to the requirements in section 5 of the project instructions. A finalised README at the repository root with the deployed site URL, the Tableau Public URLs, and the run instructions.

**Sequence.**
1. Draft the report in the chat-based planning environment, paragraph by paragraph, with each paragraph reviewed before being accepted.
2. Draft the AI appendix similarly, listing tools used, purposes, two to four representative prompt summaries, examples of accepted versus rejected output, and at least one worked example of weak or wrong output and the correction applied.
3. Render both documents to PDF.
4. Update the README with the public URLs and the final run instructions.
5. End-to-end review of the deployed site, the report, the appendix, and the README.
6. Submit.

**Verification.** Report PDF is at most five pages excluding references and appendix. Appendix PDF is at most two pages. README contains all the public URLs and a working set of run instructions. Deployed site, GitHub repo, and submitted package are mutually consistent.

**Commit boundaries.** Report and appendix PDFs committed under `report/`. README updates as a separate commit. Final commit on or before submission day reflects the submitted state.

## 3. Cross-cutting standards

The repository standards document is authoritative for code style (Black for Python at line length 88, Prettier for JavaScript), commit conventions (plain English, present-tense imperative, one logical change per commit, no prefix tags), notebook discipline (outputs cleared before commit, markdown for narrative, no exploratory dead ends), and data hygiene (raw and processed data gitignored). This plan does not duplicate those rules; it assumes them throughout. Anything in this plan that appears to conflict with the standards document loses to the standards document.

## 4. Risk register

Four risks are tracked.

**Risk 1: Tableau Public publishing or embedding friction.** Tableau Public's publishing flow has historically had occasional issues with workbooks above a certain complexity, with embedding into sites with unusual headers, or with iframe sizing on mobile viewports. The project's largest workbook is well under Tableau Public's documented limits, but friction at publishing time would compress the schedule. *Contingency:* publish the first workbook to Tableau Public early in phase 4 (before all six are built) so any account-level or workbook-level publishing issue surfaces with maximum time to resolve. If Tableau Public proves unworkable for any specific workbook, the fallback is to export the workbook as a high-resolution image and embed the image with a link to the source data, preserving the visual at the cost of interactivity for that one component.

**Risk 2: Static-site deployment friction.** Continuous deployment from GitHub is a well-trodden path on every major static-site host, but first-time deployment of a site with iframes, externally hosted scripts, and custom JavaScript can hit configuration snags (build commands, output directories, environment variable handling). *Contingency:* deploy a placeholder version of the site (HTML skeleton, no real content) to the chosen platform on day 1 of phase 5 rather than waiting until the site is feature-complete. This separates deployment debugging from content debugging and ensures that when the real content is ready, the deployment path is already known to work.

**Risk 3: Time pressure compressing the report or the white-hat / black-hat statics.** The project's most distinctive analytical contribution is the white-hat / black-hat treatment, and its most heavily weighted single deliverable other than the visual system is the report. Both fall in the back half of the timeline, which is exactly where slippage from the implementation phase would land. *Contingency:* the brief's day-by-day timeline already builds buffer into days 7 and 11. Treat those buffers as inviolate — if the implementation phase is tracking ahead of schedule, do not start the report or the static pair early; instead, polish what is in flight. If the implementation phase slips, the buffer absorbs the slip without bleeding into the report or the static pair.

**Risk 4: Notebook output-clearing slip polluting a commit.** The repository standards require notebook outputs cleared before commit. A single accidental commit with outputs intact would land tens of thousands of lines of irrelevant noise in the repository's history, visible permanently to any reader of the public repo. *Contingency:* run `jupyter nbconvert --clear-output --inplace notebooks/*.ipynb` as the last step before any commit that touches a notebook. If a commit with outputs lands accidentally, do not attempt a history rewrite on `main` after the repository has been pushed publicly — instead, make a follow-up commit clearing the outputs and accept the noise in the historical commit. The lesson is to be more careful next time.

## 5. Revision history

- **v1.0 — 29 April 2026.** Initial document. Created at the start of the implementation phase, after the project brief, the dataset rationale memo, the data feasibility memo, and the repository standards document were in place, and after professor sign-off on the dataset choices and the static-site deployment approach.
- **v1.1 — 29 April 2026.** Phase 1 revised after a careful read of the five per-source PROVENANCE files. Phase title changed from "Data ingestion and cleaning" to "Data ingestion and validation" to match what the phase actually does. Phase 1 deliverable, sequence, verification, and in-scope file list rewritten to reflect the bronze/silver/gold pattern: Phase 1 produces faithful schema-validated parquet snapshots of the in-scope raw files with no analytical transformation, deferring all PROVENANCE-documented preprocessing (AWS multipliers `skiprows=1`, Ember column-name reconciliation, IM3 layer filtering and operator backfill, Aqueduct sentinel handling and indicator filtering) to Phase 2. Phase 1 in-scope file list expanded from a vague "each raw file" to an explicit ten-file list across the five sources. Phase 2 sequence updated correspondingly to absorb the deferred transformation work as an explicit early step.
