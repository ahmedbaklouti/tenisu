import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AddPlayerUseCase } from '../../application/use-cases/add-player.use-case.js';
import { GetPlayerByIdUseCase } from '../../application/use-cases/get-player-by-id.use-case.js';
import { ListPlayersUseCase } from '../../application/use-cases/list-players.use-case.js';
import { CreatePlayerDto } from '../dto/create-player.dto.js';
import { PlayerIdParamDto } from '../dto/player-id-param.dto.js';
import { PlayerResponseDto } from '../dto/player-response.dto.js';

@ApiTags('players')
@Controller('players')
export class PlayersController {
  constructor(
    private readonly listPlayersUseCase: ListPlayersUseCase,
    private readonly getPlayerByIdUseCase: GetPlayerByIdUseCase,
    private readonly addPlayerUseCase: AddPlayerUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Lister les joueurs',
    description:
      'Joueurs triés par rang croissant, puis par identifiant croissant en cas de rang identique.',
  })
  @ApiOkResponse({ description: 'Liste des joueurs.', type: [PlayerResponseDto] })
  findAll(): Promise<PlayerResponseDto[]> {
    return this.listPlayersUseCase.execute();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un joueur par son identifiant' })
  @ApiParam({ name: 'id', description: 'Identifiant du joueur (entier positif).', example: 52 })
  @ApiOkResponse({ description: 'Joueur trouvé.', type: PlayerResponseDto })
  @ApiBadRequestResponse({ description: 'Identifiant non entier ou non positif.' })
  @ApiNotFoundResponse({ description: 'Aucun joueur ne correspond à cet identifiant.' })
  findOne(@Param() params: PlayerIdParamDto): Promise<PlayerResponseDto> {
    return this.getPlayerByIdUseCase.execute(params.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Ajouter un joueur',
    description:
      "L'identifiant est facultatif : s'il est omis, le prochain entier supérieur au plus grand identifiant existant est attribué.",
  })
  @ApiCreatedResponse({
    description: 'Joueur créé. En-tête `Location` : `/players/{id}`.',
    type: PlayerResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Charge utile invalide.' })
  @ApiConflictResponse({ description: "L'identifiant fourni est déjà utilisé." })
  async create(
    @Body() createPlayerDto: CreatePlayerDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<PlayerResponseDto> {
    const player = await this.addPlayerUseCase.execute(createPlayerDto);

    response.setHeader('Location', `/players/${player.id}`);

    return player;
  }
}
