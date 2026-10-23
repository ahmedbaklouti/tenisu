import { PlayerNotFoundError } from '../../domain/errors/player-not-found.error.js';
import { InMemoryPlayerRepository } from '../../infrastructure/persistence/in-memory-player.repository.js';
import { buildPlayer } from '../../testing/player.fixture.js';
import { GetPlayerByIdUseCase } from './get-player-by-id.use-case.js';

describe('GetPlayerByIdUseCase', () => {
  const repository = new InMemoryPlayerRepository([
    buildPlayer({ id: 17, firstname: 'Rafael', lastname: 'Nadal' }),
    buildPlayer({ id: 65, firstname: 'Stan', lastname: 'Wawrinka' }),
  ]);
  const useCase = new GetPlayerByIdUseCase(repository);

  it('retourne le joueur correspondant à son identifiant', async () => {
    const player = await useCase.execute(65);

    expect(player).toMatchObject({ id: 65, firstname: 'Stan', lastname: 'Wawrinka' });
  });

  it("lève une erreur métier lorsqu'aucun joueur ne correspond", async () => {
    await expect(useCase.execute(999)).rejects.toThrow(PlayerNotFoundError);
  });
});
