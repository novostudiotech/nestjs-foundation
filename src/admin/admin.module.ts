import { DynamicModule, Global, Module, OnModuleInit } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Logger } from 'nestjs-pino';
// TODO: Re-enable AdminGuard once AUTH_MODULE_OPTIONS_KEY integration is fixed
// import { AdminGuard } from './admin.guard';
import { AdminDiscoveryService } from './admin-discovery.service';
import { adminRegistry } from './admin-registry';

/**
 * Global Admin module for CRUD operations on entities
 * Provides admin controllers compatible with Refine and React Admin
 *
 * This module is @Global() which means:
 * - All providers (AdminDiscoveryService) are available throughout the app
 * - TypeORM repositories for admin entities are available throughout the app
 * - TODO: AdminGuard temporarily disabled - see admin.guard.ts
 * - You can create admin controllers in any module without importing AdminModule
 * - Just use @AdminController(Entity) decorator and BaseAdminController
 *
 * Hybrid approach (Registry + Discovery):
 * 1. @AdminController decorator registers entity in adminRegistry (decoration time)
 * 2. AdminModule.forRoot() uses adminRegistry to register ALL entities with TypeORM (module init)
 * 3. TypeORM repositories become globally available via @Global()
 * 4. AdminDiscoveryService provides runtime introspection and validation
 *
 * To add new admin controller:
 * 1. Create controller: @AdminController(EventEntity)
 * 2. Add controller to your module's controllers: [EventsController, AdminEventsController]
 * 3. No need to import TypeOrmModule.forFeature - repositories are global
 */
@Global()
@Module({})
export class AdminModule implements OnModuleInit {
  constructor(
    private readonly logger: Logger,
    private readonly discoveryService: AdminDiscoveryService
  ) {}

  /**
   * Configure AdminModule with entities from adminRegistry
   * Must be called in AppModule AFTER all modules with @AdminController are imported
   *
   * @param _authModule - Optional AuthModule instance (currently unused, kept for future AdminGuard integration)
   */
  static forRoot(_authModule?: DynamicModule): DynamicModule {
    // Get all entities registered by @AdminController decorator
    const entities = adminRegistry.getAll();

    return {
      global: true, // Make this module global
      module: AdminModule,
      imports: [
        DiscoveryModule,
        TypeOrmModule.forFeature(entities),
        // TODO: Re-enable when AdminGuard is fixed
        // Import AuthModule to make AUTH_MODULE_OPTIONS_KEY available to AdminGuard
        // ...(authModule ? [authModule] : []),
      ],
      controllers: [
        // Admin controllers are registered in their respective modules
        // This keeps controllers close to their domain logic
        // AdminModule only provides infrastructure
      ],
      providers: [
        // TODO: Re-enable AdminGuard once AUTH_MODULE_OPTIONS_KEY integration is fixed
        // AdminGuard,
        AdminDiscoveryService,
      ],
      exports: [
        // TODO: Re-enable AdminGuard once AUTH_MODULE_OPTIONS_KEY integration is fixed
        // AdminGuard,
        AdminDiscoveryService,
        TypeOrmModule,
      ],
    };
  }

  onModuleInit(): void {
    // Validate that discovered entities match registry
    const discoveredEntities = this.discoveryService.getEntities();
    const registryEntities = adminRegistry.getAll();

    const discoveredCount = discoveredEntities.length;
    const registryCount = registryEntities.length;

    if (discoveredCount !== registryCount) {
      this.logger.warn({
        msg: 'AdminModule: Entity count mismatch between discovery and registry',
        discovered: discoveredCount,
        registry: registryCount,
        discoveredEntities: discoveredEntities.map((e) => e.name),
        registryEntities: registryEntities.map((e) => e.name),
      });
    }

    // Log discovery summary
    this.discoveryService.logDiscoverySummary();

    this.logger.log({
      msg: 'AdminModule initialized',
      entityCount: registryCount,
      entities: registryEntities.map((e) => e.name).join(', '),
    });
  }
}
