import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Schema for creating a user via admin API
 * Based on UserEntity structure with proper validation
 */
export const CreateUserSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().max(255).nullable().optional(),
  emailVerified: z.boolean().default(false).optional(),
  image: z.string().url().max(2048).nullable().optional(),
});

/**
 * DTO for creating a user via admin API
 * Generated from Zod schema with automatic Swagger integration
 */
export class CreateUserDto extends createZodDto(CreateUserSchema) {}

/**
 * Type inferred from CreateUserSchema for use in services
 */
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
