import BUNDLE from "../content/compiled_bundle.json";
import { CHARACTER_DEFS } from "./world";

// Human-readable descriptions for each action
const DESCRIPTIONS: Record<string, string> = {
  "exchange-pleasantries": "Two characters in the same room share small talk. Both gain charm and mutual affection.",
  "share-gossip": "Initiator shares gossip with a listener in the same room. Listener gains suspicion; initiator loses reputation.",
  "express-admiration": "Admirer (charm ≥ 3) expresses sincere admiration. Both gain affection; target gains an admiration count.",
  "deliver-slight": "Aggressor delivers a cutting remark. Target loses reputation; aggressor gains suspicion.",
  "request-dance": "Dancer (charm ≥ 2) requests a dance — ballroom only. Both gain affection and reputation.",
  "accept-proposal": "Proposee accepts a proposal (requires high mutual affection). Both gain significant reputation.",
  "rebuff-advance": "Character firmly rebuffs a pursuer who has expressed too much affection. Pursuer gains suspicion; rebuffer gains reputation.",
  "overhear-conversation": "Listener quietly overhears a speaker in the same room. Listener gains suspicion and reputation.",
  "report-to-mistress": "Staff character (is_staff = true) reports observations to their mistress in the same room. Mistress gains suspicion; staff gains loyalty.",
  "write-column": "Columnist (is_columnist = true) pens the anonymous column. Gains reputation, loses suspicion. Prevents 'secret not published' win condition.",
  "deliver-letter": "Sender hands a letter to an addressee in the same room. Addressee gains affection; sender gains reputation.",
  "present-token": "Giver (charm ≥ 2) presents a token of affection. Both gain affection; receiver gains reputation.",
  "steal-letter": "Thief furtively steals a letter from victim in the same room. Thief gains high suspicion; victim loses reputation.",
};

// Which actions each archetype prefers as initiator
const ARCHETYPE_AFFINITIES: Record<string, string[]> = {
  diamond:   ["accept-proposal", "rebuff-advance", "express-admiration"],
  rake:      ["request-dance", "express-admiration", "present-token", "deliver-slight"],
  schemer:   ["share-gossip", "steal-letter", "deliver-slight", "deliver-letter"],
  wallflower:["overhear-conversation", "exchange-pleasantries"],
  columnist: ["overhear-conversation", "write-column", "share-gossip"],
  staff:     ["overhear-conversation", "report-to-mistress"],
};

export type ActionInfo = {
  name: string;
  roles: string[];
  description: string;
  preferredBy: string[]; // archetype IDs
};

type BundleActions = Record<string, {
  conditions?: { roleConditions?: Record<string, unknown> };
}>;

export function getActionInfos(): ActionInfo[] {
  const bundleActions = (BUNDLE as unknown as { actions: BundleActions }).actions;
  return Object.entries(bundleActions).map(([name, def]) => {
    const preferredBy = Object.entries(ARCHETYPE_AFFINITIES)
      .filter(([, actions]) => actions.includes(name))
      .map(([arch]) => arch);

    return {
      name,
      roles: Object.keys(def.conditions?.roleConditions ?? {}),
      description: DESCRIPTIONS[name] ?? name,
      preferredBy,
    };
  });
}

// For each character in the current level, which actions they can initiate/receive
export type CharacterActionRole = {
  charId: string;
  role: "initiator" | "recipient" | "either";
  affinity: boolean; // archetype prefers this action
};

export function getCharacterRolesForAction(
  actionName: string,
  charIds: string[]
): CharacterActionRole[] {
  const affinityArchetypes = ARCHETYPE_AFFINITIES[actionName] ?? [];
  const result: CharacterActionRole[] = [];

  for (const charId of charIds) {
    const def = CHARACTER_DEFS[charId];
    if (!def) continue;
    const affinity = affinityArchetypes.includes(def.archetype);
    result.push({ charId, role: "either", affinity });
  }

  return result;
}
