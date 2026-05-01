import { EntityType } from "@siftystudio/viv-runtime";
import { STATE } from "./adapter";

export type CharacterArchetype =
  | "diamond"
  | "schemer"
  | "rake"
  | "wallflower"
  | "columnist"
  | "staff";

export type CharacterDef = {
  id: string;
  name: string;
  archetype: CharacterArchetype;
  charm: number;
  reputation: number;
  is_columnist: boolean;
  is_staff: boolean;
  staff_loyalty: number;
  employer: string;
  color: string;
};

export type LocationDef = {
  id: string;
  name: string;
};

export type ItemDef = {
  id: string;
  name: string;
  item_type: string;
};

export const CHARACTER_DEFS: Record<string, CharacterDef> = {
  "miss-fairfax": {
    id: "miss-fairfax",
    name: "Miss Fairfax",
    archetype: "diamond",
    charm: 5,
    reputation: 7,
    is_columnist: false,
    is_staff: false,
    staff_loyalty: 0,
    employer: "",
    color: "#e91e8c",
  },
  "lord-pembrook": {
    id: "lord-pembrook",
    name: "Lord Pembrook",
    archetype: "rake",
    charm: 6,
    reputation: 6,
    is_columnist: false,
    is_staff: false,
    staff_loyalty: 0,
    employer: "",
    color: "#1976d2",
  },
  "lady-crane": {
    id: "lady-crane",
    name: "Lady Crane",
    archetype: "schemer",
    charm: 4,
    reputation: 5,
    is_columnist: false,
    is_staff: false,
    staff_loyalty: 0,
    employer: "",
    color: "#7b1fa2",
  },
  "mr-hart": {
    id: "mr-hart",
    name: "Mr Hart",
    archetype: "wallflower",
    charm: 2,
    reputation: 4,
    is_columnist: false,
    is_staff: false,
    staff_loyalty: 0,
    employer: "",
    color: "#388e3c",
  },
  "the-rake": {
    id: "the-rake",
    name: "The Viscount",
    archetype: "rake",
    charm: 7,
    reputation: 4,
    is_columnist: false,
    is_staff: false,
    staff_loyalty: 0,
    employer: "",
    color: "#f57c00",
  },
  "whistledown": {
    id: "whistledown",
    name: "The Columnist",
    archetype: "columnist",
    charm: 3,
    reputation: 6,
    is_columnist: true,
    is_staff: false,
    staff_loyalty: 0,
    employer: "",
    color: "#795548",
  },
  "the-schemer": {
    id: "the-schemer",
    name: "Lord Cavendish",
    archetype: "schemer",
    charm: 3,
    reputation: 3,
    is_columnist: false,
    is_staff: false,
    staff_loyalty: 0,
    employer: "",
    color: "#d32f2f",
  },
  "maid-lucy": {
    id: "maid-lucy",
    name: "Lucy (Maid)",
    archetype: "staff",
    charm: 1,
    reputation: 2,
    is_columnist: false,
    is_staff: true,
    staff_loyalty: 3,
    employer: "lady-crane",
    color: "#9e9e9e",
  },
  "butler-graves": {
    id: "butler-graves",
    name: "Graves (Butler)",
    archetype: "staff",
    charm: 1,
    reputation: 3,
    is_columnist: false,
    is_staff: true,
    staff_loyalty: 5,
    employer: "miss-fairfax",
    color: "#607d8b",
  },
};

export function spawnCharacter(id: string, locationId: string): void {
  const def = CHARACTER_DEFS[id];
  if (!def) throw new Error(`Unknown character: ${id}`);
  if (STATE.entities[id]) {
    STATE.entities[id].location = locationId;
    return;
  }
  STATE.characters.push(id);
  STATE.entities[id] = {
    entityType: EntityType.Character,
    id,
    name: def.name,
    location: locationId,
    charm: def.charm,
    reputation: def.reputation,
    affection: {} as Record<string, number>,
    affection_count: 0,
    suspicion: 0,
    archetype: def.archetype,
    is_columnist: def.is_columnist,
    is_staff: def.is_staff,
    staff_loyalty: def.staff_loyalty,
    employer: def.employer,
    column_count: 0,
    memories: {},
  };
}

export function spawnLocation(id: string, name: string): void {
  if (STATE.entities[id]) return;
  STATE.locations.push(id);
  STATE.entities[id] = {
    entityType: EntityType.Location,
    id,
    name,
  };
}

export function spawnItem(id: string, name: string, itemType: string, ownerId: string): void {
  if (STATE.entities[id]) {
    STATE.entities[id].location = ownerId;
    return;
  }
  STATE.items.push(id);
  STATE.entities[id] = {
    entityType: EntityType.Item,
    id,
    name,
    item_type: itemType,
    location: ownerId,
  };
}

export function moveCharacter(id: string, locationId: string): void {
  if (STATE.entities[id]) {
    STATE.entities[id].location = locationId;
  }
}
