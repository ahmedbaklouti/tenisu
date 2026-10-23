import { ApiProperty } from '@nestjs/swagger';

/** Pays au meilleur ratio de victoires. */
export class CountryWinRatioResponseDto {
  @ApiProperty({ description: 'Code pays sur trois lettres.', example: 'SRB' })
  code!: string;

  @ApiProperty({ description: 'Total des victoires des joueurs du pays.', example: 5 })
  wins!: number;

  @ApiProperty({ description: 'Total des matchs des joueurs du pays.', example: 5 })
  matches!: number;

  @ApiProperty({ description: 'Ratio de victoires entre 0 et 1.', example: 1 })
  ratio!: number;
}

/** Statistiques globales sur les joueurs. */
export class StatisticsResponseDto {
  @ApiProperty({
    type: CountryWinRatioResponseDto,
    nullable: true,
    description: 'Pays au meilleur ratio de victoires (égalité départagée par ordre alphabétique).',
  })
  countryWithHighestWinRatio!: CountryWinRatioResponseDto | null;

  @ApiProperty({
    description: 'IMC moyen en kg/m², arrondi à deux décimales.',
    example: 23.36,
  })
  averageBmi!: number;

  @ApiProperty({
    description: 'Médiane de la taille des joueurs en centimètres.',
    example: 185,
  })
  medianHeightCm!: number;
}
