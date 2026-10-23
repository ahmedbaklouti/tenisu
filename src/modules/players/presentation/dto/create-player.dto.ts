import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUrl,
  Matches,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import type { PlayerSex } from '../../domain/entities/player.entity.js';

/** Pays du joueur. */
export class PlayerCountryDto {
  @ApiProperty({
    description: 'URL du drapeau du pays.',
    example: 'https://tenisu.latelier.co/resources/Serbie.png',
  })
  @IsUrl()
  picture!: string;

  @ApiProperty({ description: 'Code pays sur trois lettres majuscules.', example: 'SRB' })
  @Matches(/^[A-Z]{3}$/, { message: 'country.code doit contenir trois lettres majuscules.' })
  code!: string;
}

/** Données sportives et physiques du joueur. */
export class PlayerDataDto {
  @ApiProperty({ description: 'Classement (1 = meilleur).', example: 2 })
  @IsInt()
  @Min(1)
  rank!: number;

  @ApiProperty({ description: 'Points au classement.', example: 2542 })
  @IsInt()
  @Min(1)
  points!: number;

  @ApiProperty({ description: 'Poids en grammes.', example: 80000 })
  @IsInt()
  @Min(1)
  weight!: number;

  @ApiProperty({ description: 'Taille en centimètres.', example: 188 })
  @IsInt()
  @Min(1)
  height!: number;

  @ApiProperty({ description: 'Âge en années.', example: 31 })
  @IsInt()
  @Min(1)
  age!: number;

  @ApiProperty({
    description: 'Cinq derniers matchs : 1 pour une victoire, 0 pour une défaite.',
    example: [1, 1, 1, 1, 1],
    type: [Number],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsIn([0, 1], { each: true, message: 'data.last ne doit contenir que des 0 et des 1.' })
  last!: number[];
}

/** Corps de la requête de création d'un joueur. */
export class CreatePlayerDto {
  @ApiPropertyOptional({
    description:
      "Identifiant du joueur. Facultatif : s'il est omis, le prochain entier supérieur au plus grand identifiant existant est attribué.",
    example: 103,
  })
  @ValidateIf((_dto: CreatePlayerDto, value: unknown) => value !== undefined)
  @IsInt()
  @Min(1)
  id?: number;

  @ApiProperty({ example: 'Novak' })
  @IsString()
  @IsNotEmpty()
  firstname!: string;

  @ApiProperty({ example: 'Djokovic' })
  @IsString()
  @IsNotEmpty()
  lastname!: string;

  @ApiProperty({ example: 'N.DJO' })
  @IsString()
  @IsNotEmpty()
  shortname!: string;

  @ApiProperty({ description: 'Sexe du joueur.', enum: ['M', 'F'], example: 'M' })
  @IsIn(['M', 'F'], { message: 'sex doit valoir M ou F.' })
  sex!: PlayerSex;

  @ApiProperty({ type: PlayerCountryDto })
  @ValidateNested()
  @Type(() => PlayerCountryDto)
  country!: PlayerCountryDto;

  @ApiProperty({ example: 'https://tenisu.latelier.co/resources/Djokovic.png' })
  @IsUrl()
  picture!: string;

  @ApiProperty({ type: PlayerDataDto })
  @ValidateNested()
  @Type(() => PlayerDataDto)
  data!: PlayerDataDto;
}
