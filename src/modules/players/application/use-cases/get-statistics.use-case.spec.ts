import { InMemoryPlayerRepository } from '../../infrastructure/persistence/in-memory-player.repository.js';
import { buildPlayer } from '../../testing/player.fixture.js';
import { GetStatisticsUseCase } from './get-statistics.use-case.js';

describe('GetStatisticsUseCase', () => {
  it('calcule le pays au meilleur ratio, l’IMC moyen et la médiane des tailles', async () => {
    const repository = new InMemoryPlayerRepository([
      buildPlayer({
        id: 1,
        country: { code: 'SRB' },
        data: { last: [1, 1, 1], height: 180, weight: 80000 },
      }),
      buildPlayer({
        id: 2,
        country: { code: 'USA' },
        data: { last: [1, 0], height: 190, weight: 90000 },
      }),
      buildPlayer({
        id: 3,
        country: { code: 'USA' },
        data: { last: [0, 1], height: 170, weight: 70000 },
      }),
    ]);

    const statistics = await new GetStatisticsUseCase(repository).execute();

    expect(statistics).toEqual({
      // SRB : 3 victoires sur 3 matchs ; USA : 2 victoires sur 4 matchs
      countryWithHighestWinRatio: { code: 'SRB', wins: 3, matches: 3, ratio: 1 },
      // (24,691… + 24,930… + 24,221…) / 3 = 24,614… → 24,61
      averageBmi: 24.61,
      // Tailles triées : 170, 180, 190
      medianHeightCm: 180,
    });
  });

  it('retourne des statistiques neutres lorsque le repository est vide', async () => {
    const useCase = new GetStatisticsUseCase(new InMemoryPlayerRepository([]));

    await expect(useCase.execute()).resolves.toEqual({
      countryWithHighestWinRatio: null,
      averageBmi: 0,
      medianHeightCm: 0,
    });
  });
});
