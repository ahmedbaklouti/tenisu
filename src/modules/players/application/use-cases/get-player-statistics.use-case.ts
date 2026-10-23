import { Inject, Injectable } from '@nestjs/common';
import { PlayerNotFoundError } from '../../domain/errors/player-not-found.error.js';
import { PLAYER_REPOSITORY } from '../../domain/repositories/player.repository.js';
import type { PlayerRepository } from '../../domain/repositories/player.repository.js';
import type { PlayerWinStats } from '../services/statistics.calculator.js';
import { computePlayerWinStats } from '../services/statistics.calculator.js';

/** Statistiques individuelles d'un joueur. */
export interface PlayerStatistics extends PlayerWinStats {
  /** Identifiant du joueur concerné. */
  playerId: number;
}

/** Calcule les statistiques individuelles d'un joueur. */
@Injectable()
export class GetPlayerStatisticsUseCase {
  constructor(
    @Inject(PLAYER_REPOSITORY)
    private readonly playerRepository: PlayerRepository,
  ) {}

  async execute(id: number): Promise<PlayerStatistics> {
    const player = await this.playerRepository.findById(id);

    if (!player) {
      throw new PlayerNotFoundError(id);
    }

    return { playerId: player.id, ...computePlayerWinStats(player) };
  }
}
