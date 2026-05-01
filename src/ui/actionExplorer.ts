import { STATE } from "../viv/adapter";
import { CHARACTER_DEFS } from "../viv/world";
import { getActionInfos, getCharacterRolesForAction } from "../viv/actionDefs";
import { getCurrentLevel } from "../viv/sim";

const openCards = new Set<string>();

export function renderActionExplorer(container: HTMLElement): void {
  container.innerHTML = "";

  const level = getCurrentLevel();
  const chars = level.availableCharacters;
  const infos = getActionInfos();

  // Action fire counts from the log
  const fireCounts: Record<string, number> = {};
  for (const entry of STATE.actionLog) {
    fireCounts[entry.name] = (fireCounts[entry.name] ?? 0) + 1;
  }

  for (const info of infos) {
    const card = document.createElement("div");
    card.className = `action-card${openCards.has(info.name) ? " open" : ""}`;

    // Header (always visible)
    const header = document.createElement("div");
    header.className = "action-header";
    header.addEventListener("click", () => {
      if (openCards.has(info.name)) openCards.delete(info.name);
      else openCards.add(info.name);
      card.classList.toggle("open");
      // toggle body visibility
      const body = card.querySelector<HTMLElement>(".action-body");
      if (body) body.style.display = card.classList.contains("open") ? "block" : "none";
    });

    const nameEl = document.createElement("span");
    nameEl.className = "action-name";
    nameEl.textContent = info.name;
    header.appendChild(nameEl);

    const count = fireCounts[info.name] ?? 0;
    if (count > 0) {
      const countEl = document.createElement("span");
      countEl.className = "action-count";
      countEl.textContent = `×${count}`;
      header.appendChild(countEl);
    }

    const chevron = document.createElement("span");
    chevron.className = "action-chevron";
    chevron.textContent = "▶";
    header.appendChild(chevron);

    card.appendChild(header);

    // Body (expanded)
    const body = document.createElement("div");
    body.className = "action-body";
    body.style.display = card.classList.contains("open") ? "block" : "none";

    // Description
    const desc = document.createElement("div");
    desc.className = "action-desc";
    desc.textContent = info.description;
    body.appendChild(desc);

    // Characters in this level and their affinity
    const roles = getCharacterRolesForAction(info.name, chars);
    if (roles.length > 0) {
      const rolesTitle = document.createElement("div");
      rolesTitle.className = "section-title";
      rolesTitle.textContent = `In this level`;
      body.appendChild(rolesTitle);

      for (const r of roles) {
        const entity = STATE.entities[r.charId];
        if (!entity) continue;
        const def = CHARACTER_DEFS[r.charId];

        const row = document.createElement("div");
        row.className = "action-affinity-row";

        const dot = document.createElement("span");
        dot.className = "affinity-dot";
        dot.style.background = def?.color ?? "#888";
        row.appendChild(dot);

        const name = document.createElement("span");
        name.className = "affinity-name";
        name.textContent = entity.name as string;
        row.appendChild(name);

        if (r.affinity) {
          const tag = document.createElement("span");
          tag.className = "affinity-role";
          tag.textContent = "★ prefers";
          row.appendChild(tag);
        }

        body.appendChild(row);
      }
    }

    // Post-run: who fired this action and as what role
    if (count > 0) {
      const firedTitle = document.createElement("div");
      firedTitle.className = "section-title";
      firedTitle.textContent = "Fired by";
      body.appendChild(firedTitle);

      const initiatorCounts: Record<string, number> = {};
      for (const entry of STATE.actionLog) {
        if (entry.name !== info.name) continue;
        const initiator = entry.participants[0];
        if (initiator) {
          initiatorCounts[initiator] = (initiatorCounts[initiator] ?? 0) + 1;
        }
      }

      for (const [charId, n] of Object.entries(initiatorCounts)) {
        const entity = STATE.entities[charId];
        const def = CHARACTER_DEFS[charId];
        const row = document.createElement("div");
        row.className = "action-affinity-row";

        const dot = document.createElement("span");
        dot.className = "affinity-dot";
        dot.style.background = def?.color ?? "#888";
        row.appendChild(dot);

        const name = document.createElement("span");
        name.className = "affinity-name";
        name.textContent = entity?.name as string ?? charId;
        row.appendChild(name);

        const tag = document.createElement("span");
        tag.className = "affinity-role";
        tag.textContent = `×${n}`;
        row.appendChild(tag);

        body.appendChild(row);
      }
    }

    card.appendChild(body);
    container.appendChild(card);
  }
}
