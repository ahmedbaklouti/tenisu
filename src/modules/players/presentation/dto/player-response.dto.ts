import { ApiProperty } from '@nestjs/swagger';
import type { PlayerSex } from '../../domain/entities/player.entity.js';

/** Pays du joueur tel qu'exposé par l'API. */
export class PlayerCountryResponseDto {
  @ApiProperty({ example: 'https://tenisu.latelier.co/resources/Serbie.png' })
  picture!: string;

  @ApiProperty({ example: 'SRB' })
  code!: string;
}

/** Données sportives et physiques telles qu'exposées par l'API. */
export class PlayerDataResponseDto {
  @ApiProperty({ description: 'Classement (1 = meilleur).', example: 2 })
  rank!: number;

  @ApiProperty({ example: 2542 })
  points!: number;

  @ApiProperty({ description: 'Poids en grammes.', example: 80000 })
  weight!: number;

  @ApiProperty({ description: 'Taille en centimètres.', example: 188 })
  height!: number;

  @ApiProperty({ description: 'Âge en années.', example: 31 })
  age!: number;

  @ApiProperty({
    description: 'Cinq derniers matchs : 1 pour une victoire, 0 pour une défaite.',
    example: [1, 1, 1, 1, 1],
    type: [Number],
  })
  last!: number[];
}

/** Joueur tel qu'exposé par l'API. */
export class PlayerResponseDto {
  @ApiProperty({ example: 52 })
  id!: number;

  @ApiProperty({ example: 'Novak' })
  firstname!: string;

  @ApiProperty({ example: 'Djokovic' })
  lastname!: string;

  @ApiProperty({ example: 'N.DJO' })
  shortname!: string;

  @ApiProperty({ enum: ['M', 'F'], example: 'M' })
  sex!: PlayerSex;

  @ApiProperty({ type: PlayerCountryResponseDto })
  country!: PlayerCountryResponseDto;

  @ApiProperty({ example: 'https://tenisu.latelier.co/resources/Djokovic.png' })
  picture!: string;

  @ApiProperty({ type: PlayerDataResponseDto })
  data!: PlayerDataResponseDto;
}
