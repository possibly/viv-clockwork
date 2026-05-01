// Tab and bottom-panel management

export type TabId = "goals" | "chronicle" | "inspect" | "actions" | "graph";

let activeTab: TabId = "goals";
let onTabChange: ((tab: TabId) => void) | null = null;

export function initTabs(cb: (tab: TabId) => void): void {
  onTabChange = cb;

  document.querySelectorAll<HTMLButtonElement>(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab as TabId;
      switchTab(tab);
    });
  });

  initPanelResize();
}

export function switchTab(tab: TabId): void {
  activeTab = tab;

  document.querySelectorAll<HTMLButtonElement>(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });
  document.querySelectorAll<HTMLElement>(".tab-pane").forEach((pane) => {
    pane.classList.toggle("active", pane.id === `tab-${tab}`);
  });

  onTabChange?.(tab);
}

export function getActiveTab(): TabId {
  return activeTab;
}

// Drag-to-resize the bottom panel
function initPanelResize(): void {
  const panel = document.getElementById("bottom-panel")!;
  const handle = document.getElementById("panel-handle")!;
  let startY = 0;
  let startH = 0;

  const onMove = (clientY: number) => {
    const delta = startY - clientY;
    const newH = Math.min(Math.max(120, startH + delta), window.innerHeight * 0.85);
    panel.style.height = `${newH}px`;
  };

  const onEnd = () => {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onEnd);
    document.removeEventListener("touchmove", onTouchMove);
    document.removeEventListener("touchend", onEnd);
  };

  const onMouseMove = (e: MouseEvent) => onMove(e.clientY);
  const onTouchMove = (e: TouchEvent) => onMove(e.touches[0].clientY);

  handle.addEventListener("mousedown", (e) => {
    startY = e.clientY;
    startH = panel.offsetHeight;
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onEnd);
  });

  handle.addEventListener("touchstart", (e) => {
    startY = e.touches[0].clientY;
    startH = panel.offsetHeight;
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onEnd);
  }, { passive: true });
}
