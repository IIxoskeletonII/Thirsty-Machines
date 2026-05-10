// Component 1 — Prompt-pipeline animation
// Step 4 of 5: D3 animation. Selector wiring and counter formatting from
// step 3 are preserved; the Send button now drives a master timer instead
// of logging a stub.

(async () => {
  let data;
  try {
    const response = await fetch("./data/models.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    data = await response.json();
  } catch (err) {
    console.error("Failed to load models.json:", err);
    return;
  }

  // Module-scoped state.
  let currentModel = data.defaults.model;
  let currentTier = data.defaults.tier;
  let isAnimating = false;
  let particle = null;
  // requestAnimationFrame handle for the streaming response. Tracked so
  // a new Send (or resetResponse) can cancel an in-progress stream
  // cleanly rather than letting two streams race.
  let streamingHandle = null;
  // Pending setTimeout handles for cost-proportional work-phase effects
  // (sparks, water droplets). Cleared at the start of every Send and
  // again at work-phase end so a cancelled run leaves no orphans.
  const sparkTimeouts = [];
  const dropletTimeouts = [];
  // Per-run work-phase intensities (0.08 floor → 1.0 saturation). Computed
  // at the top of startAnimation; read by the spark / droplet schedulers
  // and the rack flicker cadence inside the master timer.
  let intensities = null;

  // Comparison memory. previousResult holds the run BEFORE the most
  // recent one (or null on first paint / after Clear); currentResult
  // holds the most recently completed run. Capturing previousResult
  // happens at the top of startAnimation; currentResult is set when
  // the animation (or reduced-motion snap) completes.
  let previousResult = null;
  let currentResult = null;

  // DOM references gathered once.
  const modelButtons = Array.from(document.querySelectorAll(".btn--model"));
  const tierButtons = Array.from(document.querySelectorAll(".btn--length"));
  const promptInput = document.getElementById("prompt-input");
  const insightEl = document.getElementById("insight");
  const sendButton = document.getElementById("btn-send");
  const phoneScreen = document.querySelector(".phone__screen");
  const phoneCaption = document.querySelector(".phone__caption");
  const liveRegion = document.getElementById("live-region");
  const responseEl = document.querySelector(".phone__response");
  const responseTextEl = document.querySelector(".phone__response-text");
  const responseCursorEl = document.querySelector(".phone__response-cursor");
  const regionCalloutEl = document.querySelector(".region-callout");
  const regionCalloutLine1El = document.querySelector(
    ".region-callout__line1"
  );
  const regionCalloutLine2El = document.querySelector(
    ".region-callout__line2"
  );
  const counters = {
    energy: document.querySelector('[data-counter="energy"]'),
    water: document.querySelector('[data-counter="water"]'),
    carbon: document.querySelector('[data-counter="carbon"]'),
  };
  const equivs = {
    energy: document.querySelector('[data-equiv="energy"]'),
    water: document.querySelector('[data-equiv="water"]'),
    carbon: document.querySelector('[data-equiv="carbon"]'),
  };

  const comparison = {
    header: document.querySelector(".comparison-header"),
    model: document.querySelector(".comparison-header__model"),
    clear: document.querySelector(".comparison-header__clear"),
    energyLine: document.querySelector(
      '[data-metric="energy"] .counter__previous'
    ),
    waterLine: document.querySelector(
      '[data-metric="water"] .counter__previous'
    ),
    carbonLine: document.querySelector(
      '[data-metric="carbon"] .counter__previous'
    ),
    energyValue: document.querySelector('[data-previous="energy"]'),
    waterValue: document.querySelector('[data-previous="water"]'),
    carbonValue: document.querySelector('[data-previous="carbon"]'),
  };

  // Short tier labels for the comparison header — "Long reasoning prompt"
  // is too verbose at 12 px next to a model name. Falls back to the raw
  // tier key if no short label is defined.
  const TIER_SHORT_LABEL = {
    short: "Short",
    medium: "Medium",
    long: "Long",
  };

  // Stage x-positions match the static SVG silhouettes drawn in index.html.
  // Tower / network / datacentre activate as the particle reaches them on
  // the forward leg; the grid lights up at the start of the work phase as
  // the power source for the spark.
  const STAGES = [
    { name: "tower", x: 100 },
    { name: "network", x: 240 },
    { name: "datacentre", x: 380 },
    { name: "grid", x: 510 },
  ];

  // ---------- formatting (preserved from step 3) ----------

  // Adaptive precision keeps counter widths tidy across magnitude swings;
  // tabular-nums on .counter__number prevents reflow during interpolation.
  function formatNumber(value) {
    if (!Number.isFinite(value)) return "—";
    if (value >= 10) return value.toFixed(1);
    if (value >= 1) return value.toFixed(2);
    if (value >= 0.01) return value.toFixed(3);
    return value.toFixed(4);
  }

  function formatEnergyEquiv(wh) {
    const sec = wh * 30;
    if (sec < 60) return `≈ ${Math.round(sec)} sec of phone charging`;
    return `≈ ${Math.round(sec / 60)} min of phone charging`;
  }

  function formatWaterEquiv(ml) {
    const tsp = ml * 0.2;
    if (tsp < 0.1) return "< 0.1 tsp of drinking water";
    return `≈ ${tsp.toFixed(1)} tsp of drinking water`;
  }

  function formatCarbonEquiv(g) {
    const m = g * 7;
    if (m < 1) return "< 1 m of car driving";
    return `≈ ${Math.round(m)} m of car driving`;
  }

  // ---------- selector helpers (preserved from step 3) ----------

  function applySelected(buttons, datasetKey, value) {
    buttons.forEach((btn) => {
      const matches = btn.dataset[datasetKey] === value;
      btn.classList.toggle("is-selected", matches);
      btn.setAttribute("aria-pressed", matches ? "true" : "false");
    });
  }

  function refreshCounters() {
    const tierData = data.models[currentModel][currentTier];
    counters.energy.textContent = formatNumber(tierData.energy_wh);
    counters.water.textContent = formatNumber(tierData.water_ml);
    counters.carbon.textContent = formatNumber(tierData.carbon_g);
    equivs.energy.textContent = formatEnergyEquiv(tierData.energy_wh);
    equivs.water.textContent = formatWaterEquiv(tierData.water_ml);
    equivs.carbon.textContent = formatCarbonEquiv(tierData.carbon_g);
  }

  function refreshInsight() {
    insightEl.textContent = data.models[currentModel].insight;
  }

  function refreshPromptExample() {
    const example = data.tiers[currentTier]?.prompt_example;
    if (typeof example === "string") promptInput.value = example;
  }

  // The caption below the phone now labels the prompt content (not the
  // device), so it tracks the selected length tier.
  function refreshCaption() {
    if (!phoneCaption) return;
    const captions = {
      short: "Typical short prompt",
      medium: "Typical medium prompt",
      long: "Typical long prompt",
    };
    phoneCaption.textContent = captions[currentTier] || "Typical prompt";
  }

  // Announcements for screen-reader users. Setting textContent on an
  // aria-live="polite" region triggers a non-interrupting announcement.
  function announce(message) {
    if (liveRegion) liveRegion.textContent = message;
  }

  // Comparison UI shows the previous run's model + per-metric values.
  // Hidden when previousResult is null (first paint or after Clear).
  function refreshComparisonUI() {
    if (!comparison.header) return;
    if (previousResult === null) {
      comparison.header.hidden = true;
      comparison.energyLine.hidden = true;
      comparison.waterLine.hidden = true;
      comparison.carbonLine.hidden = true;
      return;
    }
    const tierShort =
      TIER_SHORT_LABEL[previousResult.tier] || previousResult.tier;
    comparison.model.textContent = `${previousResult.model} ${tierShort}`;
    comparison.energyValue.textContent =
      `${formatNumber(previousResult.energyWh)} Wh`;
    comparison.waterValue.textContent =
      `${formatNumber(previousResult.waterMl)} mL`;
    comparison.carbonValue.textContent =
      `${formatNumber(previousResult.carbonG)} g CO₂`;
    comparison.header.hidden = false;
    comparison.energyLine.hidden = false;
    comparison.waterLine.hidden = false;
    comparison.carbonLine.hidden = false;
  }

  // Selector clicks no longer refresh the counter values — counters
  // start at zero and only move when Send drives an animation. Insight,
  // caption, and the prompt example still update statically so the user
  // gets immediate feedback that their selection registered.
  function selectModel(modelName) {
    if (!data.models[modelName]) return;
    currentModel = modelName;
    applySelected(modelButtons, "model", modelName);
    refreshInsight();
  }

  function selectTier(tierName) {
    if (!data.tiers[tierName]) return;
    currentTier = tierName;
    applySelected(tierButtons, "tier", tierName);
    refreshPromptExample();
    refreshCaption();
  }

  // ---------- step 4: animation helpers ----------

  function getOrgColour(organisation) {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(`--color-${organisation.toLowerCase()}`)
      .trim();
  }

  function ensureParticle() {
    if (!particle) {
      particle = d3
        .select(".pipeline-svg")
        .append("circle")
        .attr("class", "particle")
        .attr("r", 8)
        .attr("cy", 130)
        .attr("opacity", 0);
    }
    return particle;
  }

  function showParticle(colour, x) {
    ensureParticle()
      .interrupt()
      .attr("cx", x)
      .attr("fill", colour)
      .transition()
      .duration(200)
      .attr("opacity", 1);
  }

  function applyStageHighlightsForX(x) {
    // Iterate the first three stages — the grid (index 3) lights up
    // separately at the start of the work phase.
    for (let i = 0; i < 3; i += 1) {
      const stage = STAGES[i];
      if (x >= stage.x) {
        d3.select(`.pipeline-stage--${stage.name}`).classed("is-active", true);
      }
    }
  }

  function fireSpark() {
    d3.select(".pipeline-svg")
      .append("circle")
      .attr("cx", 510)
      .attr("cy", 130)
      .attr("r", 4)
      .attr("fill", "#eab308")
      .attr("opacity", 1)
      .transition()
      .ease(d3.easeQuadOut)
      .duration(600)
      .attr("cx", 380)
      .transition()
      .duration(200)
      .attr("opacity", 0)
      .remove();
  }

  // Water droplet emerging from below the data centre. Symbolises the
  // cooling system's water output. xJitter spreads the spawn points
  // across the rectangle's footprint so droplets read as a system-wide
  // drip rather than a single faucet. easeQuadIn = accelerating gravity
  // feel. Inline style keeps the colour driven by the CSS custom property
  // (var() does not resolve inside SVG presentation attributes).
  function spawnWaterDroplet() {
    const xJitter = (Math.random() - 0.5) * 28;
    d3.select(".pipeline-svg")
      .append("circle")
      .attr("cx", 380 + xJitter)
      .attr("cy", 155)
      .attr("r", 1.8)
      .attr("style", "fill: var(--color-water);")
      .attr("opacity", 0.75)
      .transition()
      .duration(900)
      .ease(d3.easeQuadIn)
      .attr("cy", 205)
      .attr("opacity", 0)
      .remove();
  }

  // Per-cell cost intensity in [0.08, 1.0]. log10 because the per-cell
  // spread is ~1000×; constants calibrated to the six showcase models in
  // models.json so Llama 3.1 8B short clamps to the 0.08 visual floor and
  // DeepSeek R1 long saturates at 1.0. The 0.08 floor ensures every cell
  // produces visible effects rather than going flat.
  function computeWorkIntensities(modelData, tierKey) {
    const t = modelData[tierKey];
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    return {
      energy: clamp((Math.log10(t.energy_wh) + 1.3) / 2.76, 0.08, 1.0),
      water: clamp((Math.log10(t.water_ml) + 0.57) / 2.87, 0.08, 1.0),
      carbon: clamp((Math.log10(t.carbon_g) + 1.81) / 3.05, 0.08, 1.0),
    };
  }

  function clearWorkEffectTimeouts() {
    sparkTimeouts.forEach(clearTimeout);
    sparkTimeouts.length = 0;
    dropletTimeouts.forEach(clearTimeout);
    dropletTimeouts.length = 0;
  }

  // Geographic callout above the data centre. Setting opacity via
  // setAttribute (rather than toggling a CSS class) lets the existing
  // CSS transition: opacity 400ms ease interpolate the fade cleanly,
  // while the reduced-motion @media block neutralises that transition
  // so reduced-motion users see a snap.
  function showRegionCallout() {
    if (!regionCalloutEl) return;
    const model = data.models[currentModel];
    const region = model && model.host_region;
    if (region) {
      regionCalloutLine1El.textContent = region.region_name;
      regionCalloutLine2El.textContent =
        `${region.grid_carbon_g_per_kwh} g CO₂/kWh · WS ${region.water_stress_score}`;
    } else {
      // Vendor-hosted: hosting transparency itself is the story.
      regionCalloutLine1El.textContent = `${model.host} vendor-hosted`;
      regionCalloutLine2El.textContent = "Region undisclosed";
    }
    regionCalloutEl.setAttribute("opacity", "1");
  }

  function hideRegionCallout() {
    if (!regionCalloutEl) return;
    regionCalloutEl.setAttribute("opacity", "0");
  }

  function startLedPulse() {
    const led = d3.select(".pipeline-stage__led");
    return d3.timer((elapsed) => {
      const phase = (elapsed % 600) / 600;
      const wave = (Math.sin(phase * Math.PI * 2) + 1) / 2; // 0..1
      led.attr("r", 1.5 + wave * 1.0).attr("opacity", 0.5 + wave * 0.5);
    });
  }

  function startRackFlicker(intensity) {
    const lines = d3.selectAll(".pipeline-stage--datacentre line").nodes();
    // Higher intensity = shorter intervals = more frequent flicker. At
    // 0.08 (lightest) each rack flickers every ~480-870 ms; at 1.0
    // (heaviest) every ~150-350 ms. Independent per-line schedule keeps
    // the data centre's "alive" feel asynchronous rather than pulsed.
    const minInterval = 150 + (1 - intensity) * 150;
    const maxInterval = 350 + (1 - intensity) * 250;
    const span = maxInterval - minInterval;
    const states = lines.map(() => ({
      nextFlick: minInterval + Math.random() * span,
    }));
    return d3.timer((elapsed) => {
      lines.forEach((line, i) => {
        if (elapsed >= states[i].nextFlick) {
          d3.select(line)
            .attr("opacity", 0.3)
            .transition()
            .duration(150)
            .attr("opacity", 1);
          states[i].nextFlick =
            elapsed + minInterval + Math.random() * span;
        }
      });
    });
  }

  function resetWorkVisuals() {
    d3.select(".pipeline-stage__led")
      .interrupt()
      .attr("r", 1.5)
      .attr("opacity", 1);
    d3.selectAll(".pipeline-stage--datacentre line")
      .interrupt()
      .attr("opacity", 1);
  }

  // Log-compressed mapping of real generation time to animation duration.
  // Fast / small models get a brisk animation; slow / large reasoning models
  // feel heavier — the duration spread itself carries pedagogical meaning.
  function computeDuration() {
    const model = data.models[currentModel];
    const tier = data.tiers[currentTier];
    const realSeconds = tier.tokens / model.tokensPerSecond;
    const minReal = 0.5;
    const maxReal = 50;
    const minAnim = 3000;
    const maxAnim = 8000;
    const t =
      (Math.log(realSeconds) - Math.log(minReal)) /
      (Math.log(maxReal) - Math.log(minReal));
    return minAnim + Math.max(0, Math.min(1, t)) * (maxAnim - minAnim);
  }

  function setControlsDisabled(disabled) {
    [...modelButtons, ...tierButtons, sendButton].forEach((btn) => {
      btn.disabled = disabled;
      btn.setAttribute("aria-disabled", disabled ? "true" : "false");
    });
  }

  function resetCountersToZero() {
    counters.energy.textContent = formatNumber(0);
    counters.water.textContent = formatNumber(0);
    counters.carbon.textContent = formatNumber(0);
    // Equivalences stay muted during the climb so focus is on the big
    // numbers; they snap to final values when the work phase ends.
    equivs.energy.textContent = "≈ —";
    equivs.water.textContent = "≈ —";
    equivs.carbon.textContent = "≈ —";
  }

  function fireReceiveFlash() {
    if (!phoneScreen) return;
    phoneScreen.classList.add("is-receiving");
    setTimeout(() => phoneScreen.classList.remove("is-receiving"), 400);
  }

  // Streaming rate approximates real model output cadence: tokens/second
  // × ~4 chars/token. Faster models stream noticeably faster than slower
  // ones — same prompt, same response, dramatically different pace.
  function streamResponse(text) {
    if (!responseEl || !responseTextEl || !responseCursorEl) return;
    if (streamingHandle) {
      cancelAnimationFrame(streamingHandle);
      streamingHandle = null;
    }
    responseTextEl.textContent = "";
    responseEl.hidden = false;
    responseCursorEl.hidden = false;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      responseTextEl.textContent = text;
      responseCursorEl.hidden = true;
      return;
    }

    const tps = data.models[currentModel].tokensPerSecond;
    const charDurationMs = 1000 / (tps * 4);
    let charIndex = 0;
    const startTime = performance.now();

    const tick = () => {
      const elapsed = performance.now() - startTime;
      const targetIndex = Math.min(
        text.length,
        Math.floor(elapsed / charDurationMs)
      );
      if (targetIndex > charIndex) {
        responseTextEl.textContent = text.slice(0, targetIndex);
        charIndex = targetIndex;
      }
      if (targetIndex >= text.length) {
        responseCursorEl.hidden = true;
        streamingHandle = null;
        return;
      }
      streamingHandle = requestAnimationFrame(tick);
    };

    streamingHandle = requestAnimationFrame(tick);
  }

  function resetResponse() {
    if (streamingHandle) {
      cancelAnimationFrame(streamingHandle);
      streamingHandle = null;
    }
    if (responseEl) responseEl.hidden = true;
    if (responseTextEl) responseTextEl.textContent = "";
    if (responseCursorEl) responseCursorEl.hidden = true;
  }

  function clearStagesIfIdle() {
    // Guarded so a follow-on Send doesn't have its newly-lit stages wiped.
    if (!isAnimating) {
      d3.selectAll(".pipeline-stage").classed("is-active", false);
    }
  }

  function finishAnimation() {
    setControlsDisabled(false);
    isAnimating = false;
    // Capture this run's final values before announcing — announceCompletion
    // also reads previousResult, which still holds the run BEFORE this one
    // (captured at startAnimation).
    const tierData = data.models[currentModel][currentTier];
    if (tierData) {
      currentResult = {
        model: currentModel,
        tier: currentTier,
        energyWh: tierData.energy_wh,
        waterMl: tierData.water_ml,
        carbonG: tierData.carbon_g,
      };
    }
    announceCompletion();
    refreshComparisonUI();
    // Belt-and-braces: full-motion path already faded the callout at
    // workEnded; reduced-motion path has it still visible at this point
    // and needs the snap-out here.
    hideRegionCallout();
    setTimeout(clearStagesIfIdle, 500);
  }

  function announceStart() {
    const tierLabel = data.tiers[currentTier]?.label?.toLowerCase() || currentTier;
    announce(`Sending prompt to ${currentModel}, ${tierLabel}.`);
  }

  function announceCompletion() {
    const tier = data.models[currentModel][currentTier];
    if (!tier) return;
    let message =
      `Response received. ${formatNumber(tier.energy_wh)} watt hours, ` +
      `${formatNumber(tier.water_ml)} millilitres, ` +
      `${formatNumber(tier.carbon_g)} grams CO2.`;
    if (previousResult) {
      message +=
        ` Previous run was ${previousResult.model}, ` +
        `${formatNumber(previousResult.energyWh)} watt hours.`;
    }
    announce(message);
  }

  function runReducedMotion() {
    // Minimum-viable confirmation: snap counters, snap response text
    // (streamResponse internally checks reduced-motion and short-circuits
    // to immediate display), brief stage highlight, snap-show the region
    // callout (informational, not motion-decorative — the @media rule
    // suppresses its fade), ~500ms disable window. No particle, no
    // pulses, no flash, no streamed typing animation.
    refreshCounters();
    const responseText = data.tiers[currentTier].response_example;
    if (responseText) streamResponse(responseText);
    showRegionCallout();
    d3.selectAll(".pipeline-stage").classed("is-active", true);
    setTimeout(finishAnimation, 500);
  }

  function startAnimation() {
    if (isAnimating) return;
    isAnimating = true;
    // Capture the prior run BEFORE the new run begins. previousResult
    // is read at completion to populate the comparison UI; the visible
    // comparison-header / per-card lines do not update mid-animation,
    // so the user can compare the climbing new value against the
    // static previous value.
    previousResult = currentResult;
    setControlsDisabled(true);
    announceStart();
    // Start visually clean: any leftover .is-active from a prior run that
    // hasn't finished its 500ms fade-out yet would otherwise pre-empt the
    // forward-leg light-up sequence. resetResponse() clears any stale
    // streamed response from the previous run; clearWorkEffectTimeouts()
    // cancels any pending sparks/droplets that haven't fired yet.
    d3.selectAll(".pipeline-stage").classed("is-active", false);
    resetResponse();
    clearWorkEffectTimeouts();
    hideRegionCallout();
    intensities = computeWorkIntensities(
      data.models[currentModel],
      currentTier
    );

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      runReducedMotion();
      return;
    }

    const duration = computeDuration();
    const orgColour = getOrgColour(data.models[currentModel].organization);
    const tierData = data.models[currentModel][currentTier];

    resetCountersToZero();
    showParticle(orgColour, 20);

    const energyInterp = d3.interpolateNumber(0, tierData.energy_wh);
    const waterInterp = d3.interpolateNumber(0, tierData.water_ml);
    const carbonInterp = d3.interpolateNumber(0, tierData.carbon_g);

    let workStarted = false;
    let workEnded = false;
    let receiveFired = false;
    let ledTimer = null;
    let rackTimer = null;

    const masterTimer = d3.timer((elapsed) => {
      const t = Math.min(1, elapsed / duration);

      if (t < 0.3) {
        // FORWARD: phone → data centre.
        const eased = d3.easeQuadInOut(t / 0.3);
        const x = 20 + eased * (380 - 20);
        particle.attr("cx", x);
        applyStageHighlightsForX(x);
      } else if (t < 0.7) {
        // WORK: counters interpolate, LED pulses, racks flicker, spark fires.
        if (!workStarted) {
          workStarted = true;
          // Particle "enters" the data centre.
          particle.interrupt().transition().duration(200).attr("opacity", 0);
          d3.select(".pipeline-stage--grid").classed("is-active", true);
          ledTimer = startLedPulse();
          rackTimer = startRackFlicker(intensities.energy);

          // Power sparks evenly distributed across the work phase. Count
          // scales with energy intensity (1 → 8) so heavy models look
          // like they're drawing continuous power, light models look
          // like a single discrete pulse.
          const workDurationMs = duration * 0.4;
          const sparkCount = 1 + Math.floor(intensities.energy * 7);
          for (let i = 0; i < sparkCount; i++) {
            const offset = (i + 0.5) * (workDurationMs / sparkCount);
            sparkTimeouts.push(
              setTimeout(() => {
                if (!workEnded) fireSpark();
              }, offset)
            );
          }

          // Cooling-water droplets, count scaled to water intensity
          // (2 → 15). Heavy models drip steadily; light models barely
          // sweat. Spaced like the sparks but on their own schedule so
          // the two effects don't synchronise visually.
          const dropletCount = 1 + Math.floor(intensities.water * 14);
          for (let i = 0; i < dropletCount; i++) {
            const offset = (i + 0.5) * (workDurationMs / dropletCount);
            dropletTimeouts.push(
              setTimeout(() => {
                if (!workEnded) spawnWaterDroplet();
              }, offset)
            );
          }

          // Stream the model's response into the phone in parallel with
          // the counters climbing. Streaming runs on its own rAF loop so
          // its rate (TPS × 4 chars/token) is independent of the master
          // timer — faster models visibly stream faster.
          const responseText = data.tiers[currentTier].response_example;
          if (responseText) streamResponse(responseText);

          // Geographic annotation appears in the same beat as the work
          // effects start. It fades out at workEnded, before the return
          // particle shows up.
          showRegionCallout();
        }
        const workT = (t - 0.3) / 0.4;
        counters.energy.textContent = formatNumber(energyInterp(workT));
        counters.water.textContent = formatNumber(waterInterp(workT));
        counters.carbon.textContent = formatNumber(carbonInterp(workT));
      } else {
        // RETURN: response travels data centre → phone.
        if (!workEnded) {
          workEnded = true;
          if (ledTimer) ledTimer.stop();
          if (rackTimer) rackTimer.stop();
          // Cancel any spark/droplet timeouts that haven't fired yet —
          // they were scheduled to land within the work-phase window,
          // but rounding could push the last one past t=0.7.
          clearWorkEffectTimeouts();
          hideRegionCallout();
          resetWorkVisuals();
          // Snap counters to exact final values; equivalences come online.
          counters.energy.textContent = formatNumber(tierData.energy_wh);
          counters.water.textContent = formatNumber(tierData.water_ml);
          counters.carbon.textContent = formatNumber(tierData.carbon_g);
          equivs.energy.textContent = formatEnergyEquiv(tierData.energy_wh);
          equivs.water.textContent = formatWaterEquiv(tierData.water_ml);
          equivs.carbon.textContent = formatCarbonEquiv(tierData.carbon_g);
          showParticle(orgColour, 380);
        }
        const eased = d3.easeQuadInOut((t - 0.7) / 0.3);
        const x = 380 + eased * (20 - 380);
        particle.attr("cx", x);
        if (t > 0.95 && !receiveFired) {
          receiveFired = true;
          fireReceiveFlash();
        }
      }

      if (t >= 1) {
        masterTimer.stop();
        particle.interrupt().transition().duration(150).attr("opacity", 0);
        finishAnimation();
        return true;
      }
    });
  }

  // ---------- wiring ----------

  modelButtons.forEach((btn) => {
    btn.addEventListener("click", () => selectModel(btn.dataset.model));
  });
  tierButtons.forEach((btn) => {
    btn.addEventListener("click", () => selectTier(btn.dataset.tier));
  });
  sendButton.addEventListener("click", startAnimation);
  // Clear only nullifies the visible comparison UI; currentResult is
  // preserved so the next Send re-captures it as previousResult.
  if (comparison.clear) {
    comparison.clear.addEventListener("click", () => {
      previousResult = null;
      refreshComparisonUI();
    });
  }

  // First paint. Counters intentionally left at the static "0.00" markup
  // so every Send becomes a real reveal. Selectors, insight, caption,
  // and prompt example reflect the defaults from models.json.
  applySelected(modelButtons, "model", currentModel);
  applySelected(tierButtons, "tier", currentTier);
  refreshInsight();
  refreshPromptExample();
  refreshCaption();
  refreshComparisonUI();
})();
