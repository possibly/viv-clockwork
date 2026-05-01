import {
  SIM,
  getCurrentLevel,
  startSim,
  pauseSim,
  stepForward,
  stepBack,
  setSpeed,
  beginLevelTransition,
  spawnLevelItems,
  getConditionResults,
} from "../viv/sim";
import { STATE } from "../viv/adapter";
import { CHARACTER_DEFS } from "../viv/world";
import { LEVELS } from "../game/levels";

let onUpdate: (() => void) | null = null;
let dragSource: string | null = null;

export function setControlsUpdateCallback(cb: () => void): void {
  onUpdate = cb;
}

export function renderGoalsTab(container: HTMLElement): void {
  container.innerHTML = "";

  const level = getCurrentLevel();
  const results = getConditionResults();
  const allMet = results.every((r) => r.met);

  // ── Win conditions ─────────────────────────────────────────────────────────
  const condDiv = document.createElement("div");
  condDiv.className = "win-conditions";
  for (const result of results) {
    const item = document.createElement("div");
    item.className = `win-condition${result.met ? " win-condition--met" : ""}`;
    const icon = document.createElement("span");
    icon.className = "wc-icon";
    icon.textContent = result.met ? "✓" : "○";
    item.appendChild(icon);
    item.appendChild(document.createTextNode(result.description));
    condDiv.appendChild(item);
  }
  container.appendChild(condDiv);

  // ── Mode-specific controls ─────────────────────────────────────────────────
  if (SIM.mode === "setup") {
    renderSetup(container);
  } else {
    renderRun(container, allMet);
  }
}

// ── Setup mode ────────────────────────────────────────────────────────────────
function renderSetup(container: HTMLElement): void {
  const level = getCurrentLevel();

  const brief = document.createElement("p");
  brief.className = "setup-brief";
  brief.textContent = "Drag characters to rooms, then run the simulation.";
  container.appendChild(brief);

  // Character chips (draggable)
  const tray = document.createElement("div");
  tray.className = "char-tray";

  for (const charId of level.availableCharacters) {
    const entity = STATE.entities[charId];
    if (!entity) continue;

    const chip = document.createElement("div");
    chip.className = "char-chip";
    chip.draggable = true;
    chip.dataset.charId = charId;

    const dot = document.createElement("span");
    dot.className = "char-dot";
    dot.style.background = CHARACTER_DEFS[charId]?.color ?? "#888";
    chip.appendChild(dot);

    chip.appendChild(document.createTextNode(entity.name as string));

    const loc = document.createElement("span");
    loc.className = "char-loc";
    loc.textContent = `@${entity.location as string}`;
    chip.appendChild(loc);

    chip.addEventListener("dragstart", () => { dragSource = charId; });

    // Touch drag: tap chip then tap room
    let touchPending = false;
    chip.addEventListener("touchstart", (e) => {
      e.preventDefault();
      if (dragSource === charId) {
        dragSource = null;
        chip.style.outline = "";
        touchPending = false;
      } else {
        dragSource = charId;
        chip.style.outline = `2px solid ${CHARACTER_DEFS[charId]?.color ?? "#c8a35a"}`;
        touchPending = true;
      }
    }, { passive: false });

    tray.appendChild(chip);
  }
  container.appendChild(tray);

  // Room drop targets
  const locDiv = document.createElement("div");
  locDiv.className = "location-targets";

  for (const loc of level.locations) {
    const locBtn = document.createElement("div");
    locBtn.className = "location-drop-target";
    locBtn.textContent = loc.name;
    locBtn.dataset.locationId = loc.id;

    locBtn.addEventListener("dragover", (e) => { e.preventDefault(); locBtn.classList.add("dragover"); });
    locBtn.addEventListener("dragleave", () => locBtn.classList.remove("dragover"));
    locBtn.addEventListener("drop", (e) => {
      e.preventDefault();
      locBtn.classList.remove("dragover");
      if (dragSource) {
        STATE.entities[dragSource].location = loc.id;
        dragSource = null;
        onUpdate?.();
      }
    });

    // Touch tap to drop
    locBtn.addEventListener("touchstart", (e) => {
      if (!dragSource) return;
      e.preventDefault();
      STATE.entities[dragSource].location = loc.id;
      // clear outline on the chip
      document.querySelectorAll<HTMLElement>(".char-chip").forEach((c) => { c.style.outline = ""; });
      dragSource = null;
      onUpdate?.();
    }, { passive: false });

    locDiv.appendChild(locBtn);
  }
  container.appendChild(locDiv);

  // ▶ Run button — full width, prominent
  const runBtn = document.createElement("button");
  runBtn.className = "btn btn--primary";
  runBtn.textContent = "▶  Run Simulation";
  runBtn.addEventListener("click", () => {
    spawnLevelItems(SIM.currentLevelIndex);
    startSim();
    onUpdate?.();
  });
  container.appendChild(runBtn);
}

// ── Run mode ──────────────────────────────────────────────────────────────────
function renderRun(container: HTMLElement, allMet: boolean): void {
  const level = getCurrentLevel();
  const budget = level.stepBudget;
  const pct = Math.min(100, (SIM.stepCount / budget) * 100);

  // Step progress bar
  const prog = document.createElement("div");
  prog.style.cssText = "height:6px;background:#e0d4c0;border-radius:3px;margin-bottom:8px;overflow:hidden";
  const fill = document.createElement("div");
  fill.style.cssText = `height:100%;width:${pct}%;background:#c8a35a;border-radius:3px;transition:width 0.3s`;
  prog.appendChild(fill);
  container.appendChild(prog);

  // Button grid
  const grid = document.createElement("div");
  grid.className = "run-controls-grid";

  // Pause / Resume — full width
  const pauseBtn = document.createElement("button");
  pauseBtn.className = "btn btn--primary";
  const isRunning = SIM.mode === "running";
  pauseBtn.textContent = isRunning ? "⏸  Pause" : "▶  Resume";
  pauseBtn.addEventListener("click", () => {
    if (isRunning) pauseSim(); else startSim();
    onUpdate?.();
  });
  grid.appendChild(pauseBtn);

  // Step back
  const backBtn = document.createElement("button");
  backBtn.className = "btn btn--secondary";
  backBtn.textContent = "↩ Back";
  backBtn.disabled = SIM.stepHistory.length <= 1;
  backBtn.addEventListener("click", () => { pauseSim(); stepBack(); onUpdate?.(); });
  grid.appendChild(backBtn);

  // Step fwd
  const fwdBtn = document.createElement("button");
  fwdBtn.className = "btn btn--secondary";
  fwdBtn.textContent = "Fwd →";
  fwdBtn.addEventListener("click", async () => { pauseSim(); await stepForward(); onUpdate?.(); });
  grid.appendChild(fwdBtn);

  container.appendChild(grid);

  // Speed
  const speedRow = document.createElement("div");
  speedRow.className = "speed-row";
  const speedLabel = document.createElement("span");
  speedLabel.className = "speed-label";
  speedLabel.textContent = "Speed:";
  speedRow.appendChild(speedLabel);

  for (const [label, ms] of [["Slow", 900], ["Med", 300], ["Fast", 60]] as const) {
    const btn = document.createElement("button");
    btn.className = `btn btn--speed${SIM.speed === ms ? " btn--speed-active" : ""}`;
    btn.textContent = label;
    btn.addEventListener("click", () => { setSpeed(ms); onUpdate?.(); });
    speedRow.appendChild(btn);
  }
  container.appendChild(speedRow);

  // Step counter
  const info = document.createElement("div");
  info.className = "step-info";
  info.textContent = `Step ${SIM.stepCount} of ${budget}`;
  container.appendChild(info);

  // Next level button when done
  const isDone = SIM.mode === "level-complete" || allMet || SIM.stepCount >= budget;
  if (isDone) {
    const nextIdx = SIM.currentLevelIndex + 1;
    const endBtn = document.createElement("button");
    endBtn.className = "btn btn--primary";
    endBtn.style.marginTop = "8px";
    if (nextIdx < LEVELS.length) {
      endBtn.textContent = `→  Next: ${LEVELS[nextIdx].name}`;
      endBtn.addEventListener("click", () => { beginLevelTransition(nextIdx); onUpdate?.(); });
    } else {
      endBtn.textContent = "🎉  The Season Concludes";
      endBtn.disabled = true;
    }
    container.appendChild(endBtn);
  }
}
