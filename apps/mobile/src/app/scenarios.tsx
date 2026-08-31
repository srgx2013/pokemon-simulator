import { ScenarioEditorView } from '@/components/scenario-editor-view';

/**
 * Scenarios tab (F-3). Slice 3 placeholder replaced by the save/load/delete
 * lifecycle surface (S4.5), wired to the async adapter-persisted core store
 * actions and seeded by core `hydrate()` read-back across restarts.
 */
export default function ScenariosScreen() {
  return <ScenarioEditorView />;
}