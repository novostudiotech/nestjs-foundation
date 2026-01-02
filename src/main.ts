import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { AppModule } from './app.module';
import { auth } from './auth/auth.config';
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
  const betterAuthSchema = await generateBetterAuthOpenAPISchema(auth);
  if (betterAuthSchema) {
    // Merge Better Auth schema into Swagger document
    // Type assertion needed for compatibility between Better Auth OpenAPI schema and Swagger types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mergeOpenAPIDocuments(document, betterAuthSchema as any);
  }
  SwaggerModule.setup('docs', app, cleanupOpenApiDoc(document));

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') ?? appConfig.port;

  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Swagger documentation available at: http://localhost:${port}/docs`);
}
bootstrap();
