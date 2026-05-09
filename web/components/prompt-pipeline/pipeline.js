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

  // DOM references gathered once.
  const modelButtons = Array.from(document.querySelectorAll(".btn--model"));
  const tierButtons = Array.from(document.querySelectorAll(".btn--length"));
  const promptInput = document.getElementById("prompt-input");
  const insightEl = document.getElementById("insight");
  const sendButton = document.getElementById("btn-send");
  const phoneScreen = document.querySelector(".phone__screen");
  const phoneCaption = document.querySelector(".phone__caption");
  const liveRegion = document.getElementById("live-region");
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

  function selectModel(modelName) {
    if (!data.models[modelName]) return;
    currentModel = modelName;
    applySelected(modelButtons, "model", modelName);
    refreshCounters();
    refreshInsight();
  }

  function selectTier(tierName) {
    if (!data.tiers[tierName]) return;
    currentTier = tierName;
    applySelected(tierButtons, "tier", tierName);
    refreshCounters();
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

  function startLedPulse() {
    const led = d3.select(".pipeline-stage__led");
    return d3.timer((elapsed) => {
      const phase = (elapsed % 600) / 600;
      const wave = (Math.sin(phase * Math.PI * 2) + 1) / 2; // 0..1
      led.attr("r", 1.5 + wave * 1.0).attr("opacity", 0.5 + wave * 0.5);
    });
  }

  function startRackFlicker() {
    const lines = d3.selectAll(".pipeline-stage--datacentre line").nodes();
    // Independent next-flicker schedule per line gives the data centre a
    // randomised "alive" feel rather than a synchronised pulse.
    const states = lines.map(() => ({
      nextFlick: 200 + Math.random() * 300,
    }));
    return d3.timer((elapsed) => {
      lines.forEach((line, i) => {
        if (elapsed >= states[i].nextFlick) {
          d3.select(line)
            .attr("opacity", 0.3)
            .transition()
            .duration(150)
            .attr("opacity", 1);
          states[i].nextFlick = elapsed + 200 + Math.random() * 300;
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

  function clearStagesIfIdle() {
    // Guarded so a follow-on Send doesn't have its newly-lit stages wiped.
    if (!isAnimating) {
      d3.selectAll(".pipeline-stage").classed("is-active", false);
    }
  }

  function finishAnimation() {
    setControlsDisabled(false);
    isAnimating = false;
    announceCompletion();
    setTimeout(clearStagesIfIdle, 500);
  }

  function announceStart() {
    const tierLabel = data.tiers[currentTier]?.label?.toLowerCase() || currentTier;
    announce(`Sending prompt to ${currentModel}, ${tierLabel}.`);
  }

  function announceCompletion() {
    const tier = data.models[currentModel][currentTier];
    if (!tier) return;
    announce(
      `Response received. ${formatNumber(tier.energy_wh)} watt hours, ` +
        `${formatNumber(tier.water_ml)} millilitres, ` +
        `${formatNumber(tier.carbon_g)} grams CO2.`
    );
  }

  function runReducedMotion() {
    // Minimum-viable confirmation: snap counters, brief stage highlight,
    // ~500ms disable window. No particle, no pulses, no flash.
    refreshCounters();
    d3.selectAll(".pipeline-stage").classed("is-active", true);
    setTimeout(finishAnimation, 500);
  }

  function startAnimation() {
    if (isAnimating) return;
    isAnimating = true;
    setControlsDisabled(true);
    announceStart();
    // Start visually clean: any leftover .is-active from a prior run that
    // hasn't finished its 500ms fade-out yet would otherwise pre-empt the
    // forward-leg light-up sequence.
    d3.selectAll(".pipeline-stage").classed("is-active", false);

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
          rackTimer = startRackFlicker();
          fireSpark();
          // Longer animations get a second spark mid-work so the data
          // centre doesn't visually go dormant after the first hit.
          if (duration > 4000) {
            const halfwayDelay = (duration * 0.4) / 2;
            setTimeout(() => {
              if (workStarted && !workEnded) fireSpark();
            }, halfwayDelay);
          }
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

  // First paint.
  applySelected(modelButtons, "model", currentModel);
  applySelected(tierButtons, "tier", currentTier);
  refreshCounters();
  refreshInsight();
  refreshPromptExample();
  refreshCaption();
})();
