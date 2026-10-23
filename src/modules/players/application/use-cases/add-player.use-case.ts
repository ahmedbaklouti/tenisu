import { Inject, Injectable } from '@nestjs/common';
import type { Player, PlayerDraft } from '../../domain/entities/player.entity.js';
import { PlayerIdAlreadyExistsError } from '../../domain/errors/player-id-already-exists.error.js';
import { PLAYER_REPOSITORY } from '../../domain/repositories/player.repository.js';
import type { PlayerRepository } from '../../domain/repositories/player.repository.js';

/**
 * Ajoute un joueur.
 *
 * Si l'identifiant est fourni, il doit être unique. S'il est omis, le prochain
 * entier supérieur au plus grand identifiant existant est attribué.
 */
@Injectable()
export class AddPlayerUseCase {
  constructor(
    @Inject(PLAYER_REPOSITORY)
    private readonly playerRepository: PlayerRepository,
  ) {}

  async execute(draft: PlayerDraft): Promise<Player> {
    const id = draft.id ?? (await this.nextAvailableId());

    if (draft.id !== undefined) {
      const existingPlayer = await this.playerRepository.findById(draft.id);

      if (existingPlayer) {
        throw new PlayerIdAlreadyExistsError(draft.id);
      }
    }

    return this.playerRepository.save({ ...draft, id });
  }

  private async nextAvailableId(): Promise<number> {
    const players = await this.playerRepository.findAll();

    return players.reduce((highestId, player) => Math.max(highestId, player.id), 0) + 1;
  }
}
