import { initialize, setupLevel, SIM, getCurrentLevel } from "./viv/sim";
import { STATE } from "./viv/adapter";
import { renderStage, flashActionArc, setOnSelectChar } from "./ui/stage";
import { renderChronicle, setOnHighlightAction } from "./ui/chronicle";
import { renderStatePanel } from "./ui/statePanel";
import { renderGoalsTab, setControlsUpdateCallback } from "./ui/controls";
import { renderActionExplorer } from "./ui/actionExplorer";
import { renderActionGraph } from "./ui/actionGraph";
import { initTabs, switchTab, getActiveTab } from "./ui/tabs";

let selectedCharId: string | null = null;
let stageSvg: SVGSVGElement;

// Tab content containers
const tabs = {
  goals:     () => document.getElementById("tab-goals")!,
  chronicle: () => document.getElementById("tab-chronicle")!,
  inspect:   () => document.getElementById("tab-inspect")!,
  actions:   () => document.getElementById("tab-actions")!,
  graph:     () => document.getElementById("tab-graph")!,
};

function renderActiveTab(): void {
  const tab = getActiveTab();
  switch (tab) {
    case "goals":
      renderGoalsTab(tabs.goals());
      break;
    case "chronicle":
      renderChronicle(tabs.chronicle());
      break;
    case "inspect":
      renderStatePanel(tabs.inspect(), selectedCharId);
      break;
    case "actions":
      renderActionExplorer(tabs.actions());
      break;
    case "graph":
      renderActionGraph(tabs.graph());
      break;
  }
}

function updateHeader(): void {
  const level = getCurrentLevel();
  const statusEl = document.getElementById("header-status")!;
  const modeLabel: Record<string, string> = {
    setup: "Setup", running: "Running", paused: "Paused",
    "level-complete": "Done", "game-over": "Season Over",
  };
  const modeCls: Record<string, string> = {
    setup: "badge--setup", running: "badge--running", paused: "badge--paused",
    "level-complete": "badge--done", "game-over": "badge--done",
  };

  statusEl.innerHTML = `
    <span class="header-level">${level.name}</span>
    ${STATE.timestamp > 0 ? `<span class="ts-badge">T=${STATE.timestamp}</span>` : ""}
    <span class="badge ${modeCls[SIM.mode] ?? ""}">${modeLabel[SIM.mode] ?? SIM.mode}</span>
  `;
}

function update(): void {
  updateHeader();
  renderStage(stageSvg);
  renderActiveTab();
}

function onSelectCharacter(id: string | null): void {
  selectedCharId = id;
  // Switch to inspect tab when a character is tapped
  if (id !== null) {
    switchTab("inspect");
  } else {
    renderStatePanel(tabs.inspect(), null);
  }
}

function bootstrap(): void {
  stageSvg = document.getElementById("stage-svg") as unknown as SVGSVGElement;

  initTabs((tab) => {
    renderActiveTab();
    // Re-render chronicle immediately so it's scrolled to bottom
    if (tab === "chronicle") {
      renderChronicle(tabs.chronicle());
    }
  });

  setOnSelectChar(onSelectCharacter);

  setOnHighlightAction(() => {
    if (getActiveTab() === "chronicle") {
      renderChronicle(tabs.chronicle());
    }
  });

  setControlsUpdateCallback(update);

  SIM.onUpdate = () => {
    update();
    const lastAction = STATE.actionLog[STATE.actionLog.length - 1];
    if (lastAction) {
      flashActionArc(lastAction.participants);
      // Auto-append to chronicle if it's open (don't re-render fully for perf)
      if (getActiveTab() === "chronicle") {
        renderChronicle(tabs.chronicle());
      }
    }
  };

  SIM.onLevelComplete = (won: boolean) => {
    const banner = document.getElementById("level-banner")!;
    banner.textContent = won
      ? "✓ All objectives achieved!"
      : "Time's up — the event concludes.";
    banner.className = `level-banner ${won ? "level-banner--won" : "level-banner--timeout"}`;
    banner.style.display = "block";
    setTimeout(() => { banner.style.display = "none"; }, 3000);
    update();
  };

  initialize();
  setupLevel(0);
  update();
}

document.addEventListener("DOMContentLoaded", bootstrap);
