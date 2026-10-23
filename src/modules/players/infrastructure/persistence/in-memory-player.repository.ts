import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Injectable } from '@nestjs/common';
import type { Player } from '../../domain/entities/player.entity.js';
import type { PlayerRepository } from '../../domain/repositories/player.repository.js';

interface HeadToHeadDataset {
  players: Player[];
}

/**
 * Chemin du dataset embarqué. Le fichier JSON est copié tel quel dans `dist/`
 * par les assets NestJS (voir `nest-cli.json`), il est donc résolu relativement
 * au module compilé : le comportement est identique en développement et en production.
 */
const DATASET_PATH = join(dirname(fileURLToPath(import.meta.url)), 'data', 'headtohead.json');

/**
 * Charge le dataset initial depuis l'asset JSON embarqué dans le build.
 *
 * Le jeu de données est cloné en profondeur : ni le contenu lu depuis le fichier
 * ni les objets du dataset source ne sont jamais exposés.
 */
export function loadInitialPlayers(): Player[] {
  const dataset = JSON.parse(readFileSync(DATASET_PATH, 'utf8')) as HeadToHeadDataset;

  return structuredClone(dataset.players);
}

/**
 * Repository en mémoire.
 *
 * Les joueurs créés pendant l'exécution du processus sont conservés jusqu'à
 * l'arrêt de celui-ci : un redémarrage (ou un redéploiement Render) repart du
 * dataset initial.
 */
@Injectable()
export class InMemoryPlayerRepository implements PlayerRepository {
  private readonly players: Player[];

  constructor(initialPlayers: Player[] = loadInitialPlayers()) {
    this.players = structuredClone(initialPlayers);
  }

  findAll(): Promise<Player[]> {
    return Promise.resolve(structuredClone(this.players));
  }

  findById(id: number): Promise<Player | undefined> {
    const player = this.players.find((candidate) => candidate.id === id);

    return Promise.resolve(player ? structuredClone(player) : undefined);
  }

  save(player: Player): Promise<Player> {
    const storedPlayer = structuredClone(player);

    this.players.push(storedPlayer);

    return Promise.resolve(structuredClone(storedPlayer));
  }
}
