import type { Player, PlayerCountry, PlayerData } from '../domain/entities/player.entity.js';

const BASE_PLAYER: Player = {
  id: 1,
  firstname: 'Novak',
  lastname: 'Djokovic',
  shortname: 'N.DJO',
  sex: 'M',
  country: { picture: 'https://tenisu.latelier.co/resources/Serbie.png', code: 'SRB' },
  picture: 'https://tenisu.latelier.co/resources/Djokovic.png',
  data: { rank: 1, points: 2542, weight: 80000, height: 188, age: 31, last: [1, 1, 1, 1, 1] },
};

interface PlayerOverrides extends Partial<Omit<Player, 'country' | 'data'>> {
  country?: Partial<PlayerCountry>;
  data?: Partial<PlayerData>;
}

/**
 * Construit un joueur de test à partir d'un joueur de référence, chaque appel
 * produisant un objet indépendant (aucun état partagé entre les tests).
 */
export function buildPlayer(overrides: PlayerOverrides = {}): Player {
  return {
    ...BASE_PLAYER,
    ...overrides,
    country: { ...BASE_PLAYER.country, ...(overrides.country ?? {}) },
    data: { ...BASE_PLAYER.data, ...(overrides.data ?? {}) },
  };
}
