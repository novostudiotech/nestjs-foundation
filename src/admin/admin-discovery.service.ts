import { Injectable } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { Logger } from 'nestjs-pino';

/**
 * Service for discovering admin controllers at runtime
 * Uses NestJS Discovery Module to scan all controllers and find those marked with @AdminController
 *
 * How it works:
 * 1. DiscoveryService scans all controllers in the application
 * 2. Checks for 'admin:entity' metadata on each controller
 * 3. Extracts entities and provides introspection API
 *
 * Registry is still used for early TypeORM registration (TypeORM needs entities before module init).
 * Discovery provides validation and runtime introspection on top of registry.
 */
@Injectable()
export class AdminDiscoveryService {
  constructor(
    private readonly discovery: DiscoveryService,
    private readonly logger: Logger
  ) {}

  /**
   * Discover all admin controllers and extract their entities
   * Called on demand (not in constructor to avoid circular dependencies)
   */
  private discoverAdminControllers(): {
    // biome-ignore lint/complexity/noBannedTypes: Entity classes are constructor functions
    entities: Function[];
    controllers: InstanceWrapper[];
  } {
    const controllers = this.discovery.getControllers();
    // biome-ignore lint/complexity/noBannedTypes: Entity classes are constructor functions
    const entities = new Set<Function>();
    const adminControllers: InstanceWrapper[] = [];

    for (const wrapper of controllers) {
      const { metatype } = wrapper;

      if (!metatype) {
        continue;
      }

      // Check if controller has admin:entity metadata
      const entity = Reflect.getMetadata('admin:entity', metatype);

      if (entity) {
        entities.add(entity);
        adminControllers.push(wrapper);

        const resourceName = Reflect.getMetadata('admin:resource', metatype);
        const options = Reflect.getMetadata('admin:options', metatype);

        this.logger.debug({
          msg: 'Discovered admin controller',
          controller: metatype.name,
          entity: entity.name,
          resource: resourceName,
          options,
        });
      }
    }

    return {
      entities: Array.from(entities),
      controllers: adminControllers,
    };
  }

  /**
   * Get all discovered entities
   * Safe to call at any time (discovers on demand)
   */
  // biome-ignore lint/complexity/noBannedTypes: Entity classes are Function types
  getEntities(): Function[] {
    const { entities } = this.discoverAdminControllers();
    return entities;
  }

  /**
   * Get all discovered admin controllers
   */
  getControllers(): InstanceWrapper[] {
    const { controllers } = this.discoverAdminControllers();
    return controllers;
  }

  /**
   * Get admin metadata for a specific controller
   */
  getControllerMetadata(controller: InstanceWrapper): {
    // biome-ignore lint/complexity/noBannedTypes: Entity class is Function type
    entity: Function;
    resource: string;
    options: Record<string, unknown>;
  } | null {
    const { metatype } = controller;

    if (!metatype || !Reflect.hasMetadata('admin:entity', metatype)) {
      return null;
    }

    return {
      entity: Reflect.getMetadata('admin:entity', metatype),
      resource: Reflect.getMetadata('admin:resource', metatype),
      options: Reflect.getMetadata('admin:options', metatype) || {},
    };
  }

  /**
   * Get all admin controllers with their metadata
   * Convenient method for introspection and feature building
   */
  getAllControllersWithMetadata(): Array<{
    controller: InstanceWrapper;
    // biome-ignore lint/complexity/noBannedTypes: Entity class is Function type
    entity: Function;
    resource: string;
    options: Record<string, unknown>;
  }> {
    const controllers = this.getControllers();
    return controllers
      .map((controller) => {
        const metadata = this.getControllerMetadata(controller);
        if (!metadata) {
          return null;
        }
        return {
          controller,
          ...metadata,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }

  /**
   * Check if entity is registered in any admin controller
   */
  // biome-ignore lint/complexity/noBannedTypes: Entity class is Function type
  hasEntity(entity: Function): boolean {
    return this.getEntities().includes(entity);
  }

  /**
   * Get count of discovered entities
   */
  count(): number {
    return this.getEntities().length;
  }

  /**
   * Log discovery summary
   * Called by AdminModule.onModuleInit()
   */
  logDiscoverySummary(): void {
    const entities = this.getEntities();
    const controllers = this.getControllers();

    this.logger.log({
      msg: 'Admin controllers discovered',
      entityCount: entities.length,
      controllerCount: controllers.length,
      entities: entities.map((e) => e.name).join(', '),
      controllers: controllers.map((c) => c.metatype?.name).join(', '),
    });
  }
}
