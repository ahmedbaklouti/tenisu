import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
  Validate,
  ValidatorConstraint,
} from 'class-validator';
import type { ValidationArguments, ValidatorConstraintInterface } from 'class-validator';

/**
 * Indique si deux bornes forment un intervalle inversé.
 * Les bornes absentes ou non entières sont ignorées : leur validité est du
 * ressort des validateurs `@IsInt` / `@Min` de chaque propriété.
 */
function isReversedRange(min?: number, max?: number): boolean {
  const bothAreIntegers = [min, max].every(
    (bound) => typeof bound === 'number' && Number.isInteger(bound),
  );

  return bothAreIntegers && min !== undefined && max !== undefined && min > max;
}

/** Vérifie que l'intervalle de rang n'est pas inversé. */
@ValidatorConstraint({ name: 'isRankRangeOrdered', async: false })
class IsRankRangeOrderedConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const { minRank, maxRank } = args.object as ListPlayersQueryDto;

    return !isReversedRange(minRank, maxRank);
  }

  defaultMessage(): string {
    return 'minRank doit être inférieur ou égal à maxRank.';
  }
}

/** Vérifie que l'intervalle d'âge n'est pas inversé. */
@ValidatorConstraint({ name: 'isAgeRangeOrdered', async: false })
class IsAgeRangeOrderedConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const { minAge, maxAge } = args.object as ListPlayersQueryDto;

    return !isReversedRange(minAge, maxAge);
  }

  defaultMessage(): string {
    return 'minAge doit être inférieur ou égal à maxAge.';
  }
}

/**
 * Critères de recherche de `GET /players`.
 * Tous les paramètres sont facultatifs et cumulables : un paramètre absent
 * n'applique aucune restriction.
 */
export class ListPlayersQueryDto {
  @ApiPropertyOptional({
    description: 'Code pays sur trois lettres, insensible à la casse.',
    example: 'SRB',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsString({ message: 'country doit être une chaîne de caractères.' })
  @Matches(/^[A-Z]{3}$/, { message: 'country doit contenir trois lettres.' })
  country?: string;

  @ApiPropertyOptional({ description: 'Rang minimum accepté (borne incluse).', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'minRank doit être un entier.' })
  @Min(1, { message: 'minRank doit être supérieur ou égal à 1.' })
  minRank?: number;

  @ApiPropertyOptional({ description: 'Rang maximum accepté (borne incluse).', example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'maxRank doit être un entier.' })
  @Min(1, { message: 'maxRank doit être supérieur ou égal à 1.' })
  @Validate(IsRankRangeOrderedConstraint)
  maxRank?: number;

  @ApiPropertyOptional({ description: 'Âge minimum accepté (borne incluse).', example: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'minAge doit être un entier.' })
  @Min(1, { message: 'minAge doit être supérieur ou égal à 1.' })
  minAge?: number;

  @ApiPropertyOptional({ description: 'Âge maximum accepté (borne incluse).', example: 40 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'maxAge doit être un entier.' })
  @Min(1, { message: 'maxAge doit être supérieur ou égal à 1.' })
  @Validate(IsAgeRangeOrderedConstraint)
  maxAge?: number;
}
