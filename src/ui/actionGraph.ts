import { STATE } from "../viv/adapter";
import { CHARACTER_DEFS } from "../viv/world";
import { getActionInfos } from "../viv/actionDefs";
import { getCurrentLevel, SIM } from "../viv/sim";

// ─── Pre-run: archetype × action affinity matrix (SVG) ───────────────────────

const ARCHETYPES = ["diamond", "rake", "schemer", "wallflower", "columnist", "staff"] as const;
const ARCHETYPE_LABELS: Record<string, string> = {
  diamond: "Diamond", rake: "Rake", schemer: "Schemer",
  wallflower: "Wallflower", columnist: "Columnist", staff: "Staff",
};

function renderAffinityMatrix(wrap: HTMLElement): void {
  const infos = getActionInfos();
  const actions = infos.map((i) => i.name);
  const affinityMap = new Map<string, Set<string>>();
  for (const info of infos) {
    affinityMap.set(info.name, new Set(info.preferredBy));
  }

  const ROW_H = 22;
  const COL_W = 36;
  const LEFT_PAD = 160;
  const TOP_PAD = 80;
  const svgW = LEFT_PAD + ARCHETYPES.length * COL_W + 8;
  const svgH = TOP_PAD + actions.length * ROW_H + 8;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${svgW} ${svgH}`);
  svg.setAttribute("width", String(svgW));
  svg.setAttribute("height", String(svgH));
  svg.style.display = "block";

  // Column headers (archetypes)
  ARCHETYPES.forEach((arch, ci) => {
    const x = LEFT_PAD + ci * COL_W + COL_W / 2;
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", String(x));
    text.setAttribute("y", String(TOP_PAD - 6));
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("transform", `rotate(-45 ${x} ${TOP_PAD - 6})`);
    text.setAttribute("font-size", "10");
    text.setAttribute("font-family", "sans-serif");
    text.setAttribute("fill", "#6b4f35");
    text.textContent = ARCHETYPE_LABELS[arch];
    svg.appendChild(text);
  });

  // Rows (actions)
  actions.forEach((action, ri) => {
    const y = TOP_PAD + ri * ROW_H;
    const isEven = ri % 2 === 0;

    // Row background
    const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bg.setAttribute("x", "0");
    bg.setAttribute("y", String(y));
    bg.setAttribute("width", String(svgW));
    bg.setAttribute("height", String(ROW_H));
    bg.setAttribute("fill", isEven ? "#f5ede0" : "#faf6f0");
    svg.appendChild(bg);

    // Action name
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", String(LEFT_PAD - 6));
    label.setAttribute("y", String(y + ROW_H / 2 + 4));
    label.setAttribute("text-anchor", "end");
    label.setAttribute("font-size", "10");
    label.setAttribute("font-family", "sans-serif");
    label.setAttribute("fill", "#6b4f35");
    label.textContent = action;
    svg.appendChild(label);

    // Affinity dots
    ARCHETYPES.forEach((arch, ci) => {
      const cx = LEFT_PAD + ci * COL_W + COL_W / 2;
      const cy = y + ROW_H / 2;
      const hasAffinity = affinityMap.get(action)?.has(arch) ?? false;

      if (hasAffinity) {
        const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        dot.setAttribute("cx", String(cx));
        dot.setAttribute("cy", String(cy));
        dot.setAttribute("r", "8");
        dot.setAttribute("fill", "#c8a35a");
        dot.setAttribute("opacity", "0.85");
        svg.appendChild(dot);

        const star = document.createElementNS("http://www.w3.org/2000/svg", "text");
        star.setAttribute("x", String(cx));
        star.setAttribute("y", String(cy + 4));
        star.setAttribute("text-anchor", "middle");
        star.setAttribute("font-size", "9");
        star.setAttribute("fill", "#fff");
        star.textContent = "★";
        svg.appendChild(star);
      } else {
        const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        dot.setAttribute("cx", String(cx));
        dot.setAttribute("cy", String(cy));
        dot.setAttribute("r", "4");
        dot.setAttribute("fill", "#d9c9b3");
        svg.appendChild(dot);
      }
    });
  });

  wrap.appendChild(svg);
}

// ─── Post-run: timeline swimlane ─────────────────────────────────────────────

const LANE_H = 36;
const LANE_PAD = 6;
const PILL_H = 22;
const LEFT_W = 90;
const COL_W_TL = 80;
const PILL_W = 72;

function renderTimeline(wrap: HTMLElement): void {
  const log = STATE.actionLog;
  if (log.length === 0) return;

  const level = getCurrentLevel();
  const chars = level.availableCharacters.filter((id) => STATE.entities[id]);

  // Gather timestamps
  const timestamps = [...new Set(log.map((e) => e.timestamp))].sort((a, b) => a - b);
  const tsIndex = new Map(timestamps.map((t, i) => [t, i]));

  const svgW = LEFT_W + timestamps.length * COL_W_TL + 20;
  const svgH = chars.length * LANE_H + 30;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${svgW} ${svgH}`);
  svg.setAttribute("width", String(svgW));
  svg.setAttribute("height", String(svgH));
  svg.style.display = "block";

  // Header: timestamps
  timestamps.forEach((ts, ti) => {
    const x = LEFT_W + ti * COL_W_TL + COL_W_TL / 2;
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", String(x));
    text.setAttribute("y", "14");
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("font-size", "9");
    text.setAttribute("font-family", "monospace");
    text.setAttribute("fill", "#9a7a5a");
    text.textContent = `T=${ts}`;
    svg.appendChild(text);
  });

  // Level break indicators
  const breakTimes = new Set(STATE.levelBreaks);

  // Lanes per character
  chars.forEach((charId, ri) => {
    const y = 20 + ri * LANE_H;
    const def = CHARACTER_DEFS[charId];
    const entity = STATE.entities[charId];
    if (!entity) return;

    // Lane background
    const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bg.setAttribute("x", "0");
    bg.setAttribute("y", String(y));
    bg.setAttribute("width", String(svgW));
    bg.setAttribute("height", String(LANE_H));
    bg.setAttribute("fill", ri % 2 === 0 ? "#f5ede0" : "#faf6f0");
    svg.appendChild(bg);

    // Character name
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", "8");
    dot.setAttribute("cy", String(y + LANE_H / 2));
    dot.setAttribute("r", "5");
    dot.setAttribute("fill", def?.color ?? "#888");
    svg.appendChild(dot);

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", "18");
    label.setAttribute("y", String(y + LANE_H / 2 + 4));
    label.setAttribute("font-size", "10");
    label.setAttribute("font-family", "sans-serif");
    label.setAttribute("fill", "#6b4f35");
    label.textContent = (entity.name as string).split(" ")[0];
    svg.appendChild(label);

    // Action pills for this character
    const charActions = log.filter((e) => e.participants.includes(charId));

    charActions.forEach((entry) => {
      const ti = tsIndex.get(entry.timestamp) ?? 0;
      const isInitiator = entry.participants[0] === charId;
      const x = LEFT_W + ti * COL_W_TL + (COL_W_TL - PILL_W) / 2;
      const py = y + LANE_PAD;

      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");

      const pill = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      pill.setAttribute("x", String(x));
      pill.setAttribute("y", String(py));
      pill.setAttribute("width", String(PILL_W));
      pill.setAttribute("height", String(PILL_H));
      pill.setAttribute("rx", "4");
      pill.setAttribute("fill", isInitiator ? (def?.color ?? "#c8a35a") : "#e0d4c0");
      pill.setAttribute("opacity", isInitiator ? "0.85" : "0.55");
      g.appendChild(pill);

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", String(x + PILL_W / 2));
      text.setAttribute("y", String(py + PILL_H / 2 + 4));
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("font-size", "8");
      text.setAttribute("font-family", "sans-serif");
      text.setAttribute("fill", isInitiator ? "#fff" : "#6b4f35");
      text.setAttribute("pointer-events", "none");
      // Abbreviate action name
      const shortName = entry.name.replace(/-/g, " ").slice(0, 12);
      text.textContent = shortName;
      g.appendChild(text);

      svg.appendChild(g);
    });
  });

  // Causal edges (causes links) — draw lines between causally related action pills
  const actionPositions = new Map<string, { x: number; y: number }>();
  chars.forEach((charId, ri) => {
    const y = 20 + ri * LANE_H + LANE_H / 2;
    const charActions = log.filter((e) => e.participants[0] === charId);
    charActions.forEach((entry) => {
      const ti = tsIndex.get(entry.timestamp) ?? 0;
      const x = LEFT_W + ti * COL_W_TL + COL_W_TL / 2;
      actionPositions.set(entry.id, { x, y });
    });
  });

  for (const node of STATE.actionGraph) {
    for (const causeId of node.causes) {
      const from = actionPositions.get(causeId);
      const to = actionPositions.get(node.id);
      if (!from || !to) continue;
      if (from.x === to.x && from.y === to.y) continue;

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", String(from.x));
      line.setAttribute("y1", String(from.y));
      line.setAttribute("x2", String(to.x));
      line.setAttribute("y2", String(to.y));
      line.setAttribute("stroke", "#c8a35a");
      line.setAttribute("stroke-width", "1.5");
      line.setAttribute("stroke-dasharray", "3 2");
      line.setAttribute("opacity", "0.5");
      // Insert before pills so edges are behind them
      svg.insertBefore(line, svg.firstChild);
    }
  }

  wrap.appendChild(svg);
}

// ─── Main render ─────────────────────────────────────────────────────────────

export function renderActionGraph(container: HTMLElement): void {
  container.innerHTML = "";

  const hasRun = STATE.actionLog.length > 0;

  if (hasRun) {
    // Post-run: timeline first
    const tlLabel = document.createElement("div");
    tlLabel.className = "graph-section-label";
    tlLabel.textContent = "Action Timeline — who did what and when";
    container.appendChild(tlLabel);

    const wrap = document.createElement("div");
    wrap.id = "graph-svg-wrap";
    renderTimeline(wrap);
    container.appendChild(wrap);

    // Then affinity matrix below
    const matLabel = document.createElement("div");
    matLabel.className = "graph-section-label";
    matLabel.style.marginTop = "16px";
    matLabel.textContent = "Archetype Affinities — which roles prefer which actions";
    container.appendChild(matLabel);
  } else {
    // Pre-run: affinity matrix only
    const matLabel = document.createElement("div");
    matLabel.className = "graph-section-label";
    matLabel.textContent = "Archetype Affinities — who prefers which actions (⭐ = strong affinity)";
    container.appendChild(matLabel);
  }

  const matWrap = document.createElement("div");
  matWrap.id = "graph-svg-wrap";
  renderAffinityMatrix(matWrap);
  container.appendChild(matWrap);

  if (!hasRun) {
    const hint = document.createElement("div");
    hint.className = "graph-empty";
    hint.textContent = "Run the simulation to see the action timeline here.";
    container.appendChild(hint);
  }
}
