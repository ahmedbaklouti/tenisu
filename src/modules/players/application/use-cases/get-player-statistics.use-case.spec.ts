import { PlayerNotFoundError } from '../../domain/errors/player-not-found.error.js';
import { InMemoryPlayerRepository } from '../../infrastructure/persistence/in-memory-player.repository.js';
import { buildPlayer } from '../../testing/player.fixture.js';
import { GetPlayerStatisticsUseCase } from './get-player-statistics.use-case.js';

describe('GetPlayerStatisticsUseCase', () => {
  it('retourne les statistiques individuelles du joueur demandé', async () => {
    const repository = new InMemoryPlayerRepository([
      buildPlayer({ id: 52, data: { last: [1, 1, 1, 1, 1] } }),
      buildPlayer({ id: 95, data: { last: [1, 0, 0] } }),
    ]);

    const statistics = await new GetPlayerStatisticsUseCase(repository).execute(95);

    expect(statistics).toEqual({
      playerId: 95,
      wins: 1,
      losses: 2,
      matchesPlayed: 3,
      winRatio: 1 / 3,
    });
  });

  it('échoue lorsqu’aucun joueur ne porte cet identifiant', async () => {
    const useCase = new GetPlayerStatisticsUseCase(
      new InMemoryPlayerRepository([buildPlayer({ id: 52 })]),
    );

    await expect(useCase.execute(9999)).rejects.toBeInstanceOf(PlayerNotFoundError);
  });
});
