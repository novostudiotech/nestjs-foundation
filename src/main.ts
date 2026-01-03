import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AuthService } from '@thallesp/nestjs-better-auth';
import type { Auth } from 'better-auth';
import { Logger } from 'nestjs-pino';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { AppModule } from './app.module';
import { generateBetterAuthOpenAPISchema } from './auth/openapi';
import { appConfig } from './config';
import { mergeOpenAPIDocuments } from './swagger/openapi-merge.util';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true, // Wait until a custom logger is attached
    bodyParser: false, // Required for Better Auth, the library will automatically re-add the default body parsers.
  });

  const logger = app.get(Logger);
  app.useLogger(logger);

  // Setup CORS
  app.enableCors({
    origin: true, // Allow all origins
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Setup Swagger
  const config = new DocumentBuilder()
    .setTitle('NestJS Foundation API')
    .setDescription('NestJS Foundation API Documentation')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Integrate Better Auth OpenAPI schema
  // Get auth instance from AuthService (already created in AuthModule)
  const authService = app.get<AuthService<Auth>>(AuthService);
  const betterAuthSchema = await generateBetterAuthOpenAPISchema(authService.instance);
  if (betterAuthSchema) mergeOpenAPIDocuments(document, betterAuthSchema);
  SwaggerModule.setup('docs', app, cleanupOpenApiDoc(document));

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') ?? appConfig.port;

  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Swagger documentation available at: http://localhost:${port}/docs`);
}
bootstrap();
