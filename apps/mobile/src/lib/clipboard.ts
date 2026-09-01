import { File, Paths } from 'expo-file-system';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';

/**
 * Mobile platform bridge for export surfaces (spec F-1, D-4). Replaces the
 * browser's `navigator.clipboard` / `document.createElement` paths with the
 * RN-native equivalents: clipboard via expo-clipboard, share sheet via
 * expo-sharing over a temp markdown file written with expo-file-system.
 */

/** Writes the exported text to the device clipboard. */
export async function copyText(text: string): Promise<void> {
  await Clipboard.setStringAsync(text);
}

/**
 * Writes the exported text to a temp markdown file and opens the native share
 * sheet with it — the same text produced by `copyText` (F-1 byte parity).
 */
export async function shareText(text: string): Promise<void> {
  const file = new File(Paths.cache, `pokemon-export-${Date.now()}.md`);
  file.write(text);
  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/markdown',
    dialogTitle: 'Export scenario',
  });
}