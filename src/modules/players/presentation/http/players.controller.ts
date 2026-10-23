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
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AddPlayerUseCase } from '../../application/use-cases/add-player.use-case.js';
import { GetPlayerByIdUseCase } from '../../application/use-cases/get-player-by-id.use-case.js';
import { GetPlayerStatisticsUseCase } from '../../application/use-cases/get-player-statistics.use-case.js';
import { ListPlayersUseCase } from '../../application/use-cases/list-players.use-case.js';
import { CreatePlayerDto } from '../dto/create-player.dto.js';
import { ListPlayersQueryDto } from '../dto/list-players-query.dto.js';
import { PlayerIdParamDto } from '../dto/player-id-param.dto.js';
import { PlayerResponseDto } from '../dto/player-response.dto.js';
import { PlayerStatisticsResponseDto } from '../dto/player-statistics-response.dto.js';

@ApiTags('players')
@Controller('players')
export class PlayersController {
  constructor(
    private readonly listPlayersUseCase: ListPlayersUseCase,
    private readonly getPlayerByIdUseCase: GetPlayerByIdUseCase,
    private readonly getPlayerStatisticsUseCase: GetPlayerStatisticsUseCase,
    private readonly addPlayerUseCase: AddPlayerUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Lister ou rechercher des joueurs',
    description:
      'Joueurs triés par rang croissant, puis par identifiant croissant en cas de rang identique. ' +
      'Les filtres sont facultatifs et cumulables (logique ET) : `country` (insensible à la casse), ' +
      '`minRank`/`maxRank` et `minAge`/`maxAge`, bornes incluses. ' +
      'Une recherche sans résultat renvoie `200` avec un tableau vide. ' +
      'Exemple : `GET /players?country=USA&minRank=1&maxRank=10`.',
  })
  @ApiOkResponse({
    description: 'Liste des joueurs correspondant aux filtres (vide si aucun résultat).',
    type: [PlayerResponseDto],
  })
  @ApiBadRequestResponse({
    description:
      'Paramètre de requête invalide, inconnu, ou intervalle incohérent (`minRank` > `maxRank`, `minAge` > `maxAge`).',
  })
  findAll(@Query() query: ListPlayersQueryDto): Promise<PlayerResponseDto[]> {
    return this.listPlayersUseCase.execute(query);
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

  @Get(':id/statistics')
  @ApiOperation({
    summary: "Statistiques individuelles d'un joueur",
    description:
      'Victoires, défaites et matchs joués calculés sur les derniers matchs du joueur. Le ratio de victoires suit la même convention que les statistiques globales : une valeur entre 0 et 1, jamais un pourcentage.',
  })
  @ApiParam({ name: 'id', description: 'Identifiant du joueur (entier positif).', example: 52 })
  @ApiOkResponse({
    description: 'Statistiques individuelles du joueur.',
    type: PlayerStatisticsResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Identifiant non entier ou non positif.' })
  @ApiNotFoundResponse({ description: 'Aucun joueur ne correspond à cet identifiant.' })
  findStatistics(@Param() params: PlayerIdParamDto): Promise<PlayerStatisticsResponseDto> {
    return this.getPlayerStatisticsUseCase.execute(params.id);
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
