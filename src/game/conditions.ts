import type { ActionLogEntry } from "../viv/adapter";
import { STATE } from "../viv/adapter";
import type { WinCondition } from "./levels";

export type ConditionResult = {
  met: boolean;
  description: string;
};

export function evaluateCondition(
  condition: WinCondition,
  actionLog: ActionLogEntry[],
  levelStartIndex: number
): ConditionResult {
  const levelActions = actionLog.slice(levelStartIndex);

  switch (condition.type) {
    case "affection-threshold": {
      const subject = condition.subject!;
      const threshold = condition.threshold ?? 1;
      const entity = STATE.entities[subject];
      if (!entity) return { met: false, description: condition.description };
      const count = (entity.affection_count as number) ?? 0;
      return { met: count >= threshold, description: condition.description };
    }

    case "action-occurred": {
      const actionName = condition.action!;
      const actor = condition.actor;
      const found = levelActions.some((entry) => {
        if (entry.name !== actionName) return false;
        if (actor && !entry.participants.includes(actor)) return false;
        return true;
      });
      return { met: found, description: condition.description };
    }

    case "secret-not-published": {
      const columnActions = levelActions.filter(
        (e) => e.name === "write-column"
      );
      return {
        met: columnActions.length === 0,
        description: condition.description,
      };
    }

    case "reputation-intact": {
      const subject = condition.subject!;
      const entity = STATE.entities[subject];
      if (!entity) return { met: false, description: condition.description };
      const rep = (entity.reputation as number) ?? 0;
      return { met: rep > 0, description: condition.description };
    }
  }
}

export function evaluateAllConditions(
  conditions: WinCondition[],
  actionLog: ActionLogEntry[],
  levelStartIndex: number
): ConditionResult[] {
  return conditions.map((c) => evaluateCondition(c, actionLog, levelStartIndex));
}
