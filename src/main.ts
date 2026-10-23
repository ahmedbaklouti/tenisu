import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { setupApplication } from './app.setup.js';

const DEFAULT_PORT = 3000;

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  setupApplication(app);

  // Render fournit le port via la variable d'environnement PORT.
  const port = Number(process.env.PORT ?? DEFAULT_PORT);

  await app.listen(port, '0.0.0.0');

  new Logger('Bootstrap').log(
    `API disponible sur http://localhost:${port} (documentation : /docs)`,
  );
}

void bootstrap();
