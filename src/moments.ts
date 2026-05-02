/**
 * Moment cards — the primary narrative display.
 * Each fired action creates a beautiful card that rises, holds, then fades.
 * A persistent "scroll" below shows the last few moments as brief captions.
 */
import type { Moment } from "./game";
import { CHARACTERS } from "./game";

// ── Visual config per action ──────────────────────────────────────────────────

type ActionStyle = {
  bg: string;          // card background gradient
  accent: string;      // accent colour for ornament + border
  ornament: string;    // SVG symbol (inline)
  label: string;       // display name
};

const ACTION_STYLES: Record<string, ActionStyle> = {
  "exchange-pleasantries": {
    bg: "linear-gradient(160deg, #2d4a3e 0%, #1a3028 100%)",
    accent: "#6eb89e",
    label: "Pleasantries",
    ornament: `<svg viewBox="0 0 60 40" width="60" height="40" fill="none">
      <path d="M5,20 Q15,5 30,20 Q45,35 55,20" stroke="currentColor" stroke-width="1.5" opacity="0.7"/>
      <circle cx="30" cy="20" r="4" fill="currentColor" opacity="0.5"/>
      <circle cx="10" cy="19" r="2" fill="currentColor" opacity="0.4"/>
      <circle cx="50" cy="19" r="2" fill="currentColor" opacity="0.4"/>
    </svg>`,
  },
  "offer-compliment": {
    bg: "linear-gradient(160deg, #4a3010 0%, #2d1a05 100%)",
    accent: "#d4a040",
    label: "A Compliment",
    ornament: `<svg viewBox="0 0 60 50" width="60" height="50" fill="none">
      <path d="M30,6 L34,18 L47,18 L37,26 L41,38 L30,30 L19,38 L23,26 L13,18 L26,18 Z"
            stroke="currentColor" stroke-width="1.2" fill="currentColor" opacity="0.6"/>
      <circle cx="30" cy="22" r="16" stroke="currentColor" stroke-width="0.8" opacity="0.25"/>
    </svg>`,
  },
  "show-interest": {
    bg: "linear-gradient(160deg, #3d1628 0%, #220c18 100%)",
    accent: "#d4607a",
    label: "Undisguised Interest",
    ornament: `<svg viewBox="0 0 60 50" width="60" height="50" fill="none">
      <path d="M30,38 Q10,28 10,18 A10,10 0 0 1 30,16 A10,10 0 0 1 50,18 Q50,28 30,38 Z"
            stroke="currentColor" stroke-width="1.5" fill="currentColor" opacity="0.5"/>
      <circle cx="30" cy="24" r="5" fill="currentColor" opacity="0.4"/>
    </svg>`,
  },
  "request-dance": {
    bg: "linear-gradient(160deg, #0f1e3d 0%, #05102b 100%)",
    accent: "#c9a96e",
    label: "A Request to Dance",
    ornament: `<svg viewBox="0 0 60 50" width="60" height="50" fill="none">
      <!-- Music note -->
      <ellipse cx="20" cy="36" rx="7" ry="5" fill="currentColor" opacity="0.7"/>
      <line x1="27" y1="36" x2="27" y2="14" stroke="currentColor" stroke-width="2"/>
      <line x1="27" y1="14" x2="42" y2="18" stroke="currentColor" stroke-width="1.5"/>
      <ellipse cx="42" cy="30" rx="6" ry="4" fill="currentColor" opacity="0.7"/>
      <line x1="48" y1="30" x2="48" y2="18" stroke="currentColor" stroke-width="2"/>
      <!-- Stars -->
      <circle cx="10" cy="12" r="2" fill="currentColor" opacity="0.6"/>
      <circle cx="50" cy="10" r="1.5" fill="currentColor" opacity="0.5"/>
      <circle cx="54" cy="22" r="1" fill="currentColor" opacity="0.4"/>
    </svg>`,
  },
};

function fallbackStyle(): ActionStyle {
  return {
    bg: "linear-gradient(160deg, #1a1a2e 0%, #0d0d1f 100%)",
    accent: "#9090c0",
    label: "A Moment",
    ornament: `<svg viewBox="0 0 60 40" width="60" height="40"/>`,
  };
}

// ── Character name badges ─────────────────────────────────────────────────────

function charBadge(charId: string): string {
  const def = CHARACTERS.find((c) => c.id === charId);
  if (!def) return "";
  return `<span class="moment-badge" style="background:${def.color}; border-color:${def.colorDark}">
    ${def.name}
  </span>`;
}

// ── Show a moment card ────────────────────────────────────────────────────────

export function showMomentCard(moment: Moment, container: HTMLElement): void {
  const style = ACTION_STYLES[moment.action] ?? fallbackStyle();

  const card = document.createElement("div");
  card.className = "moment-card";
  card.style.background = style.bg;
  card.style.borderColor = style.accent + "55";

  card.innerHTML = `
    <div class="moment-ornament" style="color: ${style.accent}">${style.ornament}</div>
    <div class="moment-label" style="color: ${style.accent}">${style.label}</div>
    <blockquote class="moment-text">${moment.report}</blockquote>
    <div class="moment-participants">
      ${moment.participants.map(charBadge).join("")}
    </div>
  `;

  container.appendChild(card);

  // Animate in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => card.classList.add("moment-card--visible"));
  });

  // Animate out and remove
  setTimeout(() => {
    card.classList.add("moment-card--exit");
    card.addEventListener("transitionend", () => card.remove(), { once: true });
  }, 3200);
}

// ── Scroll chronicle (persistent list of past moments) ────────────────────────

export function appendScrollEntry(moment: Moment, scroll: HTMLElement): void {
  const style = ACTION_STYLES[moment.action] ?? fallbackStyle();

  const entry = document.createElement("div");
  entry.className = "scroll-entry";
  entry.style.borderLeftColor = style.accent;

  // First sentence of the report
  const sentence = moment.report.split(/[.!?]/)[0] + ".";

  entry.innerHTML = `
    <span class="scroll-label" style="color: ${style.accent}">${style.label}</span>
    <span class="scroll-sentence">${sentence}</span>
  `;

  scroll.appendChild(entry);

  // Fade in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => entry.classList.add("scroll-entry--visible"));
  });

  // Keep only last 6 entries
  const entries = scroll.querySelectorAll(".scroll-entry");
  if (entries.length > 6) entries[0].remove();

  // Scroll to bottom
  scroll.scrollTop = scroll.scrollHeight;
}

// ── Goal met celebration ──────────────────────────────────────────────────────

export function celebrateGoal(
  goalEl: HTMLElement,
  momentContainer: HTMLElement
): void {
  goalEl.classList.add("goal--met");

  const banner = document.createElement("div");
  banner.className = "celebration-banner";
  banner.innerHTML = `
    <div class="celebration-ornament">✦</div>
    <div class="celebration-title">The Dance is Secured</div>
    <div class="celebration-sub">
      Lord Ashworth and Miss Pemberton have taken to the floor.<br>
      The evening, it seems, has been a most satisfying success.
    </div>
    <div class="celebration-ornament">✦</div>
  `;
  momentContainer.appendChild(banner);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => banner.classList.add("celebration-banner--visible"));
  });
}
