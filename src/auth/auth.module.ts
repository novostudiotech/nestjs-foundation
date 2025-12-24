import type { MiddlewareConsumer, NestModule, OnModuleInit } from '@nestjs/common';
import { Global, Inject, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DiscoveryModule, DiscoveryService, HttpAdapterHost, MetadataScanner } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { type Auth, betterAuth } from 'better-auth';
import { createAuthMiddleware } from 'better-auth/plugins';
import type { Request, Response } from 'express';
import { EnvConfig } from '../config';
import { getBetterAuthConfig } from '../config/auth.config';
import {
  AFTER_HOOK_KEY,
  AUTH_INSTANCE_KEY,
  BEFORE_HOOK_KEY,
  HOOK_KEY,
} from '../constants/auth.constant';
import { AuthService } from './auth.service';
import { BetterAuthService } from './better-auth.service';
import { UserEntity } from './entities/user.entity';

const HOOKS = [
  { metadataKey: BEFORE_HOOK_KEY, hookType: 'before' as const },
  { metadataKey: AFTER_HOOK_KEY, hookType: 'after' as const },
];

@Global()
@Module({
  imports: [DiscoveryModule, TypeOrmModule.forFeature([UserEntity])],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule implements NestModule, OnModuleInit {
  private logger = new Logger(this.constructor.name);

  constructor(
    @Inject(AUTH_INSTANCE_KEY) private readonly auth: Auth,
    @Inject(DiscoveryService)
    private discoveryService: DiscoveryService,
    @Inject(MetadataScanner)
    private metadataScanner: MetadataScanner,
    @Inject(HttpAdapterHost)
    private readonly adapter: HttpAdapterHost
  ) {}

  onModuleInit() {
    if (!this.auth.options.hooks) return;

    const providers = this.discoveryService
      .getProviders()
      .filter(({ metatype }) => metatype && Reflect.getMetadata(HOOK_KEY, metatype));

    for (const provider of providers) {
      const providerPrototype = Object.getPrototypeOf(provider.instance);
      const methods = this.metadataScanner.getAllMethodNames(providerPrototype);

      for (const method of methods) {
        const providerMethod = providerPrototype[method];
        this.setupHooks(providerMethod);
      }
    }
  }

  configure(consumer: MiddlewareConsumer) {
    let basePath = this.auth.options.basePath ?? '/api/auth';

    // Ensure the basePath starts with / and doesn't end with /
    if (!basePath.startsWith('/')) {
      basePath = '/' + basePath;
    }
    if (basePath.endsWith('/')) {
      basePath = basePath.slice(0, -1);
    }

    // Register Express middleware for better-auth
    consumer
      .apply(async (req: Request, res: Response, next: () => void) => {
        // Only handle requests to auth base path
        if (!req.path.startsWith(basePath)) {
          return next();
        }

        try {
          const url = new URL(req.url, `${req.protocol}://${req.get('host')}`);

          const headers = new Headers();
          Object.entries(req.headers).forEach(([key, value]) => {
            if (value) {
              if (Array.isArray(value)) {
                value.forEach((v) => {
                  headers.append(key, v);
                });
              } else {
                headers.append(key, value.toString());
              }
            }
          });

          const body = req.body ? JSON.stringify(req.body) : undefined;

          const request = new Request(url.toString(), {
            method: req.method,
            headers,
            body,
          });

          const response = await this.auth.handler(request);

          res.status(response.status);
          response.headers.forEach((value, key) => {
            res.setHeader(key, value);
          });

          if (response.body) {
            const text = await response.text();
            res.send(text);
          } else {
            res.json({
              status: response.status,
              message: response.statusText,
            });
          }
        } catch (error) {
          this.logger.fatal(`Better auth error ${String(error)}`);
          res.status(500).json({
            error: 'Internal authentication error',
            code: 'AUTH_FAILURE',
          });
        }
      })
      .forRoutes('*');

    this.logger.log(`AuthModule initialized at '${basePath}/*'`);
  }

  private setupHooks(providerMethod: (ctx: any) => Promise<void>) {
    if (!this.auth.options.hooks) return;

    for (const { metadataKey, hookType } of HOOKS) {
      const hookPath = Reflect.getMetadata(metadataKey, providerMethod);
      if (!hookPath) continue;

      const originalHook = this.auth.options.hooks[hookType];
      this.auth.options.hooks[hookType] = createAuthMiddleware(async (ctx) => {
        if (originalHook) {
          await originalHook(ctx);
        }

        if (hookPath === ctx.path) {
          await providerMethod(ctx);
        }
      });
    }
  }

  static forRootAsync() {
    return {
      global: true,
      module: AuthModule,
      imports: [TypeOrmModule.forFeature([UserEntity])],
      providers: [
        {
          provide: AUTH_INSTANCE_KEY,
          useFactory: async (configService: ConfigService<EnvConfig>, authService: AuthService) => {
            const config = getBetterAuthConfig({
              configService,
              authService,
            });
            return betterAuth(config);
          },
          inject: [ConfigService, AuthService],
        },
        BetterAuthService,
      ],
      exports: [AUTH_INSTANCE_KEY, BetterAuthService],
    };
  }
}
