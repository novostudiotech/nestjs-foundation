import {
  BadRequestException,
  Body,
  Delete,
  Get,
  Injectable,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { DeepPartial, FindManyOptions, FindOptionsWhere, Repository } from 'typeorm';
import { z } from 'zod';
import { ErrorCode, ErrorResponseDto } from '#/app/dto/error-response.dto';

/**
 * Zod schema for admin list query parameters
 * Ensures type safety and automatic validation
 */
const adminListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(10),
  sort: z.string().optional(),
  order: z.enum(['ASC', 'DESC']).default('ASC'),
  filter: z.string().optional(),
});

/**
 * DTO for admin list query with Zod validation
 */
export class AdminListQuery extends createZodDto(adminListQuerySchema) {}

/**
 * Response format for admin list endpoints
 * Compatible with Refine and React Admin
 */
export interface AdminListResponse<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
}

/**
 * Type helper to omit technical fields from entity for DTO creation
 */
type OmitTechnicalFields<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Base abstract controller for admin CRUD operations
 * Provides standard CRUD endpoints compatible with Refine and React Admin
 *
 * @template TEntity - Entity type (must have id field)
 * @template TCreateDto - DTO for create operations (defaults to Partial of entity without technical fields)
 * @template TUpdateDto - DTO for update operations (defaults to Partial of entity without technical fields)
 *
 * @example Simple usage with factory:
 * ```typescript
 * export const AdminUsersController = createAdminController(UserEntity);
 * ```
 *
 * @example Custom controller with additional endpoints:
 * ```typescript
 * @AdminController(EventEntity)
 * @Injectable()
 * export class AdminEventsController extends BaseAdminController<EventEntity> {
 *   constructor(@InjectRepository(EventEntity) repository: Repository<EventEntity>) {
 *     super(repository);
 *   }
 *
 *   @Post(':id/publish')
 *   async publish(@Param('id') id: string) {
 *     // Custom logic
 *   }
 * }
 * ```
 *
 * @example With custom DTOs:
 * ```typescript
 * @AdminController(UserEntity)
 * @Injectable()
 * export class AdminUsersController extends BaseAdminController<
 *   UserEntity,
 *   CreateUserDto,
 *   UpdateUserDto
 * > {
 *   constructor(@InjectRepository(UserEntity) repository: Repository<UserEntity>) {
 *     super(repository);
 *   }
 * }
 * ```
 */
@Injectable()
export abstract class BaseAdminController<
  TEntity extends { id: string },
  TCreateDto = Partial<OmitTechnicalFields<TEntity>>,
  TUpdateDto = Partial<OmitTechnicalFields<TEntity>>,
> {
  constructor(protected readonly repository: Repository<TEntity>) {}

  @Get()
  @ApiOperation({ summary: 'List all entities' })
  @ApiOkResponse({ description: 'List of entities with pagination' })
  async findAll(@Query() query: AdminListQuery): Promise<AdminListResponse<TEntity>> {
    const skip = (query.page - 1) * query.perPage;

    const findOptions: FindManyOptions<TEntity> = {
      skip,
      take: query.perPage,
    };

    if (query.sort) {
      // Validate sort field against entity columns to prevent prototype pollution
      const validColumns = this.repository.metadata.columns.map((col) => col.propertyName);
      if (!validColumns.includes(query.sort)) {
        throw new BadRequestException({
          code: ErrorCode.VALIDATION_ERROR,
          message: `Invalid sort field: ${query.sort}.`, // Valid fields are: ${validColumns.join(', ')}
        });
      }

      // biome-ignore lint/suspicious/noExplicitAny: Dynamic order key with computed property requires type assertion
      (findOptions as any).order = {
        [query.sort]: query.order,
      };
    }

    if (query.filter) {
      let filterObj: Record<string, unknown>;

      try {
        filterObj = JSON.parse(query.filter);
      } catch {
        throw new BadRequestException('Invalid JSON in filter parameter');
      }

      // Validate filter is a flat object with scalar values
      const filterSchema = z.record(
        z.string(),
        z.union([z.string(), z.number(), z.boolean(), z.null()])
      );
      const validationResult = filterSchema.safeParse(filterObj);

      if (!validationResult.success) {
        throw new BadRequestException('Filter must be a flat object with scalar values');
      }

      findOptions.where = validationResult.data as FindOptionsWhere<TEntity>;
    }

    const [data, total] = await this.repository.findAndCount(findOptions);

    return { data, total, page: query.page, perPage: query.perPage };
  }

  /**
   * Helper method to find entity by ID with proper error handling
   * @protected
   */
  protected async findEntityById(id: string): Promise<TEntity> {
    const entity = await this.repository.findOne({
      where: { id } as FindOptionsWhere<TEntity>,
    });

    if (!entity) {
      throw new NotFoundException(`Entity with ID ${id} not found`);
    }

    return entity;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get entity by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Entity details' })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async findOne(@Param('id') id: string): Promise<TEntity> {
    return this.findEntityById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new entity' })
  @ApiBody({ description: 'Entity data' })
  @ApiCreatedResponse({ description: 'Entity created successfully' })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  async create(@Body() createDto: TCreateDto): Promise<TEntity> {
    const entity = this.repository.create(createDto as DeepPartial<TEntity>);
    return await this.repository.save(entity);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an entity' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ description: 'Entity data' })
  @ApiOkResponse({ description: 'Entity updated successfully' })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  async update(@Param('id') id: string, @Body() updateDto: TUpdateDto): Promise<TEntity> {
    const entity = await this.findEntityById(id);
    Object.assign(entity, updateDto);
    return await this.repository.save(entity);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an entity' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Entity deleted successfully' })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async remove(@Param('id') id: string): Promise<{ id: string }> {
    const result = await this.repository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Entity with ID ${id} not found`);
    }

    return { id };
  }
}
