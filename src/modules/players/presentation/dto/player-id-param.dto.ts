import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

/** Paramètre de route `id` : entier positif strictement. */
export class PlayerIdParamDto {
  @ApiProperty({ description: 'Identifiant du joueur (entier positif).', example: 52 })
  @Type(() => Number)
  @IsInt({ message: "L'identifiant doit être un entier." })
  @Min(1, { message: "L'identifiant doit être supérieur ou égal à 1." })
  id!: number;
}
