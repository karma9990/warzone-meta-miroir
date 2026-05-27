export type GlassPanelEntry = {
  element: HTMLElement;
  borderRadius: number;
};

type UpdateCallback = () => void;

const panels = new Map<string, GlassPanelEntry>();
const listeners = new Set<UpdateCallback>();

export function registerPanel(id: string, element: HTMLElement, borderRadius = 22) {
  panels.set(id, { element, borderRadius });
  listeners.forEach(cb => cb());
}

export function unregisterPanel(id: string) {
  panels.delete(id);
  listeners.forEach(cb => cb());
}

export function getPanels(): ReadonlyMap<string, GlassPanelEntry> {
  return panels;
}

export function subscribe(cb: UpdateCallback): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
