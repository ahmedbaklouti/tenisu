import { buildPlayer } from '../../testing/player.fixture.js';
import {
  computeAverageBmi,
  computeBmi,
  computeCountryWinRatios,
  computeMedianHeightCm,
  computePlayerWinStats,
  pickCountryWithHighestWinRatio,
} from './statistics.calculator.js';

describe('computeBmi', () => {
  it('convertit le poids (grammes) et la taille (centimètres)', () => {
    const player = buildPlayer({ data: { weight: 50000, height: 200 } });

    // 50 kg / (2 m)² = 12,5 kg/m²
    expect(computeBmi(player)).toBe(12.5);
  });

  it('calcule un IMC non entier sans arrondi intermédiaire', () => {
    const player = buildPlayer({ data: { weight: 80000, height: 188 } });

    // 80 kg / (1,88 m)² = 22,634676…
    expect(computeBmi(player)).toBeCloseTo(22.634676, 6);
  });
});

describe('computeAverageBmi', () => {
  it('calcule la moyenne arithmétique des IMC', () => {
    const players = [
      buildPlayer({ data: { weight: 60000, height: 150 } }),
      buildPlayer({ data: { weight: 90000, height: 150 } }),
    ];

    // (26,666… + 40) / 2 = 33,333… → 33,33
    expect(computeAverageBmi(players)).toBe(33.33);
  });

  it("n'arrondit qu'une seule fois, à la fin du calcul", () => {
    const players = [
      // 30 kg / (3 m)² = 3,333…
      buildPlayer({ data: { weight: 30000, height: 300 } }),
      // 10 kg / (1 m)² = 10
      buildPlayer({ data: { weight: 10000, height: 100 } }),
    ];

    // Exact : (3,333… + 10) / 2 = 6,666… → 6,67
    // Avec un arrondi intermédiaire : (3,33 + 10) / 2 = 6,665 → 6,66
    expect(computeAverageBmi(players)).toBe(6.67);
  });

  it('retourne 0 lorsqu’il n’y a aucun joueur', () => {
    expect(computeAverageBmi([])).toBe(0);
  });
});

describe('computeMedianHeightCm', () => {
  it('retourne la taille centrale pour un nombre impair de joueurs', () => {
    const players = [
      buildPlayer({ data: { height: 188 } }),
      buildPlayer({ data: { height: 175 } }),
      buildPlayer({ data: { height: 185 } }),
    ];

    expect(computeMedianHeightCm(players)).toBe(185);
  });

  it('retourne la moyenne des deux tailles centrales pour un nombre pair de joueurs', () => {
    const players = [
      buildPlayer({ data: { height: 188 } }),
      buildPlayer({ data: { height: 175 } }),
    ];

    expect(computeMedianHeightCm(players)).toBe(181.5);
  });

  it('trie les tailles avant de calculer la médiane', () => {
    const players = [
      buildPlayer({ data: { height: 190 } }),
      buildPlayer({ data: { height: 175 } }),
      buildPlayer({ data: { height: 180 } }),
      buildPlayer({ data: { height: 185 } }),
    ];

    // Tailles triées : 175, 180, 185, 190 → (180 + 185) / 2
    expect(computeMedianHeightCm(players)).toBe(182.5);
  });

  it('retourne 0 lorsqu’il n’y a aucun joueur', () => {
    expect(computeMedianHeightCm([])).toBe(0);
  });
});

describe('computePlayerWinStats', () => {
  it('compte les victoires, les défaites et le ratio de victoires', () => {
    const player = buildPlayer({ data: { last: [1, 1, 0, 1, 0] } });

    expect(computePlayerWinStats(player)).toEqual({
      wins: 3,
      losses: 2,
      matchesPlayed: 5,
      winRatio: 0.6,
    });
  });

  it('retourne un ratio de 1 pour un joueur invaincu', () => {
    const player = buildPlayer({ id: 52, data: { last: [1, 1, 1, 1, 1] } });

    expect(computePlayerWinStats(player)).toEqual({
      wins: 5,
      losses: 0,
      matchesPlayed: 5,
      winRatio: 1,
    });
  });

  it('retourne 0 sans arrondi pour un joueur qui a tout perdu', () => {
    const player = buildPlayer({ data: { last: [0, 0, 0] } });

    expect(computePlayerWinStats(player)).toEqual({
      wins: 0,
      losses: 3,
      matchesPlayed: 3,
      winRatio: 0,
    });
  });

  it('retourne un ratio nul sans match enregistré', () => {
    const player = buildPlayer({ data: { last: [] } });

    expect(computePlayerWinStats(player)).toEqual({
      wins: 0,
      losses: 0,
      matchesPlayed: 0,
      winRatio: 0,
    });
  });
});

describe('computeCountryWinRatios', () => {
  it('agrège les victoires et les matchs de tous les joueurs d’un pays', () => {
    const players = [
      buildPlayer({ id: 1, country: { code: 'SUI' }, data: { last: [1, 0, 0, 0] } }),
      buildPlayer({ id: 2, country: { code: 'SUI' }, data: { last: [1] } }),
    ];

    // 2 victoires sur 5 matchs : la moyenne des ratios individuels (0,25 et 1) donnerait 0,625.
    expect(computeCountryWinRatios(players)).toEqual([
      { code: 'SUI', wins: 2, matches: 5, ratio: 0.4 },
    ]);
  });

  it('trie par ratio décroissant et départage les égalités par ordre alphabétique', () => {
    const players = [
      buildPlayer({ id: 1, country: { code: 'USA' }, data: { last: [1, 1] } }),
      buildPlayer({ id: 2, country: { code: 'ESP' }, data: { last: [0, 1] } }),
      buildPlayer({ id: 3, country: { code: 'ALB' }, data: { last: [1] } }),
    ];

    expect(computeCountryWinRatios(players)).toEqual([
      { code: 'ALB', wins: 1, matches: 1, ratio: 1 },
      { code: 'USA', wins: 2, matches: 2, ratio: 1 },
      { code: 'ESP', wins: 1, matches: 2, ratio: 0.5 },
    ]);
  });

  it('retourne un tableau vide sans joueur', () => {
    expect(computeCountryWinRatios([])).toEqual([]);
  });
});

describe('pickCountryWithHighestWinRatio', () => {
  it('retourne le pays au meilleur ratio', () => {
    const players = [
      buildPlayer({ id: 1, country: { code: 'SRB' }, data: { last: [1, 1, 1, 1, 1] } }),
      buildPlayer({ id: 2, country: { code: 'USA' }, data: { last: [0, 1] } }),
    ];

    expect(pickCountryWithHighestWinRatio(players)).toEqual({
      code: 'SRB',
      wins: 5,
      matches: 5,
      ratio: 1,
    });
  });

  it('départage les égalités de ratio par ordre alphabétique du code pays', () => {
    const players = [
      buildPlayer({ id: 1, country: { code: 'USA' }, data: { last: [1] } }),
      buildPlayer({ id: 2, country: { code: 'ALB' }, data: { last: [1] } }),
    ];

    expect(pickCountryWithHighestWinRatio(players)?.code).toBe('ALB');
  });

  it('retourne undefined sans joueur', () => {
    expect(pickCountryWithHighestWinRatio([])).toBeUndefined();
  });
});
