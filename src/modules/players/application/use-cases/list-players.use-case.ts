import { Inject, Injectable } from '@nestjs/common';
import type { Player } from '../../domain/entities/player.entity.js';
import { PLAYER_REPOSITORY } from '../../domain/repositories/player.repository.js';
import type { PlayerRepository } from '../../domain/repositories/player.repository.js';

/**
 * Critères de recherche de la liste des joueurs.
 * Chaque critère est facultatif : un critère absent n'applique aucune restriction.
 * Les bornes (`minRank`/`maxRank`, `minAge`/`maxAge`) sont inclusives.
 */
export interface PlayerSearchCriteria {
  /** Code pays, comparé sans tenir compte de la casse. */
  country?: string | undefined;
  /** Rang minimum accepté (borne incluse). */
  minRank?: number | undefined;
  /** Rang maximum accepté (borne incluse). */
  maxRank?: number | undefined;
  /** Âge minimum accepté (borne incluse). */
  minAge?: number | undefined;
  /** Âge maximum accepté (borne incluse). */
  maxAge?: number | undefined;
}

/**
 * Liste les joueurs, du meilleur au moins bon : rang croissant, puis identifiant
 * croissant pour départager les rangs égaux. Les critères fournis sont combinés
 * avec une logique ET ; sans critère, tous les joueurs sont retournés.
 */
@Injectable()
export class ListPlayersUseCase {
  constructor(
    @Inject(PLAYER_REPOSITORY)
    private readonly playerRepository: PlayerRepository,
  ) {}

  async execute(criteria: PlayerSearchCriteria = {}): Promise<Player[]> {
    const players = await this.playerRepository.findAll();

    // Filtrage et tri s'appliquent à une copie : l'ordre interne du repository reste intact.
    return players.filter((player) => matchesCriteria(player, criteria)).sort(compareByRankThenId);
  }
}

/** Critères combinés avec une logique ET. */
function matchesCriteria(player: Player, criteria: PlayerSearchCriteria): boolean {
  const { country, minRank, maxRank, minAge, maxAge } = criteria;

  if (country !== undefined && player.country.code.toUpperCase() !== country.toUpperCase()) {
    return false;
  }
  if (minRank !== undefined && player.data.rank < minRank) {
    return false;
  }
  if (maxRank !== undefined && player.data.rank > maxRank) {
    return false;
  }
  if (minAge !== undefined && player.data.age < minAge) {
    return false;
  }
  if (maxAge !== undefined && player.data.age > maxAge) {
    return false;
  }

  return true;
}

function compareByRankThenId(first: Player, second: Player): number {
  return first.data.rank - second.data.rank || first.id - second.id;
}
