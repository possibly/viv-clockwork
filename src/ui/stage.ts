import { STATE } from "../viv/adapter";
import { CHARACTER_DEFS } from "../viv/world";
import { SIM, getCurrentLevel } from "../viv/sim";

type RoomLayout = {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

type FlashArc = {
  from: string;
  to: string;
  until: number;
};

const activeFlashes: FlashArc[] = [];
const prevLocations: Record<string, string> = {};
const animPos: Record<string, { x: number; y: number; tx: number; ty: number; startTime: number }> = {};

let selectedCharId: string | null = null;
let onSelectChar: ((id: string | null) => void) | null = null;

const STAGE_LAYOUTS: Record<string, RoomLayout[]> = {
  // Level 0 — Ball
  ballroom: [
    { id: "ballroom", name: "The Ballroom", x: 60, y: 80, w: 300, h: 220 },
    { id: "terrace", name: "The Terrace", x: 420, y: 80, w: 200, h: 130 },
    { id: "card-room", name: "The Card Room", x: 420, y: 240, w: 200, h: 120 },
  ],
  // Level 1 — Dinner
  "dining-room": [
    { id: "dining-room", name: "The Dining Room", x: 60, y: 80, w: 300, h: 200 },
    { id: "drawing-room", name: "The Drawing Room", x: 420, y: 80, w: 200, h: 140 },
    { id: "library", name: "The Library", x: 420, y: 250, w: 200, h: 110 },
  ],
  // Level 2 — Garden
  garden: [
    { id: "garden", name: "The Garden", x: 60, y: 80, w: 300, h: 200 },
    { id: "pavilion", name: "The Pavilion", x: 420, y: 80, w: 200, h: 140 },
    { id: "maze", name: "The Maze", x: 420, y: 250, w: 200, h: 110 },
  ],
};

function getLayout(): RoomLayout[] {
  const level = getCurrentLevel();
  const firstLocId = level.locations[0]?.id ?? "ballroom";
  return STAGE_LAYOUTS[firstLocId] ?? STAGE_LAYOUTS["ballroom"];
}

function getRoomLayout(locationId: string): RoomLayout | undefined {
  return getLayout().find((r) => r.id === locationId);
}

function getCharColor(id: string): string {
  return CHARACTER_DEFS[id]?.color ?? "#888";
}

function getRoomCenter(room: RoomLayout, index: number, total: number): { x: number; y: number } {
  const cols = Math.max(1, Math.ceil(Math.sqrt(total)));
  const col = index % cols;
  const row = Math.floor(index / cols);
  const cx = room.x + 40 + col * 50;
  const cy = room.y + 55 + row * 55;
  return { x: cx, y: cy };
}

export function flashActionArc(participantIds: string[]): void {
  const now = Date.now();
  for (let i = 0; i < participantIds.length - 1; i++) {
    activeFlashes.push({ from: participantIds[i], to: participantIds[i + 1], until: now + 800 });
  }
}

export function setOnSelectChar(cb: (id: string | null) => void): void {
  onSelectChar = cb;
}

export function getSelectedCharId(): string | null {
  return selectedCharId;
}

export function renderStage(svg: SVGSVGElement): void {
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  const layout = getLayout();
  const level = getCurrentLevel();
  const now = Date.now();

  // Clean expired flashes
  for (let i = activeFlashes.length - 1; i >= 0; i--) {
    if (now > activeFlashes[i].until) activeFlashes.splice(i, 1);
  }

  // Draw rooms
  for (const room of layout) {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", String(room.x));
    rect.setAttribute("y", String(room.y));
    rect.setAttribute("width", String(room.w));
    rect.setAttribute("height", String(room.h));
    rect.setAttribute("rx", "12");
    rect.setAttribute("fill", "#f5f0eb");
    rect.setAttribute("stroke", "#c9b99a");
    rect.setAttribute("stroke-width", "2");
    svg.appendChild(rect);

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", String(room.x + 12));
    label.setAttribute("y", String(room.y + 22));
    label.setAttribute("font-size", "12");
    label.setAttribute("font-weight", "600");
    label.setAttribute("fill", "#7a5c3a");
    label.setAttribute("font-family", "Georgia, serif");
    label.textContent = room.name;
    svg.appendChild(label);
  }

  // Build char positions per room
  const charsByRoom: Record<string, string[]> = {};
  for (const locId of level.locations.map((l) => l.id)) {
    charsByRoom[locId] = [];
  }
  for (const charId of level.availableCharacters) {
    const entity = STATE.entities[charId];
    if (!entity) continue;
    const loc = entity.location as string;
    if (charsByRoom[loc]) charsByRoom[loc].push(charId);
    else charsByRoom[loc] = [charId];
  }

  // Compute target positions and handle smooth transitions
  const targetPositions: Record<string, { x: number; y: number }> = {};
  for (const [locId, chars] of Object.entries(charsByRoom)) {
    const room = getRoomLayout(locId);
    if (!room) continue;
    chars.forEach((charId, idx) => {
      targetPositions[charId] = getRoomCenter(room, idx, chars.length);
    });
  }

  // Update animation state
  for (const charId of level.availableCharacters) {
    const target = targetPositions[charId];
    if (!target) continue;
    const prev = prevLocations[charId];
    const curLoc = STATE.entities[charId]?.location as string;
    if (prev !== curLoc) {
      prevLocations[charId] = curLoc;
      const existing = animPos[charId];
      animPos[charId] = {
        x: existing?.x ?? target.x,
        y: existing?.y ?? target.y,
        tx: target.x,
        ty: target.y,
        startTime: now,
      };
    } else if (!animPos[charId]) {
      animPos[charId] = { x: target.x, y: target.y, tx: target.x, ty: target.y, startTime: now };
    } else {
      animPos[charId].tx = target.x;
      animPos[charId].ty = target.y;
    }
  }

  // Interpolate positions
  const ANIM_MS = 200;
  const currentPositions: Record<string, { x: number; y: number }> = {};
  for (const charId of level.availableCharacters) {
    const anim = animPos[charId];
    if (!anim) continue;
    const elapsed = now - anim.startTime;
    const t = Math.min(1, elapsed / ANIM_MS);
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    currentPositions[charId] = {
      x: anim.x + (anim.tx - anim.x) * ease,
      y: anim.y + (anim.ty - anim.y) * ease,
    };
    if (t < 1) {
      requestAnimationFrame(() => renderStage(svg));
    } else {
      anim.x = anim.tx;
      anim.y = anim.ty;
    }
  }

  // Draw flash arcs
  for (const flash of activeFlashes) {
    const p1 = currentPositions[flash.from];
    const p2 = currentPositions[flash.to];
    if (!p1 || !p2) continue;
    const progress = 1 - (flash.until - now) / 800;
    const opacity = Math.max(0, 1 - progress);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", String(p1.x));
    line.setAttribute("y1", String(p1.y));
    line.setAttribute("x2", String(p2.x));
    line.setAttribute("y2", String(p2.y));
    line.setAttribute("stroke", "#d4a017");
    line.setAttribute("stroke-width", "2");
    line.setAttribute("stroke-dasharray", "4 3");
    line.setAttribute("opacity", String(opacity));
    svg.appendChild(line);
  }

  // Draw characters
  for (const charId of level.availableCharacters) {
    const entity = STATE.entities[charId];
    if (!entity) continue;
    const pos = currentPositions[charId];
    if (!pos) continue;

    const isSelected = charId === selectedCharId;
    const color = getCharColor(charId);

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("cursor", "pointer");
    g.addEventListener("click", () => {
      selectedCharId = selectedCharId === charId ? null : charId;
      onSelectChar?.(selectedCharId);
      renderStage(svg);
    });

    // Selection ring
    if (isSelected) {
      const ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      ring.setAttribute("cx", String(pos.x));
      ring.setAttribute("cy", String(pos.y));
      ring.setAttribute("r", "20");
      ring.setAttribute("fill", "none");
      ring.setAttribute("stroke", color);
      ring.setAttribute("stroke-width", "3");
      ring.setAttribute("opacity", "0.6");
      g.appendChild(ring);
    }

    // Character circle
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", String(pos.x));
    circle.setAttribute("cy", String(pos.y));
    circle.setAttribute("r", "16");
    circle.setAttribute("fill", color);
    circle.setAttribute("stroke", isSelected ? "#fff" : "#0002");
    circle.setAttribute("stroke-width", "2");
    g.appendChild(circle);

    // Archetype initial
    const initial = document.createElementNS("http://www.w3.org/2000/svg", "text");
    initial.setAttribute("x", String(pos.x));
    initial.setAttribute("y", String(pos.y + 5));
    initial.setAttribute("text-anchor", "middle");
    initial.setAttribute("font-size", "13");
    initial.setAttribute("font-weight", "bold");
    initial.setAttribute("fill", "#fff");
    initial.setAttribute("font-family", "Georgia, serif");
    initial.setAttribute("pointer-events", "none");
    initial.textContent = (entity.name as string)[0];
    g.appendChild(initial);

    // Name label
    const nameLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    nameLabel.setAttribute("x", String(pos.x));
    nameLabel.setAttribute("y", String(pos.y + 30));
    nameLabel.setAttribute("text-anchor", "middle");
    nameLabel.setAttribute("font-size", "10");
    nameLabel.setAttribute("fill", "#3a2a1a");
    nameLabel.setAttribute("font-family", "Georgia, serif");
    nameLabel.setAttribute("pointer-events", "none");
    nameLabel.textContent = (entity.name as string).split(" ")[0];
    g.appendChild(nameLabel);

    // Items held (small squares)
    const heldItems = STATE.items.filter((iid) => STATE.entities[iid]?.location === charId);
    heldItems.forEach((iid, idx) => {
      const sq = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      sq.setAttribute("x", String(pos.x + 14 + idx * 9));
      sq.setAttribute("y", String(pos.y - 22));
      sq.setAttribute("width", "7");
      sq.setAttribute("height", "7");
      sq.setAttribute("fill", "#d4a017");
      sq.setAttribute("rx", "1");
      sq.setAttribute("title", STATE.entities[iid]?.name as string);
      g.appendChild(sq);
    });

    svg.appendChild(g);
  }
}

export function isSetupMode(): boolean {
  return SIM.mode === "setup";
}
