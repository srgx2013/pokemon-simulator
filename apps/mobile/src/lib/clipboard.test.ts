import { describe, expect, it, vi } from 'vitest';

// expo-clipboard happens through setStringAsync (D-4: the only clipboard path
// on mobile; no navigator.clipboard / document.createElement fallbacks).
vi.mock('expo-clipboard', () => ({
  setStringAsync: vi.fn(),
}));

// expo-file-system provides the temp-file write for the share sheet (F-1).
const { writtenFiles } = vi.hoisted(() => ({
  writtenFiles: [] as Array<{ uri: string; content: string }>,
}));

vi.mock('expo-file-system', () => {
  class MockFile {
    readonly uri: string;

    constructor(base: string, name: string) {
      this.uri = `${base}/${name}`;
    }

    write(content: string) {
      writtenFiles.push({ uri: this.uri, content });
    }
  }

  return {
    File: MockFile,
    Paths: { cache: 'file:///cache' },
  };
});

vi.mock('expo-sharing', () => ({
  shareAsync: vi.fn(),
}));

import * as Clipboard from 'expo-clipboard';
import { copyText, shareText } from './clipboard';
import * as Sharing from 'expo-sharing';

describe('copyText', () => {
  it('writes the exported text to the device clipboard through expo-clipboard', async () => {
    await copyText('# Escenario de prueba');
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith('# Escenario de prueba');
  });
});

describe('shareText', () => {
  it('writes a temp markdown file in the cache dir and opens the share sheet with its URI', async () => {
    const text = '# Export del estado actual';
    await shareText(text);

    // Exactly one temp file is written with the exact exported text (F-1:
    // share payload byte-identical to clipboard export).
    expect(writtenFiles).toHaveLength(1);
    expect(writtenFiles[0].content).toBe(text);
    expect(writtenFiles[0].uri).toMatch(/^file:\/\/\/cache\/pokemon-export-\d+\.md$/);

    // The share sheet receives the file URI and a markdown mime type.
    expect(Sharing.shareAsync).toHaveBeenCalledTimes(1);
    expect(Sharing.shareAsync).toHaveBeenCalledWith(
      writtenFiles[0].uri,
      expect.objectContaining({ mimeType: 'text/markdown' }),
    );
  });
});