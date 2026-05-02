/**
 * Renders the ballroom SVG — room illustration, character medallions,
 * affection arcs, and the interactive drop zone.
 */
import { CHARACTERS, GAME, getAffection, getCharm, placeCharacter } from "./game";
import { STATE } from "./adapter";

// Character positions within the room (as % of room width/height)
const CHAR_POSITIONS: Record<string, { x: number; y: number }> = {
  "lord-ashworth":  { x: 0.28, y: 0.62 },
  "miss-pemberton": { x: 0.72, y: 0.62 },
};

// Active pulse animations: charId → expiry timestamp
const pulsingChars = new Map<string, number>();

export function pulseCharacters(charIds: string[]): void {
  const until = Date.now() + 900;
  for (const id of charIds) pulsingChars.set(id, until);
}

// ── SVG room illustration ─────────────────────────────────────────────────────

export function buildRoomSVG(svgEl: SVGSVGElement): void {
  svgEl.innerHTML = `
    <defs>
      <!-- Parquet floor tile -->
      <pattern id="parquet" x="0" y="0" width="48" height="24" patternUnits="userSpaceOnUse">
        <rect width="48" height="24" fill="#e4ccaa"/>
        <rect x="0"  y="0"  width="24" height="12" fill="#dcc49e"/>
        <rect x="24" y="12" width="24" height="12" fill="#dcc49e"/>
        <line x1="0"  y1="0"  x2="48" y2="0"  stroke="#c9af87" stroke-width="0.6"/>
        <line x1="0"  y1="12" x2="48" y2="12" stroke="#c9af87" stroke-width="0.6"/>
        <line x1="24" y1="0"  x2="24" y2="12" stroke="#c9af87" stroke-width="0.6"/>
        <line x1="0"  y1="12" x2="0"  y2="24" stroke="#c9af87" stroke-width="0.6"/>
        <line x1="24" y1="12" x2="24" y2="24" stroke="#c9af87" stroke-width="0.6"/>
        <line x1="48" y1="12" x2="48" y2="24" stroke="#c9af87" stroke-width="0.6"/>
      </pattern>

      <!-- Wall fabric texture -->
      <pattern id="wallpaper" x="0" y="0" width="60" height="80" patternUnits="userSpaceOnUse">
        <rect width="60" height="80" fill="#f2e8d5"/>
        <ellipse cx="30" cy="40" rx="8" ry="12" fill="none" stroke="#e0d0b8" stroke-width="0.8"/>
        <line x1="30" y1="0" x2="30" y2="28" stroke="#e0d0b8" stroke-width="0.5"/>
        <line x1="30" y1="52" x2="30" y2="80" stroke="#e0d0b8" stroke-width="0.5"/>
      </pattern>

      <!-- Glow filter for characters -->
      <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="6" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>

      <!-- Soft shadow -->
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
        <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#1a0a00" flood-opacity="0.25"/>
      </filter>
    </defs>

    <!-- ── Room walls ── -->
    <rect x="20" y="20" width="620" height="360" rx="4" fill="url(#wallpaper)" filter="url(#shadow)"/>

    <!-- Wainscoting panel -->
    <rect x="20" y="260" width="620" height="120" rx="0" fill="#ede0c4"/>
    <line x1="20" y1="260" x2="640" y2="260" stroke="#c9a96e" stroke-width="2.5"/>

    <!-- ── Cornice / ceiling border ── -->
    <rect x="20" y="20" width="620" height="28" rx="4" fill="#c9a96e"/>
    <rect x="20" y="44" width="620" height="6" fill="#b8924a"/>

    <!-- ── Tall windows ── -->
    <!-- Left window -->
    <rect x="52" y="58" width="80" height="140" rx="2" fill="#d4ecff" opacity="0.7"/>
    <rect x="52" y="58" width="80" height="140" rx="2" fill="none" stroke="#c9a96e" stroke-width="2.5"/>
    <line x1="92" y1="58" x2="92" y2="198" stroke="#c9a96e" stroke-width="1.5"/>
    <path d="M52,58 Q92,38 132,58" fill="#c9a96e" opacity="0.5"/>
    <!-- Window light shaft -->
    <rect x="52" y="58" width="80" height="140" fill="url(#winLight)" opacity="0.18"/>

    <!-- Right window -->
    <rect x="528" y="58" width="80" height="140" rx="2" fill="#d4ecff" opacity="0.7"/>
    <rect x="528" y="58" width="80" height="140" rx="2" fill="none" stroke="#c9a96e" stroke-width="2.5"/>
    <line x1="568" y1="58" x2="568" y2="198" stroke="#c9a96e" stroke-width="1.5"/>
    <path d="M528,58 Q568,38 608,58" fill="#c9a96e" opacity="0.5"/>

    <!-- ── Pilasters ── -->
    <rect x="40" y="50" width="10" height="210" fill="#c9a96e" opacity="0.7"/>
    <rect x="610" y="50" width="10" height="210" fill="#c9a96e" opacity="0.7"/>

    <!-- ── Chandelier ── -->
    <g transform="translate(330, 48)">
      <!-- Chain -->
      <line x1="0" y1="-28" x2="0" y2="8" stroke="#b8924a" stroke-width="2"/>
      <!-- Main body -->
      <ellipse cx="0" cy="14" rx="32" ry="10" fill="#c9a96e"/>
      <ellipse cx="0" cy="14" rx="26" ry="7" fill="#e8d4a0"/>
      <!-- Arms -->
      <g stroke="#b8924a" stroke-width="1.5" fill="none">
        <path d="M-26,14 Q-34,22 -34,34"/>
        <path d="M26,14 Q34,22 34,34"/>
        <path d="M-16,14 Q-20,26 -20,38"/>
        <path d="M16,14 Q20,26 20,38"/>
        <path d="M0,16 Q0,28 0,40"/>
      </g>
      <!-- Candle flames -->
      <g fill="#ffd580" opacity="0.9">
        <ellipse cx="-34" cy="32" rx="3" ry="5"/>
        <ellipse cx="34"  cy="32" rx="3" ry="5"/>
        <ellipse cx="-20" cy="36" rx="3" ry="5"/>
        <ellipse cx="20"  cy="36" rx="3" ry="5"/>
        <ellipse cx="0"   cy="38" rx="3" ry="5"/>
      </g>
      <!-- Flame glow -->
      <g fill="#ffaa00" opacity="0.25">
        <ellipse cx="-34" cy="32" rx="8" ry="10"/>
        <ellipse cx="34"  cy="32" rx="8" ry="10"/>
        <ellipse cx="-20" cy="36" rx="8" ry="10"/>
        <ellipse cx="20"  cy="36" rx="8" ry="10"/>
        <ellipse cx="0"   cy="38" rx="8" ry="10"/>
      </g>
    </g>

    <!-- ── Floor ── -->
    <rect x="20" y="260" width="620" height="120" fill="url(#parquet)"/>
    <!-- Floor perspective overlay -->
    <rect x="20" y="260" width="620" height="120" fill="url(#floorGrad)" opacity="0.4"/>

    <!-- ── Skirting board ── -->
    <rect x="20" y="374" width="620" height="6" fill="#b8924a"/>

    <!-- ── Decorative room frame ── -->
    <rect x="20" y="20" width="620" height="360" rx="4" fill="none" stroke="#c9a96e" stroke-width="3"/>
    <!-- Inner frame rule -->
    <rect x="30" y="30" width="600" height="340" rx="2" fill="none" stroke="#e8d4a0" stroke-width="1" opacity="0.6"/>

    <!-- ── Character arc (drawn dynamically) ── -->
    <path id="action-arc" d="" fill="none" stroke="#c9a96e" stroke-width="1.5"
          stroke-dasharray="6 4" opacity="0" style="transition: opacity 0.3s"/>

    <!-- ── Character slots (medallion placeholders) ── -->
    <g id="char-slot-lord-ashworth"  transform="translate(184,250)"/>
    <g id="char-slot-miss-pemberton" transform="translate(472,250)"/>
  `;
}

// ── Character medallion ───────────────────────────────────────────────────────

function buildMedallion(
  charId: string,
  placed: boolean,
  isPulsing: boolean
): string {
  const def = CHARACTERS.find((c) => c.id === charId)!;
  const affectionToOther = getAffection(
    charId,
    CHARACTERS.find((c) => c.id !== charId)!.id
  );
  const affectionArc = Math.min(1, affectionToOther / 25); // normalise 0→1
  const arcAngle = affectionArc * 270; // degrees

  const R = 36; // medallion radius
  const circumference = 2 * Math.PI * R;
  const dash = (arcAngle / 360) * circumference;

  const glowOpacity = isPulsing ? "1" : "0";
  const glowColor = def.color;

  const silhouette =
    def.archetype === "gentleman"
      ? `<!-- Gentleman silhouette -->
         <ellipse cx="0" cy="-14" rx="11" ry="12" fill="white" opacity="0.9"/>
         <path d="M-14,10 Q-12,0 0,0 Q12,0 14,10 L14,26 Q0,30 -14,26 Z" fill="white" opacity="0.9"/>
         <rect x="-5" y="10" width="10" height="6" fill="${def.color}" opacity="0.6"/>`
      : `<!-- Lady silhouette -->
         <ellipse cx="0" cy="-15" rx="10" ry="11" fill="white" opacity="0.9"/>
         <!-- Hair bun -->
         <ellipse cx="0" cy="-24" rx="6" ry="5" fill="white" opacity="0.85"/>
         <!-- Dress -->
         <path d="M-7,0 Q-18,8 -20,28 L20,28 Q18,8 7,0 Z" fill="white" opacity="0.9"/>
         <!-- Neckline -->
         <path d="M-5,0 Q0,4 5,0" fill="none" stroke="${def.color}" stroke-width="1" opacity="0.5"/>`;

  return `
    <!-- Glow ring (animates on action) -->
    <circle cx="0" cy="0" r="${R + 12}" fill="${glowColor}" opacity="${glowOpacity}"
            style="filter:blur(12px); transition: opacity 0.15s"/>

    <!-- Affection arc (progress ring) -->
    <circle cx="0" cy="0" r="${R + 5}" fill="none"
            stroke="${glowColor}" stroke-width="4" opacity="0.25"
            stroke-dasharray="${circumference}" stroke-dashoffset="0"
            transform="rotate(-135)"/>
    <circle cx="0" cy="0" r="${R + 5}" fill="none"
            stroke="${def.color}" stroke-width="4" opacity="${placed ? "0.85" : "0"}"
            stroke-dasharray="${dash} ${circumference - dash}"
            stroke-dashoffset="0" transform="rotate(-135)"
            style="transition: stroke-dasharray 0.8s ease"/>

    <!-- Background disc -->
    <circle cx="0" cy="0" r="${R}" fill="${def.color}"/>
    <!-- Inner highlight -->
    <circle cx="0" cy="-10" r="${R - 4}" fill="white" opacity="0.07"/>

    <!-- Silhouette -->
    ${silhouette}

    <!-- Gold border ring -->
    <circle cx="0" cy="0" r="${R}" fill="none" stroke="#c9a96e" stroke-width="2.5"/>
    <circle cx="0" cy="0" r="${R - 4}" fill="none" stroke="#e8d4a0" stroke-width="0.8" opacity="0.5"/>

    <!-- Name label -->
    <rect x="-42" y="${R + 8}" width="84" height="20" rx="10" fill="${def.colorDark}" opacity="0.9"/>
    <text x="0" y="${R + 22}" text-anchor="middle" font-family="'Cinzel', serif"
          font-size="9" fill="#e8d4a0" letter-spacing="0.5">${def.name}</text>

    <!-- Charm pips -->
    <g transform="translate(0, ${R + 34})">
      ${Array.from({ length: 5 }, (_, i) => {
        const filled = i < getCharm(charId);
        const x = (i - 2) * 10;
        return `<circle cx="${x}" cy="0" r="4" fill="${filled ? "#c9a96e" : "none"}"
                        stroke="#c9a96e" stroke-width="1.5" opacity="${filled ? "1" : "0.4"}"/>`;
      }).join("")}
    </g>
  `;
}

// ── Update loop ───────────────────────────────────────────────────────────────

export function updateStage(svgEl: SVGSVGElement): void {
  const now = Date.now();

  for (const def of CHARACTERS) {
    const slot = svgEl.getElementById(`char-slot-${def.id}`);
    if (!slot) continue;

    const placed = GAME.placedCharacters.has(def.id);
    const isPulsing = (pulsingChars.get(def.id) ?? 0) > now;

    slot.innerHTML = buildMedallion(def.id, placed, isPulsing);

    // Opacity & pointer cursor
    const opacity = placed ? "1" : "0.35";
    slot.setAttribute("opacity", opacity);
  }

  // Draw action arc if both chars are pulsing
  const arcEl = svgEl.getElementById("action-arc");
  if (arcEl) {
    const anyPulsing = [...pulsingChars.entries()].some(([, until]) => until > now);
    if (anyPulsing) {
      arcEl.setAttribute("d", "M 184,250 Q 328,190 472,250");
      arcEl.setAttribute("opacity", "0.7");
    } else {
      arcEl.setAttribute("opacity", "0");
    }
  }
}

// ── Drop zone wiring (desktop drag + mobile tap) ──────────────────────────────

let tapPendingCharId: string | null = null;

export function wireDropZone(
  svgEl: SVGSVGElement,
  onCharacterPlaced: (id: string) => void
): void {
  // The whole SVG acts as the drop target once a char is tapped/dragged
  svgEl.addEventListener("click", () => {
    if (!tapPendingCharId) return;
    placeCharacter(tapPendingCharId);
    onCharacterPlaced(tapPendingCharId);
    clearTapPending();
  });
  svgEl.addEventListener("dragover", (e) => e.preventDefault());
  svgEl.addEventListener("drop", (e) => {
    e.preventDefault();
    const id = (e as DragEvent).dataTransfer?.getData("text/plain");
    if (id) { placeCharacter(id); onCharacterPlaced(id); }
  });
}

export function setTapPendingChar(id: string | null): void {
  tapPendingCharId = id;
}
export function getTapPendingChar(): string | null { return tapPendingCharId; }
export function clearTapPending(): void { tapPendingCharId = null; }
