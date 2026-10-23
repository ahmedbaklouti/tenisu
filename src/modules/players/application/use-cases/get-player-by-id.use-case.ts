import { Inject, Injectable } from '@nestjs/common';
import type { Player } from '../../domain/entities/player.entity.js';
import { PlayerNotFoundError } from '../../domain/errors/player-not-found.error.js';
import { PLAYER_REPOSITORY } from '../../domain/repositories/player.repository.js';
import type { PlayerRepository } from '../../domain/repositories/player.repository.js';

/** Récupère un joueur par son identifiant. */
@Injectable()
export class GetPlayerByIdUseCase {
  constructor(
    @Inject(PLAYER_REPOSITORY)
    private readonly playerRepository: PlayerRepository,
  ) {}

  async execute(id: number): Promise<Player> {
    const player = await this.playerRepository.findById(id);

    if (!player) {
      throw new PlayerNotFoundError(id);
    }

    return player;
  }
}
