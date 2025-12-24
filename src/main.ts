import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Auth } from 'better-auth';
import { Logger } from 'nestjs-pino';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { AppModule } from './app.module';
import { appConfig } from './config';
import { AUTH_INSTANCE_KEY } from './constants/auth.constant';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true, // Wait until a custom logger is attached
  });

  const logger = app.get(Logger);
  app.useLogger(logger);

  // Setup CORS
  app.enableCors({
    origin: appConfig.corsOrigin || true, // Allow all origins if not specified
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Setup Swagger
  const config = new DocumentBuilder()
    .setTitle('NestJS Foundation API')
    .setDescription('NestJS Foundation API Documentation')
    .setVersion('1.0')
    .addTag('Auth', 'Better Auth authentication endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Integrate Better Auth OpenAPI schema if available
  // The openAPI plugin adds generateOpenAPISchema method to auth.api
  try {
    const auth = app.get<Auth>(AUTH_INSTANCE_KEY);
    if (auth && 'api' in auth && auth.api) {
      const api = auth.api as any;
      if (typeof api.generateOpenAPISchema === 'function') {
        const betterAuthSchema = await api.generateOpenAPISchema();

        // Merge Better Auth paths into Swagger document
        // Add "Auth" tag to all Better Auth endpoints
        if (betterAuthSchema.paths) {
          const authPaths: Record<string, any> = {};
          for (const [path, pathItem] of Object.entries(betterAuthSchema.paths)) {
            if (pathItem) {
              const updatedPathItem: any = { ...pathItem };
              // Add "Auth" tag to all operations (get, post, put, delete, patch, etc.)
              const httpMethods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'];
              for (const method of httpMethods) {
                if (updatedPathItem[method]) {
                  updatedPathItem[method] = {
                    ...updatedPathItem[method],
                    tags: ['Auth'],
                  };
                }
              }
              authPaths[path] = updatedPathItem;
            }
          }
          document.paths = {
            ...document.paths,
            ...authPaths,
          };
        }

        // Merge Better Auth components (schemas, securitySchemes, etc.)
        if (betterAuthSchema.components) {
          document.components = {
            ...document.components,
            ...betterAuthSchema.components,
          };
        }

        // Add Better Auth tags if they exist
        if (betterAuthSchema.tags && Array.isArray(betterAuthSchema.tags)) {
          document.tags = [...(document.tags || [])];
        }
      }
    }
  } catch (error) {
    logger.warn('Failed to integrate Better Auth OpenAPI schema:', error);
  }

  SwaggerModule.setup('docs', app, cleanupOpenApiDoc(document));

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') ?? appConfig.port;

  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Swagger documentation available at: http://localhost:${port}/docs`);
}
bootstrap();
