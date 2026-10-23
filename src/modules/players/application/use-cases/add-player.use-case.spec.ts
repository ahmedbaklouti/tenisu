import { PlayerIdAlreadyExistsError } from '../../domain/errors/player-id-already-exists.error.js';
import type { PlayerDraft } from '../../domain/entities/player.entity.js';
import { InMemoryPlayerRepository } from '../../infrastructure/persistence/in-memory-player.repository.js';
import { buildPlayer } from '../../testing/player.fixture.js';
import { AddPlayerUseCase } from './add-player.use-case.js';

const NEW_PLAYER: PlayerDraft = {
  firstname: 'Roger',
  lastname: 'Federer',
  shortname: 'R.FED',
  sex: 'M',
  country: { picture: 'https://tenisu.latelier.co/resources/Suisse.png', code: 'SUI' },
  picture: 'https://tenisu.latelier.co/resources/Federer.png',
  data: { rank: 3, points: 2000, weight: 85000, height: 185, age: 37, last: [1, 0, 1] },
};

describe('AddPlayerUseCase', () => {
  it('ajoute un joueur avec un identifiant fourni', async () => {
    const repository = new InMemoryPlayerRepository([buildPlayer({ id: 52 })]);
    const useCase = new AddPlayerUseCase(repository);

    const player = await useCase.execute({ ...NEW_PLAYER, id: 200 });

    expect(player).toMatchObject({ id: 200, firstname: 'Roger', lastname: 'Federer' });
    await expect(repository.findById(200)).resolves.toMatchObject({ id: 200 });
    await expect(repository.findAll()).resolves.toHaveLength(2);
  });

  it('attribue le prochain entier supérieur au plus grand identifiant existant', async () => {
    const repository = new InMemoryPlayerRepository([
      buildPlayer({ id: 52 }),
      buildPlayer({ id: 95 }),
      buildPlayer({ id: 65 }),
      buildPlayer({ id: 102 }),
      buildPlayer({ id: 17 }),
    ]);
    const useCase = new AddPlayerUseCase(repository);

    const player = await useCase.execute(NEW_PLAYER);

    expect(player.id).toBe(103);
  });

  it("s'appuie sur le plus grand identifiant même lorsque les identifiants ne sont pas contigus", async () => {
    const repository = new InMemoryPlayerRepository([
      buildPlayer({ id: 1 }),
      buildPlayer({ id: 5 }),
      buildPlayer({ id: 3 }),
    ]);

    const player = await new AddPlayerUseCase(repository).execute(NEW_PLAYER);

    expect(player.id).toBe(6);
  });

  it('refuse un identifiant déjà utilisé', async () => {
    const repository = new InMemoryPlayerRepository([buildPlayer({ id: 52 })]);
    const useCase = new AddPlayerUseCase(repository);

    await expect(useCase.execute({ ...NEW_PLAYER, id: 52 })).rejects.toThrow(
      PlayerIdAlreadyExistsError,
    );
    await expect(repository.findAll()).resolves.toHaveLength(1);
  });
});
