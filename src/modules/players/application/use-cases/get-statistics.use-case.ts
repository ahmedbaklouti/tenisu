import { Inject, Injectable } from '@nestjs/common';
import { PLAYER_REPOSITORY } from '../../domain/repositories/player.repository.js';
import type { PlayerRepository } from '../../domain/repositories/player.repository.js';
import type { CountryWinRatio } from '../services/statistics.calculator.js';
import {
  computeAverageBmi,
  computeMedianHeightCm,
  pickCountryWithHighestWinRatio,
} from '../services/statistics.calculator.js';

/** Statistiques globales calculées sur l'ensemble des joueurs. */
export interface Statistics {
  /** Pays au meilleur ratio de victoires, `null` si aucun joueur n'est enregistré. */
  countryWithHighestWinRatio: CountryWinRatio | null;
  /** IMC moyen en kg/m², arrondi à deux décimales. */
  averageBmi: number;
  /** Médiane des tailles en centimètres. */
  medianHeightCm: number;
}

/** Calcule les statistiques globales des joueurs. */
@Injectable()
export class GetStatisticsUseCase {
  constructor(
    @Inject(PLAYER_REPOSITORY)
    private readonly playerRepository: PlayerRepository,
  ) {}

  async execute(): Promise<Statistics> {
    const players = await this.playerRepository.findAll();

    return {
      countryWithHighestWinRatio: pickCountryWithHighestWinRatio(players) ?? null,
      averageBmi: computeAverageBmi(players),
      medianHeightCm: computeMedianHeightCm(players),
    };
  }
}
