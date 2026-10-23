import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * Configuration commune à l'application et aux tests E2E : les tests HTTP
 * valident ainsi exactement le même comportement qu'en production.
 */
export function setupApplication(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Tenisu API - test technique L'Atelier")
    .setDescription(
      'API REST de consultation des joueurs de tennis : liste, détail, statistiques et ajout. ' +
        'Les erreurs respectent le format natif de NestJS : `{ "statusCode": 404, "error": "Not Found", "message": "..." }`.',
    )
    .setVersion('1.0')
    .addTag('players', 'Consultation et ajout des joueurs de tennis.')
    .addTag('statistics', 'Statistiques calculées sur les joueurs.')
    .addTag('health', "Disponibilité de l'application.")
    .build();

  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swaggerConfig));
}
