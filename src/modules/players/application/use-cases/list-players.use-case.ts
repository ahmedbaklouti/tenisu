import { Inject, Injectable } from '@nestjs/common';
import type { Player } from '../../domain/entities/player.entity.js';
import { PLAYER_REPOSITORY } from '../../domain/repositories/player.repository.js';
import type { PlayerRepository } from '../../domain/repositories/player.repository.js';

/**
 * Liste tous les joueurs, du meilleur au moins bon : rang croissant,
 * puis identifiant croissant pour départager les rangs égaux.
 */
@Injectable()
export class ListPlayersUseCase {
  constructor(
    @Inject(PLAYER_REPOSITORY)
    private readonly playerRepository: PlayerRepository,
  ) {}

  async execute(): Promise<Player[]> {
    const players = await this.playerRepository.findAll();

    // Le tri s'applique à une copie : l'ordre interne du repository reste intact.
    return [...players].sort(compareByRankThenId);
  }
}

function compareByRankThenId(first: Player, second: Player): number {
  return first.data.rank - second.data.rank || first.id - second.id;
}
