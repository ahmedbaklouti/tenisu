import { buildPlayer } from '../../testing/player.fixture.js';
import { InMemoryPlayerRepository, loadInitialPlayers } from './in-memory-player.repository.js';

describe('loadInitialPlayers', () => {
  it('charge le dataset initial (5 joueurs)', () => {
    const players = loadInitialPlayers();

    expect(players).toHaveLength(5);
    expect(players.map((player) => player.id)).toEqual([52, 95, 65, 102, 17]);
  });

  it('retourne une copie indépendante du jeu de données embarqué', () => {
    const firstLoad = loadInitialPlayers();

    firstLoad[0]!.firstname = 'Modifié';
    firstLoad.pop();

    const secondLoad = loadInitialPlayers();

    expect(secondLoad).toHaveLength(5);
    expect(secondLoad[0]!.firstname).toBe('Novak');
  });
});

describe('InMemoryPlayerRepository', () => {
  it('retourne tous les joueurs dans leur ordre de stockage', async () => {
    const repository = new InMemoryPlayerRepository([
      buildPlayer({ id: 7 }),
      buildPlayer({ id: 3 }),
    ]);

    const players = await repository.findAll();

    expect(players.map((player) => player.id)).toEqual([7, 3]);
  });

  it("met à disposition une copie : une modification externe n'affecte pas le repository", async () => {
    const repository = new InMemoryPlayerRepository([buildPlayer({ id: 7, firstname: 'Novak' })]);

    const players = await repository.findAll();
    players[0]!.firstname = 'Modifié';
    players.push(buildPlayer({ id: 8 }));

    await expect(repository.findAll()).resolves.toHaveLength(1);
    await expect(repository.findById(7)).resolves.toMatchObject({ firstname: 'Novak' });
  });

  it('ne partage aucune référence avec le jeu de données fourni au constructeur', async () => {
    const initialPlayers = [buildPlayer({ id: 7, firstname: 'Novak' })];
    const repository = new InMemoryPlayerRepository(initialPlayers);

    initialPlayers[0]!.firstname = 'Modifié';
    initialPlayers.push(buildPlayer({ id: 8 }));

    const players = await repository.findAll();

    expect(players).toHaveLength(1);
    expect(players[0]!.firstname).toBe('Novak');
  });

  it('retourne undefined pour un identifiant inexistant', async () => {
    const repository = new InMemoryPlayerRepository([buildPlayer({ id: 7 })]);

    await expect(repository.findById(999)).resolves.toBeUndefined();
  });

  it('ajoute un joueur qui peut ensuite être consulté', async () => {
    const repository = new InMemoryPlayerRepository();
    const createdPlayer = buildPlayer({ id: 300, firstname: 'Roger' });

    await repository.save(createdPlayer);

    const players = await repository.findAll();

    expect(players).toHaveLength(6);
    await expect(repository.findById(300)).resolves.toMatchObject({
      id: 300,
      firstname: 'Roger',
    });
  });
});
