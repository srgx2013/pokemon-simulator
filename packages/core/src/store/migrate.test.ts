import { describe, it, expect } from 'vitest';
import { migrateData, DATA_VERSION } from './hydrate';
import { createInMemoryStorage } from '../storage/types';

describe('migrateData', () => {
  it('writes the current data version when the version key is absent', async () => {
    const adapter = createInMemoryStorage({
      'pokemon-autosave': '{"turn":2}',
      'pokemon-custom-decks': '[{"name":"Old Deck"}]',
      'pokemon-scenarios': '[{"name":"Old Scenario"}]',
    });

    await migrateData(adapter);

    const dump = adapter.dump();
    expect(dump['pokemon-data-version']).toBe(DATA_VERSION);
  });

  it('upgrades a stale version without losing the in-progress game', async () => {
    const adapter = createInMemoryStorage({
      'pokemon-data-version': '1',
      'pokemon-autosave': '{"turn":5,"phase":"turn"}',
      'pokemon-custom-decks': '[{"name":"Old Deck"}]',
      'pokemon-scenarios': '[{"name":"Old Scenario"}]',
    });

    await migrateData(adapter);

    const dump = adapter.dump();
    expect(dump['pokemon-data-version']).toBe(DATA_VERSION);
    // The in-progress game is the data that must survive the format upgrade
    // (spec C-4: upgraded without loss); the stale-format keys above are the
    // ones the legacy migration clears to force re-import (see main.tsx v2).
    expect(dump['pokemon-autosave']).toBe('{"turn":5,"phase":"turn"}');
    expect(dump['pokemon-custom-decks']).toBeUndefined();
    expect(dump['pokemon-scenarios']).toBeUndefined();
  });

  it('never throws on malformed custom-decks/scenarios and clears the stale keys', async () => {
    const adapter = createInMemoryStorage({
      'pokemon-data-version': '1',
      'pokemon-custom-decks': '{ not valid json',
      'pokemon-scenarios': '[[[',
      'pokemon-autosave': '{"turn":1}',
    });

    await expect(migrateData(adapter)).resolves.toBeUndefined();

    const dump = adapter.dump();
    expect(dump['pokemon-data-version']).toBe(DATA_VERSION);
    expect(dump['pokemon-custom-decks']).toBeUndefined();
    expect(dump['pokemon-scenarios']).toBeUndefined();
    expect(dump['pokemon-autosave']).toBe('{"turn":1}');
  });

  it('is idempotent across two consecutive runs', async () => {
    const adapter = createInMemoryStorage({
      'pokemon-data-version': '1',
      'pokemon-autosave': '{"turn":3}',
      'pokemon-custom-decks': '[{"name":"Old"}]',
    });

    await migrateData(adapter);
    const afterFirst = adapter.dump();

    await migrateData(adapter);
    const afterSecond = adapter.dump();

    expect(afterSecond).toEqual(afterFirst);
    expect(afterSecond['pokemon-data-version']).toBe(DATA_VERSION);
    expect(afterSecond['pokemon-autosave']).toBe('{"turn":3}');
  });

  it('leaves well-formed data untouched when the version is already current', async () => {
    const adapter = createInMemoryStorage({
      'pokemon-data-version': DATA_VERSION,
      'pokemon-autosave': '{"turn":9}',
      'pokemon-custom-decks': '[{"name":"Current Deck"}]',
      'pokemon-scenarios': '[{"name":"Current Scenario"}]',
    });

    await migrateData(adapter);

    expect(adapter.dump()).toEqual({
      'pokemon-data-version': DATA_VERSION,
      'pokemon-autosave': '{"turn":9}',
      'pokemon-custom-decks': '[{"name":"Current Deck"}]',
      'pokemon-scenarios': '[{"name":"Current Scenario"}]',
    });
  });

  it('honors a caller-supplied data version', async () => {
    const adapter = createInMemoryStorage({ 'pokemon-data-version': '1' });

    await migrateData(adapter, '3');

    expect(adapter.dump()['pokemon-data-version']).toBe('3');
  });
});