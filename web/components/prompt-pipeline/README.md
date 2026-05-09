# Prompt-pipeline animation

Interactive component for the Thirsty Machines project. Visualises the
per-query environmental cost of one AI prompt across six showcase models
and three prompt lengths, with the journey shown as an animated pipeline
from device to data centre and back.

## Files

- `index.html` — markup, phone interface, SVG pipeline structure, counter
  cards, insight line.
- `pipeline.css` — design tokens, layout, animation styling.
- `pipeline.js` — selector wiring, animation orchestration via D3 v7,
  counter interpolation, accessibility announcements.
- `data/models.json` — per-model energy / water / carbon values for short
  / medium / long query lengths, with insight copy and tier prompt
  examples.

## Run locally

From the repository root:

    cd web/components/prompt-pipeline
    python -m http.server 8000

Then open <http://localhost:8000>.

Requires a modern browser with D3 v7 support (loaded via CDN in
`index.html`). No build step.

## Data source

Per-query values are extracted from the Jegham et al. *How Hungry is AI?*
benchmark (arXiv:2505.09598, October 2026 snapshot), with combined site-
and-source water consumption. Equivalence factors (phone charging,
drinking water, car driving) are project-defined for narrative purposes
and rounded for legibility.

## Known limitations

- The textarea on the phone is read-only. It displays a representative
  prompt for the selected length tier, not user input. Implementing
  custom-prompt input is being evaluated.
- The displayed prompts are illustrative typical prompts at each length,
  not exact reproductions of the prompts used in Jegham's benchmark.
- The pipeline animation is stylised. Physical infrastructure (cell
  tower, network, data centre, grid) is shown schematically, not
  geographically. Where the prompt actually goes depends on cloud-region
  routing decisions made by each provider.
- Per-query inference values are themselves estimates: proprietary
  providers do not publish per-query energy directly. See the project's
  main README and the data feasibility memo for full methodology.
- Animation duration is log-compressed for visual rhythm (3–8 sec range)
  and does not match real generation time — it is a tangible
  representation of relative cost, not a literal stopwatch.

## Accessibility

- Keyboard-navigable: Tab through controls, Enter or Space to activate.
- Honours `prefers-reduced-motion`: skips particle animation and snaps
  counters to final values.
- ARIA-live announcements during animation for screen-reader users.
