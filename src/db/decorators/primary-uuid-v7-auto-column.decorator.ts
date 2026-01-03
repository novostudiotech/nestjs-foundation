import 'reflect-metadata';
import { BeforeInsert, PrimaryColumn } from 'typeorm';
import { uuidv7 } from 'uuidv7';

/**
 * Primary column decorator with automatic UUID v7 generation at application level
 *
 * Generates UUID v7 automatically before insert if ID is not set.
 * UUID v7 is time-ordered and provides better database index performance.
 *
 * Note: Uses @PrimaryColumn (not @PrimaryGeneratedColumn) because generation
 * happens in the application via BeforeInsert hook, not in the database.
 * In TypeORM, "Generated" specifically means database-level generation.
 * The "Auto" suffix indicates automatic generation at application level.
 *
 * @example
 * ```typescript
 * @Entity('user')
 * export class UserEntity extends AuditableEntity {
 *   @PrimaryUuidV7AutoColumn()
 *   id: string;
 * }
 * ```
 */
export function PrimaryUuidV7AutoColumn() {
  return (target: object, propertyKey: string) => {
    // Apply PrimaryColumn decorator
    PrimaryColumn({ type: 'uuid' })(target, propertyKey);

    // Create a unique method name for the BeforeInsert hook
    const hookMethodName = `__generateUuidV7_${propertyKey}`;

    // Define the hook method on the prototype
    Object.defineProperty(target, hookMethodName, {
      value: function (this: Record<string, unknown>) {
        if (!this[propertyKey]) {
          this[propertyKey] = uuidv7();
        }
      },
      writable: true,
      enumerable: false,
      configurable: true,
    });

    // Apply BeforeInsert decorator to the hook method
    BeforeInsert()(target, hookMethodName);
  };
}
