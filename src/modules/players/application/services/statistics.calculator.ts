import type { Player } from '../../domain/entities/player.entity.js';

/** Ratio de victoires agrégé pour un pays. */
export interface CountryWinRatio {
  code: string;
  wins: number;
  matches: number;
  /** Ratio entre 0 et 1 (jamais en pourcentage). */
  ratio: number;
}

/** Indice de masse corporelle d'un joueur, en kg/m². */
export function computeBmi(player: Player): number {
  const weightKg = player.data.weight / 1000;
  const heightM = player.data.height / 100;

  return weightKg / (heightM * heightM);
}

/** Moyenne arithmétique des IMC, arrondie à deux décimales (aucun arrondi intermédiaire). */
export function computeAverageBmi(players: readonly Player[]): number {
  if (players.length === 0) {
    return 0;
  }

  const totalBmi = players.reduce((sum, player) => sum + computeBmi(player), 0);

  return roundToTwoDecimals(totalBmi / players.length);
}

/** Médiane des tailles en centimètres (0 si la liste est vide). */
export function computeMedianHeightCm(players: readonly Player[]): number {
  const heights = players.map((player) => player.data.height).sort((a, b) => a - b);
  const middleIndex = Math.floor(heights.length / 2);
  const middleHeight = heights.at(middleIndex);

  if (middleHeight === undefined) {
    return 0;
  }
  if (heights.length % 2 === 1) {
    return middleHeight;
  }

  const lowerHeight = heights.at(middleIndex - 1) ?? middleHeight;

  return (lowerHeight + middleHeight) / 2;
}

/**
 * Ratio de victoires par pays : les victoires et les matchs de tous les joueurs
 * d'un pays sont agrégés avant le calcul du ratio.
 *
 * Le résultat est trié par ratio décroissant, puis par code pays croissant afin
 * de garantir un résultat déterministe en cas d'égalité.
 */
export function computeCountryWinRatios(players: readonly Player[]): CountryWinRatio[] {
  const totalsByCountry = new Map<string, { wins: number; matches: number }>();

  for (const player of players) {
    const totals = totalsByCountry.get(player.country.code) ?? { wins: 0, matches: 0 };

    totals.wins += player.data.last.filter((result) => result === 1).length;
    totals.matches += player.data.last.length;
    totalsByCountry.set(player.country.code, totals);
  }

  return [...totalsByCountry.entries()]
    .map(([code, totals]) => ({
      code,
      wins: totals.wins,
      matches: totals.matches,
      ratio: totals.matches === 0 ? 0 : totals.wins / totals.matches,
    }))
    .sort((a, b) => b.ratio - a.ratio || a.code.localeCompare(b.code));
}

/** Pays au meilleur ratio de victoires, ou `undefined` si aucun joueur n'est fourni. */
export function pickCountryWithHighestWinRatio(
  players: readonly Player[],
): CountryWinRatio | undefined {
  return computeCountryWinRatios(players).at(0);
}

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}
