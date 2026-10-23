import { Module } from '@nestjs/common';
import { HealthController } from './modules/health/health.controller.js';
import { PlayersModule } from './modules/players/players.module.js';

@Module({
  imports: [PlayersModule],
  controllers: [HealthController],
})
export class AppModule {}
