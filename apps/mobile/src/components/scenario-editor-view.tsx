import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useStorage } from '@/hooks/useStorage';
import {
  canSaveCurrentGame,
  loadScenario,
  removeScenario,
  saveCurrentScenario,
} from '@/lib/scenarioWiring';

/**
 * Scenario editor surface (S4.5, F-3, C-5): save the current game as a named
 * scenario, load it back, delete it — all through the async adapter-persisted
 * core store actions, so scenarios survive app restarts and hydrate() seeds the
 * list on the next launch (F-3 read-back). Name input via Modal, confirmations
 * via Alert (D-4).
 */
export function ScenarioEditorView() {
  const { store } = useStorage();
  const scenarios = store(s => s.scenarios);
  const selectedScenario = store(s => s.selectedScenario);
  const gameState = store(s => s.gameState);

  const [showSave, setShowSave] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const canSave = canSaveCurrentGame(gameState);

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    const scenario = await saveCurrentScenario(store, name);
    setSaving(false);
    setShowSave(false);
    setName('');
    Alert.alert(
      scenario ? 'Escenario guardado' : 'No hay partida',
      scenario ? `"${scenario.name}" quedó guardado.` : 'Iniciá una partida antes de guardar un escenario.',
    );
  };

  const handleLoad = (id: string, name: string) => {
    const loaded = loadScenario(store, id);
    if (loaded) {
      Alert.alert('Escenario cargado', `"${name}" se restauró en el tablero.`);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Eliminar escenario', `¿Eliminar "${name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => void removeScenario(store, id) },
    ]);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>📜 Escenarios</Text>
        <Pressable
          style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
          onPress={() => setShowSave(true)}
          disabled={!canSave}
        >
          <Text style={styles.saveBtnText}>💾 Guardar estado actual</Text>
        </Pressable>
      </View>

      {!canSave && (
        <Text style={styles.hint}>Iniciá una partida en el tablero para poder guardarla como escenario.</Text>
      )}

      {scenarios.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Todavía no hay escenarios guardados.</Text>
        </View>
      ) : (
        scenarios.map(sc => (
          <View key={sc.id} style={[styles.scenarioRow, selectedScenario?.id === sc.id && styles.scenarioRowSelected]}>
            <View style={styles.scenarioInfo}>
              <Text style={styles.scenarioName}>{sc.name}</Text>
              <Text style={styles.scenarioDate}>{new Date(sc.createdAt).toLocaleString()}</Text>
              {selectedScenario?.id === sc.id && <Text style={styles.scenarioBadge}>ACTIVO</Text>}
            </View>
            <Pressable style={styles.rowBtn} onPress={() => handleLoad(sc.id, sc.name)}>
              <Text style={styles.rowBtnText}>Cargar</Text>
            </Pressable>
            <Pressable style={styles.rowBtnDelete} onPress={() => handleDelete(sc.id, sc.name)}>
              <Text style={styles.rowBtnDeleteText}>✕</Text>
            </Pressable>
          </View>
        ))
      )}

      <Modal visible={showSave} transparent animationType="fade" onRequestClose={() => setShowSave(false)}>
        <Pressable style={styles.backdrop} onPress={() => setShowSave(false)}>
          <Pressable style={styles.modal} onPress={() => {}}>
            <Text style={styles.modalTitle}>💾 Guardar escenario</Text>
            <TextInput
              style={styles.nameInput}
              placeholder="Nombre del escenario"
              placeholderTextColor="#9FB2C8"
              value={name}
              onChangeText={setName}
              autoFocus
            />
            <Pressable
              style={[styles.confirmBtn, !name.trim() && styles.confirmBtnDisabled]}
              onPress={handleSave}
              disabled={!name.trim() || saving}
            >
              <Text style={styles.confirmBtnText}>{saving ? '⏳ Guardando…' : 'Guardar'}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0B1220',
  },
  content: {
    padding: 14,
    gap: 10,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: '#F5F9FF',
    fontSize: 19,
    fontWeight: '800',
  },
  saveBtn: {
    backgroundColor: '#208AEF',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  saveBtnDisabled: {
    opacity: 0.4,
  },
  saveBtnText: {
    color: '#0B1220',
    fontSize: 12,
    fontWeight: '800',
  },
  hint: {
    color: '#9FB2C8',
    fontSize: 12,
    fontStyle: 'italic',
  },
  emptyBox: {
    backgroundColor: '#16213A',
    borderRadius: 12,
    borderColor: '#2A3B5C',
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    color: '#9FB2C8',
    fontSize: 13,
  },
  scenarioRow: {
    backgroundColor: '#16213A',
    borderRadius: 12,
    borderColor: '#2A3B5C',
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scenarioRowSelected: {
    borderColor: '#4CC38A',
  },
  scenarioInfo: {
    flex: 1,
    gap: 2,
  },
  scenarioName: {
    color: '#F5F9FF',
    fontSize: 14,
    fontWeight: '700',
  },
  scenarioDate: {
    color: '#9FB2C8',
    fontSize: 11,
  },
  scenarioBadge: {
    color: '#4CC38A',
    fontSize: 10,
    fontWeight: '800',
    alignSelf: 'flex-start',
  },
  rowBtn: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  rowBtnText: {
    color: '#0B1220',
    fontSize: 12,
    fontWeight: '800',
  },
  rowBtnDelete: {
    backgroundColor: '#3A1620',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  rowBtnDeleteText: {
    color: '#FF7B80',
    fontSize: 12,
    fontWeight: '800',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modal: {
    backgroundColor: '#16213A',
    borderRadius: 14,
    borderColor: '#2A3B5C',
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  modalTitle: {
    color: '#F5F9FF',
    fontSize: 15,
    fontWeight: '700',
  },
  nameInput: {
    backgroundColor: '#0B1220',
    borderRadius: 10,
    color: '#F5F9FF',
    fontSize: 13,
    padding: 10,
    minHeight: 44,
  },
  confirmBtn: {
    backgroundColor: '#4CC38A',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmBtnDisabled: {
    opacity: 0.4,
  },
  confirmBtnText: {
    color: '#0B1220',
    fontSize: 14,
    fontWeight: '800',
  },
});