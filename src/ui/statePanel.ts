import { STATE } from "../viv/adapter";
import { CHARACTER_DEFS } from "../viv/world";

export function renderStatePanel(container: HTMLElement, selectedCharId: string | null): void {
  container.innerHTML = "";

  if (!selectedCharId) {
    const placeholder = document.createElement("p");
    placeholder.className = "state-placeholder";
    placeholder.textContent = "Click a character on the stage to inspect them.";
    container.appendChild(placeholder);
    renderItemOwnership(container);
    return;
  }

  const entity = STATE.entities[selectedCharId];
  if (!entity) {
    container.textContent = "Character not found.";
    return;
  }

  const def = CHARACTER_DEFS[selectedCharId];

  // Card header
  const header = document.createElement("div");
  header.className = "char-card-header";
  const dot = document.createElement("span");
  dot.className = "char-dot";
  dot.style.background = def?.color ?? "#888";
  header.appendChild(dot);
  const name = document.createElement("span");
  name.className = "char-name";
  name.textContent = entity.name as string;
  header.appendChild(name);
  const archetype = document.createElement("span");
  archetype.className = "char-archetype";
  archetype.textContent = `(${entity.archetype as string})`;
  header.appendChild(archetype);
  container.appendChild(header);

  // Stats grid
  const stats = document.createElement("div");
  stats.className = "char-stats";

  const charm = entity.charm as number ?? 0;
  const rep = entity.reputation as number ?? 0;
  const suspicion = entity.suspicion as number ?? 0;

  stats.innerHTML = `
    <div class="stat"><span class="stat-label">Charm</span><span class="stat-bar"><span class="stat-fill" style="width:${Math.min(100, charm * 10)}%"></span></span><span class="stat-val">${charm}</span></div>
    <div class="stat"><span class="stat-label">Reputation</span><span class="stat-bar"><span class="stat-fill rep" style="width:${Math.min(100, Math.max(0, rep) * 10)}%"></span></span><span class="stat-val">${rep}</span></div>
    <div class="stat"><span class="stat-label">Suspicion</span><span class="stat-bar"><span class="stat-fill sus" style="width:${Math.min(100, suspicion * 5)}%"></span></span><span class="stat-val">${suspicion}</span></div>
  `;
  container.appendChild(stats);

  // Affection map
  const affection = entity.affection as Record<string, number> ?? {};
  const affKeys = Object.keys(affection);
  if (affKeys.length > 0) {
    const affSection = document.createElement("div");
    affSection.className = "char-section";
    const affTitle = document.createElement("div");
    affTitle.className = "section-title";
    affTitle.textContent = "Affections";
    affSection.appendChild(affTitle);
    for (const [targetId, val] of Object.entries(affection)) {
      if (val === 0) continue;
      const row = document.createElement("div");
      row.className = "affection-row";
      const targetName = STATE.entities[targetId]?.name as string ?? targetId;
      const color = CHARACTER_DEFS[targetId]?.color ?? "#888";
      row.innerHTML = `<span style="color:${color}">${targetName}</span><span class="affection-val">+${val}</span>`;
      affSection.appendChild(row);
    }
    container.appendChild(affSection);
  }

  // Items held
  const heldItems = STATE.items.filter((id) => STATE.entities[id]?.location === selectedCharId);
  if (heldItems.length > 0) {
    const itemSection = document.createElement("div");
    itemSection.className = "char-section";
    const itemTitle = document.createElement("div");
    itemTitle.className = "section-title";
    itemTitle.textContent = "Items";
    itemSection.appendChild(itemTitle);
    for (const iid of heldItems) {
      const item = STATE.entities[iid];
      const row = document.createElement("div");
      row.className = "item-row";
      row.textContent = `📜 ${item?.name as string ?? iid}`;
      itemSection.appendChild(row);
    }
    container.appendChild(itemSection);
  }

  // Recent memories
  const memories = entity.memories as Record<string, unknown> ?? {};
  const memKeys = Object.keys(memories).slice(-5);
  if (memKeys.length > 0) {
    const memSection = document.createElement("div");
    memSection.className = "char-section";
    const memTitle = document.createElement("div");
    memTitle.className = "section-title";
    memTitle.textContent = "Recent Memories";
    memSection.appendChild(memTitle);
    for (const actionId of memKeys) {
      const action = STATE.entities[actionId];
      const row = document.createElement("div");
      row.className = "memory-row";
      row.textContent = action?.gloss as string ?? actionId;
      memSection.appendChild(row);
    }
    container.appendChild(memSection);
  }

  renderItemOwnership(container);
}

function renderItemOwnership(container: HTMLElement): void {
  if (STATE.items.length === 0) return;

  const section = document.createElement("div");
  section.className = "char-section";
  const title = document.createElement("div");
  title.className = "section-title";
  title.textContent = "All Items";
  section.appendChild(title);

  for (const iid of STATE.items) {
    const item = STATE.entities[iid];
    if (!item) continue;
    const ownerId = item.location as string;
    const owner = STATE.entities[ownerId];
    const row = document.createElement("div");
    row.className = "item-row";
    row.textContent = `${item.name as string} → ${owner?.name as string ?? ownerId}`;
    section.appendChild(row);
  }

  container.appendChild(section);
}
