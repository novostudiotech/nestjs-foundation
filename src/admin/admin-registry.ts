/**
 * Global registry for admin entities
 *
 * Registry Pattern implementation that collects entities at decoration time
 * (when @AdminController is applied to a class).
 *
 * How it works:
 * 1. @AdminController(Entity) calls adminRegistry.register(Entity) at decoration time
 * 2. AdminModule.forRoot() reads adminRegistry.getAll() at module initialization
 * 3. TypeOrmModule.forFeature(entities) registers all entities globally
 * 4. AdminDiscoveryService validates registry at runtime
 *
 * Registry collects entities at decoration time (before module init) for TypeORM.
 * Discovery validates and introspects at runtime (after module init).
 * TypeORM requires entities before module initialization, Discovery operates after initialization.
 *
 * This registry is internal implementation detail.
 * Public API is AdminDiscoveryService for runtime introspection.
 */
// biome-ignore lint/complexity/noBannedTypes: Function type needed for entity class registration
type EntityClass = Function;

class AdminEntityRegistry {
  private entities = new Set<EntityClass>();

  /**
   * Register an entity for admin CRUD operations
   * Called by @AdminController decorator
   */
  register(entity: EntityClass): void {
    this.entities.add(entity);
  }

  /**
   * Get all registered entities
   * Used by AdminModule to configure TypeOrmModule.forFeature()
   */
  getAll(): EntityClass[] {
    return Array.from(this.entities);
  }

  /**
   * Check if entity is registered
   */
  has(entity: EntityClass): boolean {
    return this.entities.has(entity);
  }

  /**
   * Get count of registered entities
   */
  count(): number {
    return this.entities.size;
  }
}

/**
 * Global singleton instance
 * Shared across all modules
 */
export const adminRegistry = new AdminEntityRegistry();
