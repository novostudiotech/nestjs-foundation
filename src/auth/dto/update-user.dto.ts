import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Schema for updating a user via admin API
 * All fields are optional for partial updates
 */
export const UpdateUserSchema = z.object({
  email: z.string().email().max(255).optional(),
  name: z.string().max(255).nullable().optional(),
  emailVerified: z.boolean().optional(),
  image: z.string().url().max(2048).nullable().optional(),
});

/**
 * DTO for updating a user via admin API
 * Generated from Zod schema with automatic Swagger integration
 */
export class UpdateUserDto extends createZodDto(UpdateUserSchema) {}

/**
 * Type inferred from UpdateUserSchema for use in services
 */
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
