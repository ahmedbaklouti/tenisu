import { APP_FILTER } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { AddPlayerUseCase } from './application/use-cases/add-player.use-case.js';
import { GetPlayerByIdUseCase } from './application/use-cases/get-player-by-id.use-case.js';
import { GetStatisticsUseCase } from './application/use-cases/get-statistics.use-case.js';
import { ListPlayersUseCase } from './application/use-cases/list-players.use-case.js';
import { PLAYER_REPOSITORY } from './domain/repositories/player.repository.js';
import type { PlayerRepository } from './domain/repositories/player.repository.js';
import {
  InMemoryPlayerRepository,
  loadInitialPlayers,
} from './infrastructure/persistence/in-memory-player.repository.js';
import { DomainExceptionFilter } from './presentation/http/filters/domain-exception.filter.js';
import { PlayersController } from './presentation/http/players.controller.js';
import { StatisticsController } from './presentation/http/statistics.controller.js';

@Module({
  controllers: [PlayersController, StatisticsController],
  providers: [
    ListPlayersUseCase,
    GetPlayerByIdUseCase,
    AddPlayerUseCase,
    GetStatisticsUseCase,
    {
      provide: PLAYER_REPOSITORY,
      useFactory: (): PlayerRepository => new InMemoryPlayerRepository(loadInitialPlayers()),
    },
    {
      provide: APP_FILTER,
      useClass: DomainExceptionFilter,
    },
  ],
})
export class PlayersModule {}
