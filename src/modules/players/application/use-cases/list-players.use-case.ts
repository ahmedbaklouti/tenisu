import { Inject, Injectable } from '@nestjs/common';
import type { Player } from '../../domain/entities/player.entity.js';
import { PLAYER_REPOSITORY } from '../../domain/repositories/player.repository.js';
import type { PlayerRepository } from '../../domain/repositories/player.repository.js';

/** Champs sur lesquels le tri de la liste est autorisé. */
export const PLAYER_SORT_FIELDS = ['rank', 'points', 'age', 'height'] as const;

/** Champ de tri autorisé. */
export type PlayerSortField = (typeof PLAYER_SORT_FIELDS)[number];

/** Sens du tri. */
export type PlayerSortOrder = 'asc' | 'desc';

const DEFAULT_SORT_FIELD: PlayerSortField = 'rank';
const DEFAULT_SORT_ORDER: PlayerSortOrder = 'asc';

/** Valeur numérique comparée pour chaque champ de tri. */
const SORT_VALUE_SELECTORS: Record<PlayerSortField, (player: Player) => number> = {
  rank: (player) => player.data.rank,
  points: (player) => player.data.points,
  age: (player) => player.data.age,
  height: (player) => player.data.height,
};

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
  /** Champ de tri ; `rank` par défaut. */
  sortBy?: PlayerSortField | undefined;
  /** Sens du tri ; `asc` par défaut. */
  order?: PlayerSortOrder | undefined;
}

/**
 * Liste les joueurs correspondant aux critères, filtrés puis triés.
 * Par défaut, du meilleur au moins bon : rang croissant. Le tri est déterminé
 * par `sortBy`/`order` ; les critères de filtrage fournis sont combinés avec une
 * logique ET et, sans critère, tous les joueurs sont retournés.
 */
@Injectable()
export class ListPlayersUseCase {
  constructor(
    @Inject(PLAYER_REPOSITORY)
    private readonly playerRepository: PlayerRepository,
  ) {}

  async execute(criteria: PlayerSearchCriteria = {}): Promise<Player[]> {
    const players = await this.playerRepository.findAll();

    // Filtrage puis tri s'appliquent à une copie : l'ordre interne du repository reste intact.
    return players
      .filter((player) => matchesCriteria(player, criteria))
      .sort(buildComparator(criteria));
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

/**
 * Construit le comparateur : champ demandé (`rank` par défaut) dans le sens
 * demandé (`asc` par défaut). En cas d'égalité, le rang croissant puis
 * l'identifiant croissant garantissent un ordre déterministe ; lorsque le champ
 * trié est déjà le rang, l'identifiant suffit.
 */
function buildComparator(
  criteria: PlayerSearchCriteria,
): (first: Player, second: Player) => number {
  const sortBy = criteria.sortBy ?? DEFAULT_SORT_FIELD;
  const direction = (criteria.order ?? DEFAULT_SORT_ORDER) === 'desc' ? -1 : 1;
  const selectValue = SORT_VALUE_SELECTORS[sortBy];

  return (first, second) => {
    const bySortField = (selectValue(first) - selectValue(second)) * direction;

    if (bySortField !== 0) {
      return bySortField;
    }
    if (sortBy === 'rank') {
      return first.id - second.id;
    }

    return compareByRankThenId(first, second);
  };
}
