import { ApiProperty } from '@nestjs/swagger';

/**
 * Statistiques individuelles d'un joueur.
 * Le ratio de victoires suit la même convention que les statistiques globales :
 * une valeur entre 0 et 1, jamais un pourcentage.
 */
export class PlayerStatisticsResponseDto {
  @ApiProperty({ description: 'Identifiant du joueur.', example: 52 })
  playerId!: number;

  @ApiProperty({ description: 'Nombre de victoires sur les derniers matchs.', example: 5 })
  wins!: number;

  @ApiProperty({ description: 'Nombre de défaites sur les derniers matchs.', example: 0 })
  losses!: number;

  @ApiProperty({ description: 'Nombre de matchs pris en compte.', example: 5 })
  matchesPlayed!: number;

  @ApiProperty({
    description: 'Ratio de victoires entre 0 et 1 (jamais en pourcentage).',
    example: 1,
  })
  winRatio!: number;
}
