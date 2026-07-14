import { memo } from 'react';
import type { PokemonInstance } from '../types';
import { energyColors } from '../data/decks';

interface Props {
  pokemon: PokemonInstance;
  onClick?: () => void;
  selected?: boolean;
  showDetails?: boolean;
}

export const PokemonCard = memo(function PokemonCard({ pokemon, onClick, selected, showDetails = false }: Props) {
  const { card, currentHp, damage, status, attachedEnergy } = pokemon;
  const hpPercent = (currentHp / card.hp) * 100;
  const isActive = pokemon.isActive;

  return (
    <div
      className={`pokemon-card ${selected ? 'selected' : ''} ${isActive ? 'active' : ''}`}
      onClick={onClick}
    >
      <div className="card-header">
        <span className="pokemon-name">{card.name}</span>
        <span className={`stage ${card.stage}`}>{card.stage}</span>
      </div>
      
      <div className="card-image">
        <div className="hp-bar">
          <div className="hp-fill" style={{ width: `${hpPercent}%` }} />
        </div>
        <span className="hp-text">{currentHp}/{card.hp}</span>
      </div>

      {attachedEnergy.length > 0 && (
        <div className="energy-attachments">
          {attachedEnergy.map((e, i) =>
            energyColors[e] ? (
              <div
                key={i}
                className="energy-orb"
                style={{ backgroundColor: energyColors[e] }}
              />
            ) : (
              <div key={i} className="energy-orb special-orb" title={e}>
                {e.replace(' Energy', '').slice(0, 4)}
              </div>
            )
          )}
        </div>
      )}

      {damage > 0 && (
        <div className="damage-badge">-{damage}</div>
      )}

      {status !== 'none' && (
        <div className="status-badge">{status}</div>
      )}

      {isActive && <div className="active-indicator">ACTIVE</div>}

      {showDetails && card.attacks && (
        <div className="attacks-list">
          {card.attacks.map((attack, i) => (
            <div key={i} className="attack">
              <span className="attack-name">{attack.name}</span>
              <span className="attack-damage">{attack.damage}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});