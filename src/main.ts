import { initialize, setupLevel, SIM, getCurrentLevel } from "./viv/sim";
import { STATE } from "./viv/adapter";
import { renderStage, flashActionArc, setOnSelectChar } from "./ui/stage";
import { renderChronicle, setOnHighlightAction } from "./ui/chronicle";
import { renderStatePanel } from "./ui/statePanel";
import { renderControls, setControlsUpdateCallback } from "./ui/controls";

let selectedCharId: string | null = null;
let stageSvg: SVGSVGElement;
let chronicleDiv: HTMLElement;
let statePanelDiv: HTMLElement;
let controlsDiv: HTMLElement;
let headerDiv: HTMLElement;

function update(): void {
  const level = getCurrentLevel();

  headerDiv.innerHTML = `
    <div class="header-level">${level.name}</div>
    <div class="header-brief">${level.brief}</div>
    <div class="header-status">
      ${STATE.timestamp > 0 ? `T=${STATE.timestamp}` : ""}
      ${SIM.mode === "running" ? '<span class="badge badge--running">Running</span>' : ""}
      ${SIM.mode === "paused" ? '<span class="badge badge--paused">Paused</span>' : ""}
      ${SIM.mode === "setup" ? '<span class="badge badge--setup">Setup</span>' : ""}
      ${SIM.mode === "level-complete" ? '<span class="badge badge--done">Level Complete</span>' : ""}
      ${SIM.mode === "game-over" ? '<span class="badge badge--done">Season Over</span>' : ""}
    </div>
  `;

  renderStage(stageSvg);
  renderChronicle(chronicleDiv);
  renderStatePanel(statePanelDiv, selectedCharId);
  renderControls(controlsDiv);
}

function bootstrap(): void {
  stageSvg = document.getElementById("stage-svg") as unknown as SVGSVGElement;
  chronicleDiv = document.getElementById("chronicle") as HTMLElement;
  statePanelDiv = document.getElementById("state-panel") as HTMLElement;
  controlsDiv = document.getElementById("controls") as HTMLElement;
  headerDiv = document.getElementById("header-info") as HTMLElement;

  setOnSelectChar((id) => {
    selectedCharId = id;
    renderStatePanel(statePanelDiv, selectedCharId);
  });

  setOnHighlightAction(() => {
    renderChronicle(chronicleDiv);
  });

  setControlsUpdateCallback(update);

  SIM.onUpdate = () => {
    update();
    // Flash arcs for the most recent action
    const lastAction = STATE.actionLog[STATE.actionLog.length - 1];
    if (lastAction) {
      flashActionArc(lastAction.participants);
    }
  };

  SIM.onLevelComplete = (won: boolean) => {
    const banner = document.getElementById("level-banner") as HTMLElement;
    if (banner) {
      banner.textContent = won
        ? `✓ Level complete! All objectives achieved.`
        : `Time's up — the event concludes.`;
      banner.className = `level-banner ${won ? "level-banner--won" : "level-banner--timeout"}`;
      banner.style.display = "block";
      setTimeout(() => {
        banner.style.display = "none";
      }, 3000);
    }
    update();
  };

  initialize();
  setupLevel(0);
  update();
}

document.addEventListener("DOMContentLoaded", bootstrap);
