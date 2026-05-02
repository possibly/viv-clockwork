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

export const STATE = {
  timestamp: 0 as DiegeticTimestamp,
  entities: {} as Record<UID, EntityView>,
  characters: [] as UID[],
  locations: [] as UID[],
  items: [] as UID[],
  actions: [] as UID[],
  vivInternalState: null as VivInternalState | null,
};

export const ADAPTER: HostApplicationAdapter = {
  provisionActionID: () => crypto.randomUUID(),

  getEntityView: (id) => {
    if (STATE.entities[id] === undefined)
      throw new Error(`No entity: ${id}`);
    return structuredClone(STATE.entities[id]);
  },

  getEntityLabel: (id) => {
    if (STATE.entities[id] === undefined)
      throw new Error(`No entity: ${id}`);
    return STATE.entities[id].name as string;
  },

  updateEntityProperty: (id, path, value) => {
    if (STATE.entities[id] === undefined)
      throw new Error(`No entity: ${id}`);
    set(STATE.entities[id], path, value);
  },

  saveActionData: (id, data) => {
    if (STATE.entities[id] === undefined) STATE.actions.push(id);
    STATE.entities[id] = data;
  },

  getCurrentTimestamp: () => STATE.timestamp,

  getEntityIDs: (type, locationID?) => {
    if (locationID !== undefined) {
      if (type === EntityType.Character)
        return STATE.characters.filter((id) => STATE.entities[id]?.location === locationID);
      if (type === EntityType.Item)
        return STATE.items.filter((id) => STATE.entities[id]?.location === locationID);
      throw new Error(`Invalid type for location query: ${type}`);
    }
    switch (type) {
      case EntityType.Character: return [...STATE.characters];
      case EntityType.Item:      return [...STATE.items];
      case EntityType.Location:  return [...STATE.locations];
      case EntityType.Action:    return [...STATE.actions];
      default: throw new Error(`Unknown type: ${type}`);
    }
  },

  getVivInternalState: () => structuredClone(STATE.vivInternalState),

  saveVivInternalState: (s) => {
    STATE.vivInternalState = structuredClone(s);
  },

  saveCharacterMemory: (charID, actionID, memory) => {
    (STATE.entities[charID] as CharacterView).memories[actionID] = memory;
  },

  saveItemInscriptions: (itemID, inscriptions) => {
    STATE.entities[itemID].inscriptions = inscriptions;
  },
};

// ── Entity helpers ────────────────────────────────────────────────────────────

export function addLocation(id: UID, name: string): void {
  STATE.locations.push(id);
  STATE.entities[id] = { entityType: EntityType.Location, id, name };
}

export function addCharacter(
  id: UID,
  name: string,
  locationId: UID,
  props: Record<string, unknown>
): void {
  STATE.characters.push(id);
  STATE.entities[id] = {
    entityType: EntityType.Character,
    id,
    name,
    location: locationId,
    memories: {},
    affection: {},
    ...props,
  };
}

export function getActionReport(actionId: UID): string {
  const a = STATE.entities[actionId] as ActionView | undefined;
  return a?.report ?? a?.gloss ?? "";
}

export function getActionName(actionId: UID): string {
  const a = STATE.entities[actionId] as ActionView | undefined;
  return (a?.name as string) ?? "";
}

export function getActionParticipants(actionId: UID): UID[] {
  const a = STATE.entities[actionId] as ActionView | undefined;
  if (!a?.bindings) return [];
  const ids: UID[] = [];
  for (const v of Object.values(a.bindings)) {
    if (typeof v === "string" && STATE.characters.includes(v)) {
      if (!ids.includes(v)) ids.push(v);
    }
  }
  return ids;
}
