import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ValidationErrorDto } from './app/dto/validation-error.dto';
import { AppService } from './app.service';

// Simple Zod schema for user creation
const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  age: z.number().int().min(18).optional(),
});

// DTO generated from Zod schema with automatic Swagger integration
class CreateUserDto extends createZodDto(CreateUserSchema) {}

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Get hello message' })
  @ApiResponse({ status: 200, description: 'Returns a hello message' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('users')
  @ApiOperation({ summary: 'Create a new user (Zod validation example)' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Validation failed',
    type: ValidationErrorDto,
  })
  createUser(@Body() createUserDto: CreateUserDto) {
    return {
      message: 'User created successfully',
      user: createUserDto,
    };
  }
}
