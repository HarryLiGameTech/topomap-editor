import type { MapState } from '../hooks/useMapStore';

/** Build the persistent map shape accepted by loadMap and the JSON import flow. */
export function createMapBackup(state: MapState) {
  return {
    meta: state.meta,
    triangles: state.triangles,
    lines: state.lines,
  };
}

export function downloadMapBackup(state: MapState): void {
  const json = JSON.stringify(createMapBackup(state), null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeMapName = state.meta.mapName
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_') || 'topomap';

  link.href = url;
  link.download = `${safeMapName}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
