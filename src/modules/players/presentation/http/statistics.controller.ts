import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Controller, Get } from '@nestjs/common';
import { GetStatisticsUseCase } from '../../application/use-cases/get-statistics.use-case.js';
import { StatisticsResponseDto } from '../dto/statistics-response.dto.js';

@ApiTags('statistics')
@Controller('statistics')
export class StatisticsController {
  constructor(private readonly getStatisticsUseCase: GetStatisticsUseCase) {}

  @Get()
  @ApiOperation({
    summary: 'Statistiques globales',
    description:
      "Retourne le pays au meilleur ratio de victoires (agrégé sur tous ses joueurs), l'IMC moyen arrondi à deux décimales et la médiane des tailles en centimètres.",
  })
  @ApiOkResponse({
    description: 'Statistiques calculées sur tous les joueurs.',
    type: StatisticsResponseDto,
  })
  find(): Promise<StatisticsResponseDto> {
    return this.getStatisticsUseCase.execute();
  }
}
