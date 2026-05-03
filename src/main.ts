import {
  boot, startEvening, canStart, placeCharacter,
  GAME, CHARACTERS, getAffection,
} from "./game";
import {
  buildRoomSVG, updateStage, wireDropZone,
  pulseCharacters, setTapPendingChar, getTapPendingChar, clearTapPending,
} from "./stage";
import { showMomentCard, appendScrollEntry, celebrateGoal } from "./moments";

// ── Action catalogue (mirrors scene.viv) ─────────────────────────────────────

type ActionInfo = { id: string; label: string; minAff: number };

const ACTION_CATALOGUE: ActionInfo[] = [
  { id: "exchange-pleasantries", label: "Exchange Pleasantries", minAff: 0  },
  { id: "offer-compliment",      label: "Offer a Compliment",    minAff: 5  },
  { id: "show-interest",         label: "Show Interest",         minAff: 12 },
  { id: "request-dance",         label: "Request a Dance",       minAff: 20 },
];

function renderActionRows(charId: string): string {
  const placed = GAME.placedCharacters.has(charId);
  const aff = placed ? getAffection(charId) : 0;

  return ACTION_CATALOGUE.map((a) => {
    const available = placed && aff >= a.minAff;
    const req = a.minAff > 0 && !available
      ? `<span class="action-req">${aff}/${a.minAff} aff</span>`
      : "";
    return `
      <div class="action-row${available ? " action-row--on" : ""}">
        <span class="action-dot${available ? " action-dot--on" : ""}"></span>
        <span class="action-label">${a.label}</span>
        ${req}
      </div>`;
  }).join("");
}

// ── DOM refs ──────────────────────────────────────────────────────────────────

const svgEl       = document.getElementById("stage-svg") as unknown as SVGSVGElement;
const guestList   = document.getElementById("guest-list")!;
const beginBtn    = document.getElementById("begin-btn") as HTMLButtonElement;
const goalEl      = document.getElementById("goal-indicator")!;
const momentWrap  = document.getElementById("moment-wrap")!;
const scrollEl       = document.getElementById("chronicle-scroll")!;
const scrollMobile   = document.getElementById("chronicle-scroll-mobile")!;

// ── Bootstrap ─────────────────────────────────────────────────────────────────

boot();
buildRoomSVG(svgEl);
renderGuestList();
renderGoal();
render();

// ── Stage drop zone ───────────────────────────────────────────────────────────

wireDropZone(svgEl, (charId) => {
  refreshGuestCard(charId);
  render();
});

// ── Guest list ────────────────────────────────────────────────────────────────

function renderGuestList(): void {
  guestList.innerHTML = "";
  for (const def of CHARACTERS) {
    const card = document.createElement("div");
    card.id = `guest-card-${def.id}`;
    card.className = "guest-card";
    card.draggable = true;
    card.style.setProperty("--char-color", def.color);
    card.style.setProperty("--char-dark", def.colorDark);
    card.innerHTML = `
      <div class="guest-top">
        <div class="guest-portrait" style="background:${def.color}">
          <span class="guest-initial">${def.name[0]}</span>
        </div>
        <div class="guest-info">
          <div class="guest-name">${def.name}</div>
          <div class="guest-title">${def.title}</div>
        </div>
        <div class="guest-status" id="guest-status-${def.id}">Awaiting placement</div>
      </div>
      <div class="guest-actions" id="guest-actions-${def.id}">
        ${renderActionRows(def.id)}
      </div>
    `;

    // Desktop drag
    card.addEventListener("dragstart", (e) => {
      (e as DragEvent).dataTransfer?.setData("text/plain", def.id);
      clearTapPending();
    });

    // Mobile tap-to-select, then tap stage
    card.addEventListener("click", (e) => {
      e.stopPropagation();
      if (GAME.placedCharacters.has(def.id)) return;
      const alreadySelected = getTapPendingChar() === def.id;
      clearTapPending();
      document.querySelectorAll(".guest-card").forEach((c) => c.classList.remove("guest-card--selected"));
      if (!alreadySelected) {
        setTapPendingChar(def.id);
        card.classList.add("guest-card--selected");
      }
    });

    guestList.appendChild(card);
  }
}

function refreshGuestCard(charId: string): void {
  const statusEl = document.getElementById(`guest-status-${charId}`);
  if (statusEl) statusEl.textContent = "In the ballroom";
  const card = document.getElementById(`guest-card-${charId}`);
  card?.classList.add("guest-card--placed");
  card?.classList.remove("guest-card--selected");
}

// ── Goal indicator ────────────────────────────────────────────────────────────

function renderGoal(): void {
  goalEl.innerHTML = `
    <div class="goal-seal">✦</div>
    <div class="goal-text">
      <div class="goal-heading">This Evening's Ambition</div>
      <div class="goal-desc">Secure a dance before the evening ends</div>
    </div>
  `;
}

// ── Begin button ──────────────────────────────────────────────────────────────

beginBtn.addEventListener("click", () => {
  if (!canStart()) return;
  startEvening();
  beginBtn.disabled = true;
  beginBtn.textContent = "The Evening Unfolds…";
  render();
});

// ── Game callbacks ────────────────────────────────────────────────────────────

GAME.onMoment = (moment) => {
  pulseCharacters(moment.participants);
  showMomentCard(moment, momentWrap);
  appendScrollEntry(moment, scrollEl);
  appendScrollEntry(moment, scrollMobile);
  render();
};

GAME.onGoalMet = () => {
  celebrateGoal(goalEl, momentWrap);
  render();
};

GAME.onTick = render;

// ── Render ────────────────────────────────────────────────────────────────────

function render(): void {
  updateStage(svgEl);
  beginBtn.disabled = !canStart();
  if (canStart() && GAME.phase === "setup") {
    beginBtn.textContent = "Begin the Evening";
    beginBtn.classList.add("begin-btn--ready");
  }
  for (const def of CHARACTERS) {
    const el = document.getElementById(`guest-actions-${def.id}`);
    if (el) el.innerHTML = renderActionRows(def.id);
  }
}

// Continuous repaint for pulse animations (only while running)
let rafId = 0;
function continuousRender(): void {
  updateStage(svgEl);
  rafId = requestAnimationFrame(continuousRender);
}
continuousRender();
