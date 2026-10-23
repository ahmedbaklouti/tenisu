import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Controller, Get } from '@nestjs/common';
import { HealthResponseDto } from './dto/health-response.dto.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({
    summary: "Vérifier que l'application répond",
    description: "Utilisé par l'hébergeur (Render) comme health check.",
  })
  @ApiOkResponse({ description: "L'application est disponible.", type: HealthResponseDto })
  check(): HealthResponseDto {
    return { status: 'ok' };
  }
}
