import { InMemoryPlayerRepository } from '../../infrastructure/persistence/in-memory-player.repository.js';
import { buildPlayer } from '../../testing/player.fixture.js';
import { ListPlayersUseCase } from './list-players.use-case.js';

describe('ListPlayersUseCase', () => {
  it('trie les joueurs par rang croissant', async () => {
    const repository = new InMemoryPlayerRepository([
      buildPlayer({ id: 1, data: { rank: 5 } }),
      buildPlayer({ id: 2, data: { rank: 1 } }),
      buildPlayer({ id: 3, data: { rank: 3 } }),
    ]);

    const players = await new ListPlayersUseCase(repository).execute();

    expect(players.map((player) => player.data.rank)).toEqual([1, 3, 5]);
  });

  it('départage un rang identique par identifiant croissant', async () => {
    const repository = new InMemoryPlayerRepository([
      buildPlayer({ id: 90, data: { rank: 2 } }),
      buildPlayer({ id: 40, data: { rank: 2 } }),
    ]);

    const players = await new ListPlayersUseCase(repository).execute();

    expect(players.map((player) => player.id)).toEqual([40, 90]);
  });

  it("ne modifie pas l'ordre interne du repository", async () => {
    const repository = new InMemoryPlayerRepository([
      buildPlayer({ id: 30, data: { rank: 3 } }),
      buildPlayer({ id: 20, data: { rank: 2 } }),
      buildPlayer({ id: 10, data: { rank: 1 } }),
    ]);

    const sorted = await new ListPlayersUseCase(repository).execute();
    const stored = await repository.findAll();

    expect(sorted.map((player) => player.id)).toEqual([10, 20, 30]);
    expect(stored.map((player) => player.id)).toEqual([30, 20, 10]);
  });
});
