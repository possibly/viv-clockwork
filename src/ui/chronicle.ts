import { STATE } from "../viv/adapter";
import { CHARACTER_DEFS } from "../viv/world";
import { LEVELS } from "../game/levels";

let highlightedActionId: string | null = null;
let onHighlightAction: ((id: string | null) => void) | null = null;

export function setOnHighlightAction(cb: (id: string | null) => void): void {
  onHighlightAction = cb;
}

function getCharColor(id: string): string {
  return CHARACTER_DEFS[id]?.color ?? "#888";
}

function formatGloss(gloss: string, participants: string[]): Node[] {
  // Highlight participant names in their colors
  const nodes: Node[] = [];
  let remaining = gloss;

  for (const charId of participants) {
    const entity = STATE.entities[charId];
    if (!entity) continue;
    const name = entity.name as string;
    const idx = remaining.indexOf(name);
    if (idx < 0) continue;
    if (idx > 0) {
      nodes.push(document.createTextNode(remaining.slice(0, idx)));
    }
    const span = document.createElement("span");
    span.textContent = name;
    span.style.color = getCharColor(charId);
    span.style.fontWeight = "600";
    nodes.push(span);
    remaining = remaining.slice(idx + name.length);
  }
  if (remaining) nodes.push(document.createTextNode(remaining));
  return nodes;
}

export function renderChronicle(container: HTMLElement): void {
  container.innerHTML = "";

  let levelIdx = 0;
  const breakTimestamps = STATE.levelBreaks;

  for (let i = 0; i < STATE.actionLog.length; i++) {
    const entry = STATE.actionLog[i];

    // Insert level break divider
    while (levelIdx < breakTimestamps.length && entry.timestamp >= breakTimestamps[levelIdx]) {
      const divider = document.createElement("div");
      divider.className = "chronicle-break";
      divider.textContent = `── ${LEVELS[levelIdx + 1]?.name ?? "Next Chapter"} begins ──`;
      container.appendChild(divider);
      levelIdx++;
    }

    const row = document.createElement("div");
    row.className = "chronicle-entry";
    if (entry.id === highlightedActionId) {
      row.classList.add("chronicle-entry--highlighted");
    }

    const timestamp = document.createElement("span");
    timestamp.className = "chronicle-ts";
    timestamp.textContent = `[T=${entry.timestamp}]`;
    row.appendChild(timestamp);

    const sep = document.createTextNode(" ");
    row.appendChild(sep);

    const glossNodes = formatGloss(entry.gloss, entry.participants);
    for (const node of glossNodes) row.appendChild(node);

    row.addEventListener("click", () => {
      highlightedActionId = highlightedActionId === entry.id ? null : entry.id;
      onHighlightAction?.(highlightedActionId);
      renderChronicle(container);
    });

    container.appendChild(row);
  }

  // Scroll to bottom
  container.scrollTop = container.scrollHeight;
}
