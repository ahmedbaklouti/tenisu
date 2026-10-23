import type { Player } from '../entities/player.entity.js';

/**
 * Token d'injection du repository : les cas d'usage dépendent de l'abstraction,
 * jamais de l'implémentation concrète.
 */
export const PLAYER_REPOSITORY = Symbol('PLAYER_REPOSITORY');

/**
 * Contrat de persistance des joueurs.
 *
 * Volontairement asynchrone afin qu'une implémentation PostgreSQL puisse
 * remplacer l'implémentation en mémoire sans modifier les cas d'usage.
 */
export interface PlayerRepository {
  /** Tous les joueurs, dans l'ordre de stockage (l'ordre du repository ne doit pas être modifié). */
  findAll(): Promise<Player[]>;
  /** Le joueur correspondant à l'identifiant, ou `undefined` s'il n'existe pas. */
  findById(id: number): Promise<Player | undefined>;
  /** Ajoute un joueur et retourne la version persistée. */
  save(player: Player): Promise<Player>;
}
