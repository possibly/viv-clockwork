import type {
  ActionView,
  CharacterView,
  DiegeticTimestamp,
  EntityView,
  HostApplicationAdapter,
  UID,
  VivInternalState,
} from "@siftystudio/viv-runtime";
import { EntityType } from "@siftystudio/viv-runtime";
import set from "lodash/set";

export type ActionLogEntry = {
  id: UID;
  name: string;
  gloss: string;
  timestamp: number;
  level: number;
  participants: UID[];
};

export type ActionNode = {
  id: string;
  name: string;
  gloss: string;
  timestamp: number;
  level: number;
  participants: string[];
  causes: string[];
};

export const STATE = {
  timestamp: 0 as DiegeticTimestamp,
  entities: {} as Record<UID, EntityView>,
  characters: [] as UID[],
  locations: [] as UID[],
  items: [] as UID[],
  actions: [] as UID[],
  vivInternalState: null as VivInternalState | null,
  // Game layer state
  actionLog: [] as ActionLogEntry[],
  levelBreaks: [] as number[],
  actionGraph: [] as ActionNode[],
  currentLevel: 0,
};

export const ADAPTER: HostApplicationAdapter = {
  provisionActionID: () => crypto.randomUUID(),

  getEntityView: (id) => {
    if (STATE.entities[id] === undefined) {
      throw new Error(`Cannot furnish view for undefined entity ID: ${id}`);
    }
    return structuredClone(STATE.entities[id]);
  },

  getEntityLabel: (id) => {
    if (STATE.entities[id] === undefined) {
      throw new Error(`Cannot furnish label for undefined entity ID: ${id}`);
    }
    return (STATE.entities[id].name as string) ?? id;
  },

  updateEntityProperty: (id, path, value) => {
    if (STATE.entities[id] === undefined) {
      throw new Error(`Cannot update property on undefined entity ID: ${id}`);
    }
    set(STATE.entities[id], path, value);
  },

  saveActionData: (id, data) => {
    if (STATE.entities[id] === undefined) {
      STATE.actions.push(id);
    }
    STATE.entities[id] = data;

    const action = data as ActionView;
    const bindings = action.bindings ?? {};
    const participants: UID[] = [];
    for (const role of Object.values(bindings)) {
      if (typeof role === "string" && STATE.characters.includes(role)) {
        if (!participants.includes(role)) participants.push(role);
      }
    }

    const entry: ActionLogEntry = {
      id,
      name: action.name ?? "",
      gloss: action.gloss ?? action.report ?? "(action performed)",
      timestamp: action.timestamp as number ?? STATE.timestamp,
      level: STATE.currentLevel,
      participants,
    };

    const existing = STATE.actionLog.findIndex((e) => e.id === id);
    if (existing >= 0) {
      STATE.actionLog[existing] = entry;
    } else {
      STATE.actionLog.push(entry);
    }

    const node: ActionNode = {
      id,
      name: action.name ?? "",
      gloss: action.gloss ?? "",
      timestamp: action.timestamp as number ?? STATE.timestamp,
      level: STATE.currentLevel,
      participants,
      causes: (action.causes as string[]) ?? [],
    };
    const existingNode = STATE.actionGraph.findIndex((n) => n.id === id);
    if (existingNode >= 0) {
      STATE.actionGraph[existingNode] = node;
    } else {
      STATE.actionGraph.push(node);
    }
  },

  getCurrentTimestamp: () => STATE.timestamp,

  getEntityIDs: (type, locationID?) => {
    if (locationID !== undefined) {
      if (type === EntityType.Character) {
        return STATE.characters.filter(
          (id) => STATE.entities[id]?.location === locationID
        );
      }
      if (type === EntityType.Item) {
        return STATE.items.filter(
          (id) => STATE.entities[id]?.location === locationID
        );
      }
      throw new Error(`Invalid entity type for location query: ${type}`);
    }
    switch (type) {
      case EntityType.Character:
        return [...STATE.characters];
      case EntityType.Item:
        return [...STATE.items];
      case EntityType.Location:
        return [...STATE.locations];
      case EntityType.Action:
        return [...STATE.actions];
      default:
        throw new Error(`Invalid entity type: ${type}`);
    }
  },

  getVivInternalState: () => structuredClone(STATE.vivInternalState),

  saveVivInternalState: (vivInternalState) => {
    STATE.vivInternalState = structuredClone(vivInternalState);
  },

  saveCharacterMemory: (characterID, actionID, memory) => {
    (STATE.entities[characterID] as CharacterView).memories[actionID] = memory;
  },

  saveItemInscriptions: (itemID, inscriptions) => {
    STATE.entities[itemID].inscriptions = inscriptions;
  },
};
