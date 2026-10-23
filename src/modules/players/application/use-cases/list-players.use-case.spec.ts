import { InMemoryPlayerRepository } from '../../infrastructure/persistence/in-memory-player.repository.js';
import { buildPlayer } from '../../testing/player.fixture.js';
import { ListPlayersUseCase } from './list-players.use-case.js';
import type { PlayerSearchCriteria } from './list-players.use-case.js';

/**
 * Jeu de données de test, jamais partagé entre les tests : chaque appel
 * reconstruit un repository neuf à partir de ces joueurs.
 *
 * | id | pays | rang | âge |
 * | -- | ---- | ---- | --- |
 * | 1  | SRB  | 1    | 31  |
 * | 2  | USA  | 10   | 38  |
 * | 3  | ESP  | 21   | 33  |
 * | 4  | USA  | 52   | 37  |
 */
function buildRepository(): InMemoryPlayerRepository {
  return new InMemoryPlayerRepository([
    buildPlayer({ id: 1, country: { code: 'SRB' }, data: { rank: 1, age: 31 } }),
    buildPlayer({ id: 2, country: { code: 'USA' }, data: { rank: 10, age: 38 } }),
    buildPlayer({ id: 3, country: { code: 'ESP' }, data: { rank: 21, age: 33 } }),
    buildPlayer({ id: 4, country: { code: 'USA' }, data: { rank: 52, age: 37 } }),
  ]);
}

/** Exécute le cas d'usage sur un repository neuf et retourne les identifiants. */
async function listIds(criteria: PlayerSearchCriteria = {}): Promise<number[]> {
  const players = await new ListPlayersUseCase(buildRepository()).execute(criteria);

  return players.map((player) => player.id);
}

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

  describe('sans critère', () => {
    it('retourne tous les joueurs triés par rang croissant', async () => {
      expect(await listIds()).toEqual([1, 2, 3, 4]);
    });
  });

  describe('filtre par pays', () => {
    it('ne retient que les joueurs du pays demandé', async () => {
      expect(await listIds({ country: 'USA' })).toEqual([2, 4]);
    });

    it('compare le code pays sans tenir compte de la casse', async () => {
      expect(await listIds({ country: 'srb' })).toEqual([1]);
      expect(await listIds({ country: 'EsP' })).toEqual([3]);
    });

    it('retourne une liste vide lorsque aucun pays ne correspond', async () => {
      expect(await listIds({ country: 'ZZZ' })).toEqual([]);
    });
  });

  describe('filtre par rang', () => {
    it('applique un rang minimum (borne incluse)', async () => {
      expect(await listIds({ minRank: 10 })).toEqual([2, 3, 4]);
    });

    it('applique un rang maximum (borne incluse)', async () => {
      expect(await listIds({ maxRank: 21 })).toEqual([1, 2, 3]);
    });

    it('applique un intervalle de rang', async () => {
      expect(await listIds({ minRank: 10, maxRank: 21 })).toEqual([2, 3]);
    });

    it('accepte un intervalle réduit à une seule valeur', async () => {
      expect(await listIds({ minRank: 21, maxRank: 21 })).toEqual([3]);
    });

    it('retourne une liste vide lorsqu’aucun rang ne correspond', async () => {
      expect(await listIds({ minRank: 100 })).toEqual([]);
    });
  });

  describe('filtre par âge', () => {
    it('applique un âge minimum (borne incluse)', async () => {
      expect(await listIds({ minAge: 33 })).toEqual([2, 3, 4]);
    });

    it('applique un âge maximum (borne incluse)', async () => {
      expect(await listIds({ maxAge: 33 })).toEqual([1, 3]);
    });

    it('applique un intervalle d’âge', async () => {
      expect(await listIds({ minAge: 33, maxAge: 37 })).toEqual([3, 4]);
    });
  });

  describe('combinaison de critères', () => {
    it('combine le pays, le rang et l’âge avec une logique ET', async () => {
      expect(await listIds({ country: 'USA', minRank: 10, maxAge: 38 })).toEqual([2, 4]);
      expect(await listIds({ country: 'USA', minRank: 20 })).toEqual([4]);
      expect(await listIds({ country: 'USA', minRank: 10, minAge: 38 })).toEqual([2]);
    });

    it('conserve le tri par rang croissant après filtrage', async () => {
      const players = await new ListPlayersUseCase(buildRepository()).execute({ maxRank: 52 });
      const ranks = players.map((player) => player.data.rank);

      expect(ranks).toEqual([...ranks].sort((first, second) => first - second));
      expect(players.map((player) => player.id)).toEqual([1, 2, 3, 4]);
    });

    it('retourne une liste vide sans correspondance', async () => {
      expect(await listIds({ country: 'ESP', minRank: 100 })).toEqual([]);
    });
  });

  describe('tri configurable', () => {
    /**
     * Jeu de données dédié au tri, avec égalités volontaires sur chaque champ :
     * rangs 1 (10 et 40), points 300 (10 et 30), âges 30 (10 et 20),
     * tailles 180 (10 et 30).
     *
     * | id | pays | rang | points | âge | taille |
     * | -- | ---- | ---- | ------ | --- | ------ |
     * | 10 | ESP  | 1    | 300    | 30  | 180    |
     * | 40 | USA  | 1    | 200    | 50  | 170    |
     * | 20 | USA  | 2    | 100    | 30  | 190    |
     * | 30 | SRB  | 3    | 300    | 40  | 180    |
     */
    function buildSortRepository(): InMemoryPlayerRepository {
      return new InMemoryPlayerRepository([
        buildPlayer({
          id: 30,
          country: { code: 'SRB' },
          data: { rank: 3, points: 300, age: 40, height: 180 },
        }),
        buildPlayer({
          id: 10,
          country: { code: 'ESP' },
          data: { rank: 1, points: 300, age: 30, height: 180 },
        }),
        buildPlayer({
          id: 20,
          country: { code: 'USA' },
          data: { rank: 2, points: 100, age: 30, height: 190 },
        }),
        buildPlayer({
          id: 40,
          country: { code: 'USA' },
          data: { rank: 1, points: 200, age: 50, height: 170 },
        }),
      ]);
    }

    /** Exécute le cas d'usage sur le jeu de données de tri et retourne les identifiants. */
    async function sortedIds(criteria: PlayerSearchCriteria = {}): Promise<number[]> {
      const players = await new ListPlayersUseCase(buildSortRepository()).execute(criteria);

      return players.map((player) => player.id);
    }

    it('sans paramètre de tri, conserve le rang croissant', async () => {
      expect(await sortedIds()).toEqual([10, 40, 20, 30]);
    });

    it('trie par rang croissant ou décroissant', async () => {
      expect(await sortedIds({ sortBy: 'rank', order: 'asc' })).toEqual([10, 40, 20, 30]);
      expect(await sortedIds({ sortBy: 'rank', order: 'desc' })).toEqual([30, 20, 10, 40]);
    });

    it('trie par points croissant ou décroissant', async () => {
      expect(await sortedIds({ sortBy: 'points', order: 'asc' })).toEqual([20, 40, 10, 30]);
      expect(await sortedIds({ sortBy: 'points', order: 'desc' })).toEqual([10, 30, 40, 20]);
    });

    it('trie par âge croissant ou décroissant', async () => {
      expect(await sortedIds({ sortBy: 'age', order: 'asc' })).toEqual([10, 20, 30, 40]);
      expect(await sortedIds({ sortBy: 'age', order: 'desc' })).toEqual([40, 30, 10, 20]);
    });

    it('trie par taille croissante ou décroissante', async () => {
      expect(await sortedIds({ sortBy: 'height', order: 'asc' })).toEqual([40, 10, 30, 20]);
      expect(await sortedIds({ sortBy: 'height', order: 'desc' })).toEqual([20, 10, 30, 40]);
    });

    it('départage les égalités par rang croissant puis identifiant croissant', async () => {
      // Points 300 pour les identifiants 10 (rang 1) et 30 (rang 3).
      expect(await sortedIds({ sortBy: 'points', order: 'desc' })).toEqual([10, 30, 40, 20]);
      // Rangs 1 pour les identifiants 10 et 40 : départage par identifiant.
      expect(await sortedIds({ sortBy: 'rank', order: 'desc' })).toEqual([30, 20, 10, 40]);
    });

    it('utilise `asc` par défaut lorsque seul `sortBy` est fourni', async () => {
      expect(await sortedIds({ sortBy: 'points' })).toEqual([20, 40, 10, 30]);
      expect(await sortedIds({ sortBy: 'age' })).toEqual([10, 20, 30, 40]);
    });

    it('utilise `rank` par défaut lorsque seul `order` est fourni', async () => {
      expect(await sortedIds({ order: 'asc' })).toEqual([10, 40, 20, 30]);
      expect(await sortedIds({ order: 'desc' })).toEqual([30, 20, 10, 40]);
    });

    it('applique le tri après les filtres existants', async () => {
      expect(await sortedIds({ minRank: 2, sortBy: 'points', order: 'desc' })).toEqual([30, 20]);
      expect(await sortedIds({ country: 'USA', sortBy: 'age' })).toEqual([20, 40]);
      expect(await sortedIds({ country: 'USA', sortBy: 'height', order: 'desc' })).toEqual([
        20, 40,
      ]);
    });

    it('retourne une liste vide lorsqu’aucun joueur ne correspond', async () => {
      expect(await sortedIds({ minRank: 100, sortBy: 'points', order: 'desc' })).toEqual([]);
    });

    it('ne modifie pas l’ordre interne du repository', async () => {
      const repository = buildSortRepository();

      await new ListPlayersUseCase(repository).execute({ sortBy: 'points', order: 'desc' });

      const stored = await repository.findAll();
      expect(stored.map((player) => player.id)).toEqual([30, 10, 20, 40]);
    });
  });
});
