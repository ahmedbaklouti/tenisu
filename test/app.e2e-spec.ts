import { HttpStatus } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { setupApplication } from '../src/app.setup.js';

/**
 * Charge utile valide réutilisée par les scénarios de création.
 * Construite à chaque appel afin qu'aucun test ne partage d'objet mutable.
 */
function buildValidPlayerPayload(): Record<string, unknown> {
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
      const data = payload.data as Record<string, unknown>;

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
