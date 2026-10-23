import { ApiProperty } from '@nestjs/swagger';

/** Réponse du endpoint de santé. */
export class HealthResponseDto {
  @ApiProperty({ description: "État de l'application.", example: 'ok' })
  status!: string;
}
