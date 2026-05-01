import {
  initializeVivRuntime,
  selectAction,
} from "@siftystudio/viv-runtime";
import { ADAPTER, STATE } from "./adapter";
import { spawnCharacter, spawnItem, spawnLocation, moveCharacter } from "./world";
import { evaluateAllConditions } from "../game/conditions";
import type { LevelDef } from "../game/levels";
import { LEVELS } from "../game/levels";
import BUNDLE from "../content/compiled_bundle.json";

export type GameMode = "setup" | "running" | "paused" | "level-complete" | "game-over";

export type SimSnapshot = {
  entities: Record<string, unknown>;
  characters: string[];
  locations: string[];
  items: string[];
  actions: string[];
  actionLog: unknown[];
  timestamp: number;
};

export const SIM = {
  mode: "setup" as GameMode,
  currentLevelIndex: 0,
  stepCount: 0,
  stepHistory: [] as SimSnapshot[],
  stepHistoryCursor: -1,
  speed: 300 as number,
  levelActionStartIndex: 0,
  initialized: false,
  onUpdate: null as (() => void) | null,
  onLevelComplete: null as ((won: boolean) => void) | null,
  runInterval: null as ReturnType<typeof setTimeout> | null,
};

export function getCurrentLevel(): LevelDef {
  return LEVELS[SIM.currentLevelIndex];
}

export function initialize(): void {
  if (SIM.initialized) return;
  initializeVivRuntime({ contentBundle: BUNDLE, adapter: ADAPTER });
  SIM.initialized = true;
}

export function setupLevel(levelIndex: number): void {
  const level = LEVELS[levelIndex];
  SIM.currentLevelIndex = levelIndex;
  STATE.currentLevel = levelIndex;

  // Spawn all locations for this level
  for (const loc of level.locations) {
    spawnLocation(loc.id, loc.name);
  }

  // Spawn or relocate characters
  for (const charId of level.availableCharacters) {
    const locationId = level.defaultPositions[charId] ?? level.locations[0].id;
    spawnCharacter(charId, locationId);
  }

  SIM.levelActionStartIndex = STATE.actionLog.length;
  SIM.stepCount = 0;
  SIM.mode = "setup";
  SIM.stepHistory = [];
  SIM.stepHistoryCursor = -1;

  SIM.onUpdate?.();
}

export function setCharacterLocation(charId: string, locationId: string): void {
  moveCharacter(charId, locationId);
  SIM.onUpdate?.();
}

function snapshotState(): SimSnapshot {
  return {
    entities: structuredClone(STATE.entities) as Record<string, unknown>,
    characters: [...STATE.characters],
    locations: [...STATE.locations],
    items: [...STATE.items],
    actions: [...STATE.actions],
    actionLog: structuredClone(STATE.actionLog) as unknown[],
    timestamp: STATE.timestamp,
  };
}

function restoreSnapshot(snap: SimSnapshot): void {
  STATE.entities = snap.entities as typeof STATE.entities;
  STATE.characters = [...snap.characters];
  STATE.locations = [...snap.locations];
  STATE.items = [...snap.items];
  STATE.actions = [...snap.actions];
  STATE.actionLog = snap.actionLog as typeof STATE.actionLog;
  STATE.timestamp = snap.timestamp as typeof STATE.timestamp;
}

async function runStep(): Promise<void> {
  const level = getCurrentLevel();
  const snapshot = snapshotState();
  SIM.stepHistory.push(snapshot);
  SIM.stepHistoryCursor = SIM.stepHistory.length - 1;

  const chars = level.availableCharacters.filter(
    (id) => STATE.entities[id] !== undefined
  );

  for (const charId of chars) {
    await selectAction({ initiatorID: charId });
  }

  STATE.timestamp = (STATE.timestamp + 10) as typeof STATE.timestamp;
  SIM.stepCount++;
  SIM.onUpdate?.();

  const results = evaluateAllConditions(
    level.winConditions,
    STATE.actionLog,
    SIM.levelActionStartIndex
  );
  const allMet = results.every((r) => r.met);
  const budgetExhausted = SIM.stepCount >= level.stepBudget;

  if (allMet || budgetExhausted) {
    SIM.mode = "level-complete";
    SIM.onUpdate?.();
    SIM.onLevelComplete?.(allMet);
  }
}

export function startSim(): void {
  if (SIM.mode === "running") return;
  SIM.mode = "running";
  SIM.onUpdate?.();
  scheduleNextStep();
}

export function pauseSim(): void {
  if (SIM.runInterval !== null) {
    clearTimeout(SIM.runInterval);
    SIM.runInterval = null;
  }
  if (SIM.mode === "running") {
    SIM.mode = "paused";
    SIM.onUpdate?.();
  }
}

function scheduleNextStep(): void {
  if (SIM.mode !== "running") return;
  SIM.runInterval = setTimeout(async () => {
    if (SIM.mode !== "running") return;
    await runStep();
    if (SIM.mode === "running") {
      scheduleNextStep();
    }
  }, SIM.speed);
}

export async function stepForward(): Promise<void> {
  if (SIM.mode === "running") return;
  await runStep();
}

export function stepBack(): void {
  if (SIM.stepHistory.length === 0) return;
  const cursor =
    SIM.stepHistoryCursor >= 0
      ? SIM.stepHistoryCursor
      : SIM.stepHistory.length - 1;
  if (cursor <= 0) return;
  const snap = SIM.stepHistory[cursor - 1];
  restoreSnapshot(snap);
  SIM.stepHistoryCursor = cursor - 1;
  SIM.stepCount = Math.max(0, SIM.stepCount - 1);
  SIM.onUpdate?.();
}

export function setSpeed(ms: number): void {
  SIM.speed = ms;
  if (SIM.mode === "running") {
    if (SIM.runInterval !== null) clearTimeout(SIM.runInterval);
    scheduleNextStep();
  }
}

export function beginLevelTransition(nextLevelIndex: number): void {
  pauseSim();
  STATE.levelBreaks.push(STATE.timestamp);
  if (nextLevelIndex < LEVELS.length) {
    setupLevel(nextLevelIndex);
  } else {
    SIM.mode = "game-over";
    SIM.onUpdate?.();
  }
}

export function spawnLevelItems(levelIndex: number): void {
  if (levelIndex === 0) {
    spawnItem("letter-001", "Sealed Letter", "letter", "miss-fairfax");
    spawnItem("token-001", "Embroidered Token", "token", "lord-pembrook");
  } else if (levelIndex === 1) {
    spawnItem("letter-002", "The Cavendish Note", "letter", "lady-crane");
  } else if (levelIndex === 2) {
    spawnItem("token-002", "Gold Locket", "token", "the-rake");
  }
}

export function getConditionResults() {
  const level = getCurrentLevel();
  return evaluateAllConditions(
    level.winConditions,
    STATE.actionLog,
    SIM.levelActionStartIndex
  );
}
