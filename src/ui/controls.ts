import { SIM, getCurrentLevel, startSim, pauseSim, stepForward, stepBack, setSpeed, beginLevelTransition, spawnLevelItems, getConditionResults, setupLevel } from "../viv/sim";
import { STATE } from "../viv/adapter";
import { CHARACTER_DEFS } from "../viv/world";
import { LEVELS } from "../game/levels";

let onUpdate: (() => void) | null = null;
let dragSource: string | null = null;

export function setControlsUpdateCallback(cb: () => void): void {
  onUpdate = cb;
}

export function renderControls(container: HTMLElement): void {
  container.innerHTML = "";

  const level = getCurrentLevel();
  const results = getConditionResults();
  const allMet = results.every((r) => r.met);

  // Win conditions display
  const condDiv = document.createElement("div");
  condDiv.className = "win-conditions";
  for (const result of results) {
    const item = document.createElement("div");
    item.className = `win-condition ${result.met ? "win-condition--met" : ""}`;
    item.textContent = `${result.met ? "✓" : "○"} ${result.description}`;
    condDiv.appendChild(item);
  }
  container.appendChild(condDiv);

  if (SIM.mode === "setup") {
    renderSetupControls(container);
  } else {
    renderRunControls(container, allMet);
  }
}

function renderSetupControls(container: HTMLElement): void {
  const level = getCurrentLevel();

  const setupDiv = document.createElement("div");
  setupDiv.className = "setup-controls";

  const instructions = document.createElement("p");
  instructions.className = "setup-instructions";
  instructions.textContent = "Drag characters to rooms to position them. Then click Run to begin.";
  setupDiv.appendChild(instructions);

  // Character tray
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
    const nameSpan = document.createElement("span");
    nameSpan.textContent = entity.name as string;
    chip.appendChild(nameSpan);
    const locSpan = document.createElement("span");
    locSpan.className = "char-loc";
    locSpan.textContent = `@ ${entity.location as string}`;
    chip.appendChild(locSpan);

    chip.addEventListener("dragstart", () => {
      dragSource = charId;
    });

    tray.appendChild(chip);
  }
  setupDiv.appendChild(tray);

  // Location drop targets
  const locDiv = document.createElement("div");
  locDiv.className = "location-targets";
  for (const loc of level.locations) {
    const locBtn = document.createElement("div");
    locBtn.className = "location-drop-target";
    locBtn.dataset.locationId = loc.id;
    locBtn.textContent = loc.name;

    locBtn.addEventListener("dragover", (e) => {
      e.preventDefault();
      locBtn.classList.add("dragover");
    });
    locBtn.addEventListener("dragleave", () => {
      locBtn.classList.remove("dragover");
    });
    locBtn.addEventListener("drop", (e) => {
      e.preventDefault();
      locBtn.classList.remove("dragover");
      if (dragSource) {
        STATE.entities[dragSource].location = loc.id;
        dragSource = null;
        onUpdate?.();
      }
    });

    locDiv.appendChild(locBtn);
  }
  setupDiv.appendChild(locDiv);

  const runBtn = document.createElement("button");
  runBtn.className = "btn btn--primary";
  runBtn.textContent = "▶ Run Simulation";
  runBtn.addEventListener("click", () => {
    spawnLevelItems(SIM.currentLevelIndex);
    startSim();
    onUpdate?.();
  });
  setupDiv.appendChild(runBtn);

  container.appendChild(setupDiv);
}

function renderRunControls(container: HTMLElement, allMet: boolean): void {
  const level = getCurrentLevel();
  const runDiv = document.createElement("div");
  runDiv.className = "run-controls";

  const stepInfo = document.createElement("span");
  stepInfo.className = "step-info";
  stepInfo.textContent = `Step: ${SIM.stepCount} / ${level.stepBudget}`;
  runDiv.appendChild(stepInfo);

  const btnRow = document.createElement("div");
  btnRow.className = "btn-row";

  const pauseBtn = document.createElement("button");
  pauseBtn.className = "btn";
  pauseBtn.textContent = SIM.mode === "running" ? "⏸ Pause" : "▶ Resume";
  pauseBtn.addEventListener("click", () => {
    if (SIM.mode === "running") {
      pauseSim();
    } else if (SIM.mode === "paused") {
      startSim();
    }
    onUpdate?.();
  });
  btnRow.appendChild(pauseBtn);

  const backBtn = document.createElement("button");
  backBtn.className = "btn";
  backBtn.textContent = "↩ Step Back";
  backBtn.disabled = SIM.stepHistory.length <= 1;
  backBtn.addEventListener("click", () => {
    pauseSim();
    stepBack();
    onUpdate?.();
  });
  btnRow.appendChild(backBtn);

  const fwdBtn = document.createElement("button");
  fwdBtn.className = "btn";
  fwdBtn.textContent = "→ Step Fwd";
  fwdBtn.addEventListener("click", async () => {
    pauseSim();
    await stepForward();
    onUpdate?.();
  });
  btnRow.appendChild(fwdBtn);

  runDiv.appendChild(btnRow);

  // Speed controls
  const speedRow = document.createElement("div");
  speedRow.className = "speed-row";
  const speedLabel = document.createElement("span");
  speedLabel.textContent = "Speed:";
  speedRow.appendChild(speedLabel);

  const speeds = [
    { label: "Slow", ms: 900 },
    { label: "Med", ms: 300 },
    { label: "Fast", ms: 60 },
  ];
  for (const s of speeds) {
    const btn = document.createElement("button");
    btn.className = `btn btn--speed ${SIM.speed === s.ms ? "btn--speed-active" : ""}`;
    btn.textContent = s.label;
    btn.addEventListener("click", () => {
      setSpeed(s.ms);
      onUpdate?.();
    });
    speedRow.appendChild(btn);
  }
  runDiv.appendChild(speedRow);

  // End level / Next level button
  if (SIM.mode === "level-complete" || allMet || SIM.stepCount >= level.stepBudget) {
    const nextIdx = SIM.currentLevelIndex + 1;
    const endBtn = document.createElement("button");
    endBtn.className = "btn btn--primary";
    if (nextIdx < LEVELS.length) {
      endBtn.textContent = `→ Next: ${LEVELS[nextIdx].name}`;
      endBtn.addEventListener("click", () => {
        beginLevelTransition(nextIdx);
        onUpdate?.();
      });
    } else {
      endBtn.textContent = "🎉 The Season Ends";
      endBtn.disabled = true;
    }
    runDiv.appendChild(endBtn);
  }

  container.appendChild(runDiv);
}
