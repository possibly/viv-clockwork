export type WinConditionType =
  | "affection-threshold"
  | "action-occurred"
  | "secret-not-published"
  | "reputation-intact";

export type WinCondition = {
  type: WinConditionType;
  subject?: string;
  action?: string;
  actor?: string;
  threshold?: number;
  secret?: string;
  description: string;
};

export type LevelDef = {
  index: number;
  name: string;
  brief: string;
  locations: { id: string; name: string }[];
  availableCharacters: string[];
  defaultPositions: Record<string, string>;
  winConditions: WinCondition[];
  stepBudget: number;
};

export const LEVELS: LevelDef[] = [
  {
    index: 0,
    name: "The Ashford Ball",
    brief:
      "Lady Ashford's ball opens the season. Lord Pembrook has not yet spoken to anyone new. Miss Fairfax needs two admirers before midnight.",
    locations: [
      { id: "ballroom", name: "The Ballroom" },
      { id: "terrace", name: "The Terrace" },
      { id: "card-room", name: "The Card Room" },
    ],
    availableCharacters: [
      "miss-fairfax",
      "lord-pembrook",
      "lady-crane",
      "mr-hart",
      "the-rake",
      "maid-lucy",
    ],
    defaultPositions: {
      "miss-fairfax": "ballroom",
      "lord-pembrook": "card-room",
      "lady-crane": "terrace",
      "mr-hart": "terrace",
      "the-rake": "ballroom",
      "maid-lucy": "ballroom",
    },
    winConditions: [
      {
        type: "affection-threshold",
        subject: "miss-fairfax",
        threshold: 2,
        description: "Miss Fairfax receives admiration from 2+ gentlemen",
      },
      {
        type: "action-occurred",
        action: "request-dance",
        actor: "lord-pembrook",
        description: "Lord Pembrook requests a dance",
      },
    ],
    stepBudget: 30,
  },
  {
    index: 1,
    name: "The Meridian Dinner",
    brief:
      "A secret from the ball has been overheard. The Columnist is attending. Seat carefully — her pen is sharper than a sword.",
    locations: [
      { id: "dining-room", name: "The Dining Room" },
      { id: "drawing-room", name: "The Drawing Room" },
      { id: "library", name: "The Library" },
    ],
    availableCharacters: [
      "miss-fairfax",
      "lord-pembrook",
      "lady-crane",
      "mr-hart",
      "whistledown",
      "maid-lucy",
      "butler-graves",
    ],
    defaultPositions: {
      "miss-fairfax": "dining-room",
      "lord-pembrook": "drawing-room",
      "lady-crane": "dining-room",
      "mr-hart": "library",
      "whistledown": "drawing-room",
      "maid-lucy": "dining-room",
      "butler-graves": "drawing-room",
    },
    winConditions: [
      {
        type: "secret-not-published",
        secret: "the-debt",
        description: "The Cavendish debt does not appear in the column",
      },
      {
        type: "affection-threshold",
        subject: "lord-pembrook",
        threshold: 1,
        description: "Lord Pembrook forms at least one genuine connection",
      },
    ],
    stepBudget: 30,
  },
  {
    index: 2,
    name: "The Hartwell Garden Party",
    brief:
      "Relationships from both prior events are live. A proposal must happen. Someone will be exposed.",
    locations: [
      { id: "garden", name: "The Garden" },
      { id: "pavilion", name: "The Pavilion" },
      { id: "maze", name: "The Maze" },
    ],
    availableCharacters: [
      "miss-fairfax",
      "lord-pembrook",
      "lady-crane",
      "mr-hart",
      "whistledown",
      "the-schemer",
      "maid-lucy",
    ],
    defaultPositions: {
      "miss-fairfax": "garden",
      "lord-pembrook": "pavilion",
      "lady-crane": "garden",
      "mr-hart": "maze",
      "whistledown": "garden",
      "the-schemer": "pavilion",
      "maid-lucy": "garden",
    },
    winConditions: [
      {
        type: "action-occurred",
        action: "accept-proposal",
        description: "A proposal is accepted",
      },
      {
        type: "reputation-intact",
        subject: "miss-fairfax",
        description: "Miss Fairfax's reputation ends above 0",
      },
    ],
    stepBudget: 40,
  },
];
