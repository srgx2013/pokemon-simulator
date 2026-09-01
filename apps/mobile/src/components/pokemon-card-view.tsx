import { memo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { PokemonInstance } from '@pokemon-simulator/core/types';
import { energyColors } from '@pokemon-simulator/core/data/decks';

interface Props {
  pokemon: PokemonInstance;
  onPress?: () => void;
  selected?: boolean;
  showDetails?: boolean;
}

/**
 * Mobile-first card render (S4.1, E-1/E-4): RN `<Image>` card (fails gracefully
 * when the image URL is unresolved or fails to load — G-1 non-blocking), HP bar,
 * attached energy orbs, damage and status badges, and attack/ability details on
 * demand. All data comes from the shared core card/state shape, so the render is
 * identical in rules to the web `PokemonCard` while being native (D-4, no CSS).
 */
export const PokemonCardView = memo(function PokemonCardView({
  pokemon,
  onPress,
  selected,
  showDetails = false,
}: Props) {
  const { card, currentHp, damage, status, attachedEnergy } = pokemon;
  const hpPercent = card.hp > 0 ? Math.max(0, Math.min(100, (currentHp / card.hp) * 100)) : 0;
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(card.imageUrl) && !imageFailed;

  return (
    <Pressable
      style={[styles.card, selected && styles.selected, pokemon.isActive && styles.active]}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${card.name}, ${currentHp} de ${card.hp} HP`}
    >
      <View style={styles.header}>
        <Text style={styles.cardName} numberOfLines={1}>
          {card.name}
        </Text>
        <Text style={styles.stage}>{card.stage}</Text>
      </View>

      <View style={styles.imageArea}>
        {showImage ? (
          <Image
            source={{ uri: card.imageUrl }}
            style={styles.cardImage}
            onError={() => setImageFailed(true)}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderEmoji}>🃏</Text>
          </View>
        )}
      </View>

      <View style={styles.hpRow}>
        <View style={styles.hpTrack}>
          <View style={[styles.hpFill, { width: `${hpPercent}%` }]} />
        </View>
        <Text style={styles.hpText}>
          {currentHp}/{card.hp}
        </Text>
      </View>

      {attachedEnergy.length > 0 && (
        <View style={styles.energyRow}>
          {attachedEnergy.map((e, i) => (
            <View key={i} style={[styles.energyOrb, { backgroundColor: energyColors[e] ?? '#9B7DFF' }]}>
              {!energyColors[e] && (
                <Text style={styles.specialEnergyText} numberOfLines={1}>
                  {e.replace(' Energy', '').slice(0, 4)}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      <View style={styles.badgeRow}>
        {damage > 0 && <Text style={styles.damageBadge}>-{damage}</Text>}
        {status !== 'none' && <Text style={styles.statusBadge}>{status}</Text>}
        {pokemon.isActive && <Text style={styles.activeBadge}>ACTIVE</Text>}
      </View>

      {showDetails && (
        <View style={styles.details}>
          {card.attacks.map((a, i) => (
            <View key={i} style={styles.detailRow}>
              <Text style={styles.detailName} numberOfLines={1}>
                {a.name}
              </Text>
              <Text style={styles.detailValue}>{a.damage}</Text>
            </View>
          ))}
          {card.abilities?.map((ab, i) => (
            <View key={`ab-${i}`} style={[styles.detailRow, styles.abilityRow]}>
              <Text style={styles.detailName} numberOfLines={1}>
                {ab.name}
              </Text>
              <Text style={styles.abilityTag}>Ability</Text>
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#16213A',
    borderColor: '#2A3B5C',
    borderWidth: 1,
    borderRadius: 12,
    padding: 8,
    minWidth: 108,
    maxWidth: 190,
  },
  selected: {
    borderColor: '#208AEF',
    borderWidth: 2,
  },
  active: {
    borderColor: '#4CC38A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
  },
  cardName: {
    color: '#F5F9FF',
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
  },
  stage: {
    color: '#9FB2C8',
    fontSize: 10,
    textTransform: 'capitalize',
  },
  imageArea: {
    height: 44,
    marginVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 24,
  },
  hpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hpTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0B1220',
    overflow: 'hidden',
  },
  hpFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#4CC38A',
  },
  hpText: {
    color: '#F5F9FF',
    fontSize: 10,
    fontVariant: ['tabular-nums'],
  },
  energyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  energyOrb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  specialEnergyText: {
    color: '#0B1220',
    fontSize: 6,
    fontWeight: '700',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  damageBadge: {
    backgroundColor: '#FF5A5F',
    color: '#0B1220',
    fontSize: 10,
    fontWeight: '700',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  statusBadge: {
    backgroundColor: '#C97BFF',
    color: '#0B1220',
    fontSize: 10,
    fontWeight: '700',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  activeBadge: {
    backgroundColor: '#4CC38A',
    color: '#0B1220',
    fontSize: 9,
    fontWeight: '800',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  details: {
    marginTop: 6,
    borderTopColor: '#2A3B5C',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 4,
    gap: 2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  detailName: {
    color: '#C9D6EA',
    fontSize: 10,
    flexShrink: 1,
  },
  detailValue: {
    color: '#F5F9FF',
    fontSize: 10,
    fontWeight: '700',
  },
  abilityRow: {
    borderTopColor: '#2A3B5C',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 2,
  },
  abilityTag: {
    color: '#C97BFF',
    fontSize: 9,
    fontWeight: '700',
  },
});