import { HttpStatus } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { setupApplication } from '../src/app.setup.js';

/** Charge utile de création de joueur, telle qu'envoyée à `POST /players`. */
interface PlayerPayload {
  firstname: string;
  lastname: string;
  shortname: string;
  sex: string;
  country: { picture: string; code: string };
  picture: string;
  data: {
    rank: number;
    points: number;
    weight: number;
    height: number;
    age: number;
    last: number[];
  };
}

/**
 * Charge utile valide réutilisée par les scénarios de création.
 * Construite à chaque appel afin qu'aucun test ne partage d'objet mutable.
 */
function buildValidPlayerPayload(): PlayerPayload {
  return {
    firstname: 'Roger',
    lastname: 'Federer',
    shortname: 'R.FED',
    sex: 'M',
    country: { picture: 'https://tenisu.latelier.co/resources/Suisse.png', code: 'SUI' },
    picture: 'https://tenisu.latelier.co/resources/Federer.png',
    data: { rank: 3, points: 2000, weight: 85000, height: 185, age: 37, last: [1, 0, 1] },
  };
}

/**
 * Normalise le champ `message` d'une réponse d'erreur NestJS (chaîne unique ou
 * tableau de messages) en une chaîne unique, afin de pouvoir vérifier les
 * libellés exacts sans dépendre de la forme retournée.
 */
function normalizeMessage(body: { message?: unknown }): string {
  const { message } = body;

  if (Array.isArray(message)) {
    return message.join(' | ');
  }

  return typeof message === 'string' ? message : '';
}

/**
 * Crée une application NestJS complète (mêmes pipes globaux et même
 * documentation qu'en production) adossée à un repository en mémoire neuf.
 */
async function createApplication(): Promise<INestApplication> {
  const testingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = testingModule.createNestApplication();

  setupApplication(app);
  await app.init();

  return app;
}

describe('Tenisu API (e2e)', () => {
  describe('endpoints de consultation', () => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await createApplication();
    });

    afterAll(async () => {
      await app.close();
    });

    it('GET /health renvoie 200 et { status: "ok" }', async () => {
      const response = await request(app.getHttpServer()).get('/health').expect(HttpStatus.OK);

      expect(response.body).toStrictEqual({ status: 'ok' });
    });

    it('GET /players renvoie les cinq joueurs du dataset triés par rang croissant', async () => {
      const response = await request(app.getHttpServer()).get('/players').expect(HttpStatus.OK);

      expect(response.body).toHaveLength(5);
      // Rangs 1, 2, 10, 21, 52 → identifiants 17, 52, 102, 65, 95.
      expect(response.body.map((player: { id: number }) => player.id)).toStrictEqual([
        17, 52, 102, 65, 95,
      ]);

      const ranks = response.body.map((player: { data: { rank: number } }) => player.data.rank);
      expect(ranks).toStrictEqual([...ranks].sort((a: number, b: number) => a - b));
    });

    it('GET /players/:id renvoie le joueur correspondant', async () => {
      const response = await request(app.getHttpServer()).get('/players/52').expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        id: 52,
        firstname: 'Novak',
        lastname: 'Djokovic',
        country: { code: 'SRB' },
      });
    });

    it('GET /players/:id renvoie 404 pour un identifiant valide inexistant', async () => {
      const response = await request(app.getHttpServer())
        .get('/players/9999')
        .expect(HttpStatus.NOT_FOUND);

      expect(response.body).toMatchObject({
        statusCode: HttpStatus.NOT_FOUND,
        error: 'Not Found',
      });
      expect(response.body.message).toContain('9999');
    });

    it.each([
      ['abc', "L'identifiant doit être un entier."],
      ['0', "L'identifiant doit être supérieur ou égal à 1."],
      ['-1', "L'identifiant doit être supérieur ou égal à 1."],
      ['1.5', "L'identifiant doit être un entier."],
    ])(
      'GET /players/%s renvoie 400 avec le libellé attendu',
      async (invalidId, expectedMessage) => {
        const response = await request(app.getHttpServer())
          .get(`/players/${invalidId}`)
          .expect(HttpStatus.BAD_REQUEST);

        expect(response.body).toMatchObject({ statusCode: HttpStatus.BAD_REQUEST });
        expect(normalizeMessage(response.body)).toContain(expectedMessage);
      },
    );

    it('GET /players/:id/statistics renvoie le bilan du joueur sur ses derniers matchs', async () => {
      const response = await request(app.getHttpServer())
        .get('/players/95/statistics')
        .expect(HttpStatus.OK);

      // `last: [0, 1, 0, 0, 1]` → 2 victoires sur 5 matchs, ratio entre 0 et 1.
      expect(response.body).toStrictEqual({
        playerId: 95,
        wins: 2,
        losses: 3,
        matchesPlayed: 5,
        winRatio: 0.4,
      });
    });

    it('GET /players/:id/statistics retourne un ratio de 1 pour un joueur invaincu', async () => {
      const response = await request(app.getHttpServer())
        .get('/players/52/statistics')
        .expect(HttpStatus.OK);

      expect(response.body).toStrictEqual({
        playerId: 52,
        wins: 5,
        losses: 0,
        matchesPlayed: 5,
        winRatio: 1,
      });
    });

    it('GET /players/:id/statistics renvoie 404 pour un identifiant valide inexistant', async () => {
      const response = await request(app.getHttpServer())
        .get('/players/9999/statistics')
        .expect(HttpStatus.NOT_FOUND);

      expect(response.body).toMatchObject({
        statusCode: HttpStatus.NOT_FOUND,
        error: 'Not Found',
      });
      expect(response.body.message).toContain('9999');
    });

    it.each(['abc', '0', '-1', '1.5'])(
      'GET /players/%s/statistics renvoie 400 pour un identifiant invalide',
      async (invalidId) => {
        await request(app.getHttpServer())
          .get(`/players/${invalidId}/statistics`)
          .expect(HttpStatus.BAD_REQUEST);
      },
    );

    it('GET /statistics renvoie les valeurs de référence du dataset', async () => {
      const response = await request(app.getHttpServer()).get('/statistics').expect(HttpStatus.OK);

      expect(response.body).toStrictEqual({
        countryWithHighestWinRatio: { code: 'SRB', wins: 5, matches: 5, ratio: 1 },
        averageBmi: 23.36,
        medianHeightCm: 185,
      });
    });

    it('expose la documentation OpenAPI sur GET /docs-json', async () => {
      const response = await request(app.getHttpServer()).get('/docs-json').expect(HttpStatus.OK);

      expect(Object.keys(response.body.paths)).toStrictEqual(
        expect.arrayContaining([
          '/players',
          '/players/{id}',
          '/players/{id}/statistics',
          '/statistics',
          '/health',
        ]),
      );

      // Les cinq filtres de recherche et les deux paramètres de tri sont documentés.
      const searchParameters = response.body.paths['/players'].get.parameters as {
        name: string;
        required: boolean;
      }[];

      expect(searchParameters.map((parameter) => parameter.name)).toStrictEqual(
        expect.arrayContaining([
          'country',
          'minRank',
          'maxRank',
          'minAge',
          'maxAge',
          'sortBy',
          'order',
        ]),
      );
      expect(searchParameters.every((parameter) => parameter.required === false)).toBe(true);
    });
  });

  describe('recherche et filtres sur les joueurs', () => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await createApplication();
    });

    afterAll(async () => {
      await app.close();
    });

    /**
     * Dataset initial, trié par rang croissant :
     * `17` ESP rang 1 âge 33, `52` SRB rang 2 âge 31, `102` USA rang 10 âge 37,
     * `65` SUI rang 21 âge 33, `95` USA rang 52 âge 38.
     */
    async function listIds(query: Record<string, unknown> = {}): Promise<number[]> {
      const response = await request(app.getHttpServer())
        .get('/players')
        .query(query)
        .expect(HttpStatus.OK);

      return (response.body as { id: number }[]).map((player) => player.id);
    }

    /** Vérifie un `400` et retourne le message d'erreur normalisé. */
    async function expectBadRequest(query: Record<string, unknown>): Promise<string> {
      const response = await request(app.getHttpServer())
        .get('/players')
        .query(query)
        .expect(HttpStatus.BAD_REQUEST);

      return normalizeMessage(response.body);
    }

    it('sans paramètre, retourne tous les joueurs triés par rang croissant', async () => {
      expect(await listIds()).toStrictEqual([17, 52, 102, 65, 95]);
    });

    it('filtre par pays', async () => {
      expect(await listIds({ country: 'USA' })).toStrictEqual([102, 95]);
    });

    it('filtre par pays sans tenir compte de la casse', async () => {
      expect(await listIds({ country: 'srb' })).toStrictEqual([52]);
      expect(await listIds({ country: 'uSa' })).toStrictEqual([102, 95]);
    });

    it('filtre par rang minimum, borne incluse', async () => {
      expect(await listIds({ minRank: 10 })).toStrictEqual([102, 65, 95]);
    });

    it('filtre par rang maximum, borne incluse', async () => {
      expect(await listIds({ maxRank: 10 })).toStrictEqual([17, 52, 102]);
    });

    it('filtre par intervalle de rang', async () => {
      expect(await listIds({ minRank: 1, maxRank: 10 })).toStrictEqual([17, 52, 102]);
      expect(await listIds({ minRank: 10, maxRank: 52 })).toStrictEqual([102, 65, 95]);
    });

    it('filtre par âge minimum, borne incluse', async () => {
      expect(await listIds({ minAge: 35 })).toStrictEqual([102, 95]);
    });

    it('filtre par âge maximum, borne incluse', async () => {
      expect(await listIds({ maxAge: 33 })).toStrictEqual([17, 52, 65]);
    });

    it('filtre par intervalle d’âge', async () => {
      expect(await listIds({ minAge: 33, maxAge: 37 })).toStrictEqual([17, 102, 65]);
    });

    it('combine le pays, le rang et l’âge avec une logique ET', async () => {
      expect(await listIds({ country: 'SRB', minRank: 1, maxRank: 10 })).toStrictEqual([52]);
      expect(await listIds({ country: 'USA', minAge: 35 })).toStrictEqual([102, 95]);
      expect(await listIds({ country: 'USA', minRank: 20 })).toStrictEqual([95]);
      expect(await listIds({ country: 'USA', minRank: 1, maxRank: 10, minAge: 35 })).toStrictEqual([
        102,
      ]);
    });

    it('conserve le tri par rang croissant après filtrage', async () => {
      const response = await request(app.getHttpServer())
        .get('/players')
        .query({ minAge: 30 })
        .expect(HttpStatus.OK);

      const ranks = response.body.map((player: { data: { rank: number } }) => player.data.rank);

      expect(ranks).toStrictEqual([1, 2, 10, 21, 52]);
    });

    it('retourne 200 avec un tableau vide lorsqu’aucun joueur ne correspond', async () => {
      const response = await request(app.getHttpServer())
        .get('/players')
        .query({ country: 'ZZZ' })
        .expect(HttpStatus.OK);

      expect(response.body).toStrictEqual([]);
      expect(await listIds({ country: 'ESP', minAge: 40 })).toStrictEqual([]);
      expect(await listIds({ minRank: 100 })).toStrictEqual([]);
    });

    it.each(['abc', '1.5', '-1', '0', ''])('rejette minRank=%s avec 400', async (invalidRank) => {
      await expectBadRequest({ minRank: invalidRank });
    });

    it.each(['abc', '30.5', '-5', ''])('rejette maxAge=%s avec 400', async (invalidAge) => {
      await expectBadRequest({ maxAge: invalidAge });
    });

    it.each(['SR', 'SUISSE', 'S1A', ''])('rejette country=%s avec 400', async (invalidCountry) => {
      await expectBadRequest({ country: invalidCountry });
    });

    it('rejette un paramètre inconnu avec 400', async () => {
      await expectBadRequest({ unknownFilter: 'valeur' });
    });

    it('rejette un intervalle de rang inversé avec 400', async () => {
      const message = await expectBadRequest({ minRank: 10, maxRank: 1 });

      expect(message).toContain('minRank doit être inférieur ou égal à maxRank.');
    });

    it('rejette un intervalle d’âge inversé avec 400', async () => {
      const message = await expectBadRequest({ minAge: 40, maxAge: 30 });

      expect(message).toContain('minAge doit être inférieur ou égal à maxAge.');
    });

    it('accepte un intervalle réduit à une seule valeur', async () => {
      expect(await listIds({ minRank: 21, maxRank: 21 })).toStrictEqual([65]);
    });

    it('n’impose aucune borne maximale arbitraire', async () => {
      expect(await listIds({ minRank: 100000 })).toStrictEqual([]);
      expect(await listIds({ maxRank: 100000, maxAge: 100 })).toStrictEqual([17, 52, 102, 65, 95]);
    });

    it('reste compatible avec les autres endpoints', async () => {
      await request(app.getHttpServer()).get('/players/52').expect(HttpStatus.OK);
      await request(app.getHttpServer()).get('/players/52/statistics').expect(HttpStatus.OK);
      await request(app.getHttpServer()).get('/statistics').expect(HttpStatus.OK);
      await request(app.getHttpServer()).get('/health').expect(HttpStatus.OK);
    });
  });

  describe('tri configurable sur les joueurs', () => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await createApplication();
    });

    afterAll(async () => {
      await app.close();
    });

    /**
     * Dataset initial, avec les valeurs triables de chaque joueur :
     *
     * | id  | pays | rang | points | taille | âge |
     * | --- | ---- | ---- | ------ | ------ | --- |
     * | 17  | ESP  | 1    | 1982   | 185    | 33  |
     * | 52  | SRB  | 2    | 2542   | 188    | 31  |
     * | 102 | USA  | 10   | 3521   | 175    | 37  |
     * | 65  | SUI  | 21   | 1784   | 183    | 33  |
     * | 95  | USA  | 52   | 1105   | 185    | 38  |
     */
    async function listIds(query: Record<string, unknown> = {}): Promise<number[]> {
      const response = await request(app.getHttpServer())
        .get('/players')
        .query(query)
        .expect(HttpStatus.OK);

      return (response.body as { id: number }[]).map((player) => player.id);
    }

    /** Vérifie un `400` et retourne le message d'erreur normalisé. */
    async function expectBadRequest(query: Record<string, unknown>): Promise<string> {
      const response = await request(app.getHttpServer())
        .get('/players')
        .query(query)
        .expect(HttpStatus.BAD_REQUEST);

      return normalizeMessage(response.body);
    }

    it('sans paramètre de tri, conserve le rang croissant par défaut', async () => {
      expect(await listIds()).toStrictEqual([17, 52, 102, 65, 95]);
    });

    it.each([
      ['rank', 'asc', [17, 52, 102, 65, 95]],
      ['rank', 'desc', [95, 65, 102, 52, 17]],
      ['points', 'asc', [95, 65, 17, 52, 102]],
      ['points', 'desc', [102, 52, 17, 65, 95]],
      ['age', 'asc', [52, 17, 65, 102, 95]],
      ['age', 'desc', [95, 102, 17, 65, 52]],
      ['height', 'asc', [102, 65, 17, 95, 52]],
      ['height', 'desc', [52, 17, 95, 65, 102]],
    ])('trie par %s en ordre %s', async (sortBy, order, expected) => {
      expect(await listIds({ sortBy, order })).toStrictEqual(expected);
    });

    it('départage une égalité par rang croissant puis identifiant croissant', async () => {
      // `17` et `65` partagent l'âge 33 : le rang (1 < 21) les départage.
      expect(await listIds({ sortBy: 'age', order: 'asc' })).toStrictEqual([52, 17, 65, 102, 95]);
      // `17` et `95` partagent la taille 185 : le rang (1 < 52) les départage.
      expect(await listIds({ sortBy: 'height', order: 'asc' })).toStrictEqual([
        102, 65, 17, 95, 52,
      ]);
    });

    it('utilise l’ordre croissant lorsque `order` est absent', async () => {
      expect(await listIds({ sortBy: 'points' })).toStrictEqual([95, 65, 17, 52, 102]);
      expect(await listIds({ sortBy: 'height' })).toStrictEqual([102, 65, 17, 95, 52]);
    });

    it('utilise le rang lorsque `sortBy` est absent', async () => {
      expect(await listIds({ order: 'desc' })).toStrictEqual([95, 65, 102, 52, 17]);
    });

    it('applique le tri aux résultats filtrés', async () => {
      expect(await listIds({ country: 'USA', sortBy: 'points', order: 'desc' })).toStrictEqual([
        102, 95,
      ]);
      expect(await listIds({ minRank: 10, sortBy: 'points' })).toStrictEqual([95, 65, 102]);
      expect(
        await listIds({ country: 'SRB', minRank: 1, maxRank: 10, sortBy: 'points', order: 'desc' }),
      ).toStrictEqual([52]);
    });

    it('retourne un tableau vide même lorsqu’un tri est demandé', async () => {
      expect(await listIds({ country: 'ZZZ', sortBy: 'points', order: 'desc' })).toStrictEqual([]);
    });

    it('ne fausse pas l’ordre par défaut après un tri différent', async () => {
      expect(await listIds({ sortBy: 'points', order: 'desc' })).toStrictEqual([
        102, 52, 17, 65, 95,
      ]);
      expect(await listIds()).toStrictEqual([17, 52, 102, 65, 95]);
    });

    it.each(['foo', 'RANK', 'score', ''])('rejette sortBy=%s avec 400', async (invalidSortBy) => {
      const message = await expectBadRequest({ sortBy: invalidSortBy });

      expect(message).toContain('sortBy doit valoir rank, points, age, height.');
    });

    it.each(['up', 'DESC', 'ascending', ''])('rejette order=%s avec 400', async (invalidOrder) => {
      const message = await expectBadRequest({ order: invalidOrder });

      expect(message).toContain('order doit valoir asc ou desc.');
    });

    it('reste compatible avec les autres endpoints', async () => {
      await request(app.getHttpServer()).get('/players/52').expect(HttpStatus.OK);
      await request(app.getHttpServer()).get('/players/52/statistics').expect(HttpStatus.OK);
      await request(app.getHttpServer()).get('/statistics').expect(HttpStatus.OK);
      await request(app.getHttpServer()).get('/health').expect(HttpStatus.OK);
    });
  });

  describe('création de joueur', () => {
    let app: INestApplication;

    beforeEach(async () => {
      app = await createApplication();
    });

    afterEach(async () => {
      await app.close();
    });

    it('POST /players crée un joueur et positionne l’en-tête Location', async () => {
      const response = await request(app.getHttpServer())
        .post('/players')
        .send({ ...buildValidPlayerPayload(), id: 200 })
        .expect(HttpStatus.CREATED);

      expect(response.headers.location).toBe('/players/200');
      expect(response.body).toMatchObject({ id: 200, firstname: 'Roger', lastname: 'Federer' });

      await request(app.getHttpServer()).get('/players/200').expect(HttpStatus.OK);
    });

    it('POST /players attribue 103 lorsque l’identifiant est omis', async () => {
      const response = await request(app.getHttpServer())
        .post('/players')
        .send(buildValidPlayerPayload())
        .expect(HttpStatus.CREATED);

      expect(response.body.id).toBe(103);
      expect(response.headers.location).toBe('/players/103');
    });

    it('POST /players renvoie 409 lorsque l’identifiant est déjà utilisé', async () => {
      const response = await request(app.getHttpServer())
        .post('/players')
        .send({ ...buildValidPlayerPayload(), id: 52 })
        .expect(HttpStatus.CONFLICT);

      expect(response.body).toMatchObject({
        statusCode: HttpStatus.CONFLICT,
        error: 'Conflict',
      });
    });

    it('POST /players départage deux rangs identiques par identifiant croissant', async () => {
      await request(app.getHttpServer())
        .post('/players')
        .send({
          ...buildValidPlayerPayload(),
          id: 201,
          data: { ...buildValidPlayerPayload().data, rank: 7 },
        })
        .expect(HttpStatus.CREATED);
      await request(app.getHttpServer())
        .post('/players')
        .send({
          ...buildValidPlayerPayload(),
          id: 200,
          data: { ...buildValidPlayerPayload().data, rank: 7 },
        })
        .expect(HttpStatus.CREATED);

      const response = await request(app.getHttpServer()).get('/players').expect(HttpStatus.OK);
      const rankSevenIds = response.body
        .filter((player: { data: { rank: number } }) => player.data.rank === 7)
        .map((player: { id: number }) => player.id);

      expect(rankSevenIds).toStrictEqual([200, 201]);
    });

    it('POST /players renvoie 400 pour une charge utile invalide', async () => {
      const response = await request(app.getHttpServer())
        .post('/players')
        .send({ ...buildValidPlayerPayload(), sex: 'X', firstname: '' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body).toMatchObject({ statusCode: HttpStatus.BAD_REQUEST });

      const message = normalizeMessage(response.body);
      expect(message).toContain('sex doit valoir M ou F.');
      expect(message).toContain('firstname should not be empty');
    });

    it('POST /players renvoie 400 lorsqu’un champ inconnu est fourni', async () => {
      const response = await request(app.getHttpServer())
        .post('/players')
        .send({ ...buildValidPlayerPayload(), unknownField: 'interdit' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body).toMatchObject({ statusCode: HttpStatus.BAD_REQUEST });
      expect(normalizeMessage(response.body)).toContain('property unknownField should not exist');
    });

    it('POST /players renvoie 400 lorsque data.last contient une valeur interdite', async () => {
      const payload = buildValidPlayerPayload();
      const { data } = payload;

      const response = await request(app.getHttpServer())
        .post('/players')
        .send({ ...payload, data: { ...data, last: [1, 2, 0] } })
        .expect(HttpStatus.BAD_REQUEST);

      expect(normalizeMessage(response.body)).toContain(
        'last ne doit contenir que des 0 et des 1.',
      );
    });

    it('POST /players renvoie 400 pour un code pays invalide', async () => {
      const response = await request(app.getHttpServer())
        .post('/players')
        .send({
          ...buildValidPlayerPayload(),
          country: { picture: 'https://tenisu.latelier.co/resources/Suisse.png', code: 'sui' },
        })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body).toMatchObject({ statusCode: HttpStatus.BAD_REQUEST });
      expect(normalizeMessage(response.body)).toContain(
        'code doit contenir trois lettres majuscules.',
      );
    });
  });
});
