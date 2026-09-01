import { ExportPanelView } from '@/components/export-panel-view';

/**
 * Export tab (F-1/F-2). Slice 3 placeholder replaced by the real clipboard /
 * share export + JSON import surface (S4.4), all through the shared core
 * exporter/importer and the native clipboard bridge.
 */
export default function ExportScreen() {
  return <ExportPanelView />;
}