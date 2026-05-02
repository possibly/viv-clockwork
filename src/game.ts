import { initializeVivRuntime, selectAction } from "@siftystudio/viv-runtime";
import { STATE, ADAPTER, addLocation, addCharacter, getActionName } from "./adapter";
import type { ActionView } from "@siftystudio/viv-runtime";
import BUNDLE from "./content/bundle.json";

// ── Character definitions ─────────────────────────────────────────────────────

export type CharDef = {
  id: string;
  name: string;
  title: string;       // short title shown on card
  color: string;       // primary colour
  colorDark: string;   // darker shade for borders / text
  charm: number;
  archetype: "gentleman" | "lady";
};

export const CHARACTERS: CharDef[] = [
  {
    id: "lord-ashworth",
    name: "Lord Ashworth",
    title: "The Viscount",
    color: "#1e3a6b",
    colorDark: "#0f1f3d",
    charm: 5,
    archetype: "gentleman",
  },
  {
    id: "miss-pemberton",
    name: "Miss Pemberton",
    title: "The Diamond",
    color: "#7b1a40",
    colorDark: "#4a0f26",
    charm: 3,
    archetype: "lady",
  },
];

// ── Moment (fired action, ready for display) ──────────────────────────────────

export type Moment = {
  id: string;
  action: string;       // action name
  report: string;       // narrative text from viv
  participants: string[];
  timestamp: number;
};

// ── Game state ────────────────────────────────────────────────────────────────

export const GAME = {
  phase: "setup" as "setup" | "running" | "won",
  placedCharacters: new Set<string>(),
  moments: [] as Moment[],
  stepCount: 0,
  goalMet: false,
  // Callbacks wired by main
  onMoment: null as ((m: Moment) => void) | null,
  onGoalMet: null as (() => void) | null,
  onTick: null as (() => void) | null,
};

// ── Boot ──────────────────────────────────────────────────────────────────────

let vivReady = false;

export function boot(): void {
  if (vivReady) return;
  initializeVivRuntime({ contentBundle: BUNDLE, adapter: ADAPTER });
  vivReady = true;

  // Ballroom is always present
  addLocation("ballroom", "The Ashford Ballroom");

  // Characters start "offstage" (location = their own id, treated as tray).
  // Affection is pre-seeded to 0 for every pair so the runtime never encounters
  // an undefined lookup when evaluating conditions like `affection[@recipient] >= 3`.
  for (const def of CHARACTERS) {
    addCharacter(def.id, def.name, def.id /* offstage */, {
      charm: def.charm,
      archetype: def.archetype,
      affection: 0,
    });
  }
}

// ── Placing characters ────────────────────────────────────────────────────────

export function placeCharacter(charId: string): void {
  if (!STATE.entities[charId]) return;
  STATE.entities[charId].location = "ballroom";
  GAME.placedCharacters.add(charId);
  GAME.onTick?.();
}

export function canStart(): boolean {
  return GAME.placedCharacters.size === CHARACTERS.length && GAME.phase === "setup";
}

// ── Sim loop ──────────────────────────────────────────────────────────────────

const STEP_MS = 1600;
let stepTimer: ReturnType<typeof setTimeout> | null = null;

export function startEvening(): void {
  if (!canStart()) return;
  GAME.phase = "running";
  GAME.onTick?.();
  scheduleStep();
}

function scheduleStep(): void {
  stepTimer = setTimeout(runStep, STEP_MS);
}

async function runStep(): Promise<void> {
  if (GAME.phase !== "running") return;

  const actionsBefore = STATE.actions.length;

  // One action per step. The character with higher affection initiates;
  // the runtime role-casts the other as partner.
  const initiatorId = CHARACTERS.reduce((best, c) =>
    getAffection(c.id) >= getAffection(best) ? c.id : best,
    CHARACTERS[0].id
  );
  await selectAction({ initiatorID: initiatorId });

  STATE.timestamp = (STATE.timestamp + 10) as typeof STATE.timestamp;
  GAME.stepCount++;

  // Collect newly fired actions
  for (let i = actionsBefore; i < STATE.actions.length; i++) {
    const actionId = STATE.actions[i];
    const a = STATE.entities[actionId] as ActionView;
    const name = getActionName(actionId);
    const report = (a.report ?? a.gloss ?? "") as string;

    const participants: string[] = [];
    if (a.bindings) {
      for (const candidates of Object.values(a.bindings)) {
        for (const v of candidates) {
          if (typeof v === "string" && STATE.characters.includes(v) && !participants.includes(v))
            participants.push(v);
        }
      }
    }

    const moment: Moment = {
      id: actionId,
      action: name,
      report,
      participants,
      timestamp: STATE.timestamp,
    };

    GAME.moments.push(moment);
    GAME.onMoment?.(moment);

    if (name === "request-dance" && !GAME.goalMet) {
      GAME.goalMet = true;
      setTimeout(() => {
        GAME.phase = "won";
        GAME.onGoalMet?.();
      }, 2200); // let the moment card show first
    }
  }

  GAME.onTick?.();

  if (GAME.phase === "running") scheduleStep();
}

// ── Character state helpers ───────────────────────────────────────────────────

export function getAffection(charId: string): number {
  return (STATE.entities[charId]?.affection as number) ?? 0;
}

export function getCharm(charId: string): number {
  return (STATE.entities[charId]?.charm as number) ?? 0;
}
