import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AuthService } from '@thallesp/nestjs-better-auth';
import type { Auth } from 'better-auth';
import compression from 'compression';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { GlobalExceptionFilter } from './app/filters/global-exception.filter';
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

  // Enable graceful shutdown hooks
  app.enableShutdownHooks();

  // Apply security headers with Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // Required for Swagger UI
          scriptSrc: ["'self'", "'unsafe-inline'"], // Required for Swagger UI
          imgSrc: ["'self'", 'data:', 'https:'], // Required for Swagger UI
        },
      },
      crossOriginEmbedderPolicy: false, // Required for Swagger UI
    })
  );

  // Apply compression middleware
  app.use(
    compression({
      threshold: 1024, // Only compress responses larger than 1KB
      level: 6, // Compression level (0-9, 6 is default)
    })
  );

  // Get config service for CORS configuration
  const configService = app.get(ConfigService);

  // Setup CORS
  const corsOrigin = configService.get('corsOrigin') ?? appConfig.corsOrigin;
  app.enableCors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Apply global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter(logger));

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

  const port = configService.get<number>('PORT') ?? appConfig.port;

  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Swagger documentation available at: http://localhost:${port}/docs`);

  // Graceful shutdown handling
  const gracefulShutdown = async (signal: string) => {
    logger.log(`Received ${signal}, starting graceful shutdown...`);
    try {
      await app.close();
      logger.log('Application closed successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}
bootstrap();
