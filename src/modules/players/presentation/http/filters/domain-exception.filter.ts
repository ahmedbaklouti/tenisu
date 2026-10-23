import { Catch, HttpStatus } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { PlayerIdAlreadyExistsError } from '../../../domain/errors/player-id-already-exists.error.js';
import { PlayerNotFoundError } from '../../../domain/errors/player-not-found.error.js';

interface ErrorResponseBody {
  statusCode: number;
  error: string;
  message: string;
}

/**
 * Traduit les erreurs métier (indépendantes du framework) en réponses HTTP,
 * en conservant le format d'erreur natif de NestJS.
 */
@Catch(PlayerNotFoundError, PlayerIdAlreadyExistsError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: PlayerNotFoundError | PlayerIdAlreadyExistsError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const body: ErrorResponseBody =
      exception instanceof PlayerIdAlreadyExistsError
        ? { statusCode: HttpStatus.CONFLICT, error: 'Conflict', message: exception.message }
        : { statusCode: HttpStatus.NOT_FOUND, error: 'Not Found', message: exception.message };

    response.status(body.statusCode).json(body);
  }
}
