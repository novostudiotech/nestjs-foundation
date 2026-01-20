# Admin Controllers

Admin CRUD API compatible with [Refine](https://refine.dev) and [React Admin](https://marmelab.com/react-admin/).

## Quick Start

**Simple controller (one line):**

```typescript
import { createAdminController } from '#/admin';
export const AdminUsersController = createAdminController(UserEntity);
```

**With custom endpoints:**

```typescript
@AdminController(EventEntity)
@Injectable()
export class AdminEventsController extends BaseAdminController<EventEntity> {
  constructor(@InjectRepository(EventEntity) repository: Repository<EventEntity>) {
    super(repository);
  }
  
  @Post(':id/publish')
  async publish(@Param('id') id: string) {
    return await this.findEntityById(id);
  }
}
```

**Register in module:**

```typescript
@Module({
  controllers: [UsersController, AdminUsersController],
})
export class UsersModule {}
```

Entity is automatically:
- ✅ Registered in TypeORM globally
- ✅ Protected with `AdminGuard` (Better Auth)
- ✅ Documented in Swagger
- ✅ Available via `AdminDiscoveryService`

## Components

- `@AdminController(Entity, options?)` - Decorator for routing, guards, entity registration
- `BaseAdminController<TEntity, TCreateDto, TUpdateDto>` - Abstract class with CRUD methods
- `createAdminController(Entity, options?)` - Factory helper
- `AdminGuard` - Authentication + logging
- `AdminMiddleware` - Request duration logging
- `AdminDiscoveryService` - Runtime introspection

## API Endpoints

- **GET** `/admin/{resource}` - List with pagination/sorting/filtering
- **GET** `/admin/{resource}/:id` - Get by ID
- **POST** `/admin/{resource}` - Create
- **PUT** `/admin/{resource}/:id` - Update
- **DELETE** `/admin/{resource}/:id` - Delete

## Query Parameters

```
GET /admin/users?page=1&perPage=20&sort=createdAt&order=DESC&filter={"emailVerified":true}
```

- `page` (number, default: 1) - Page number
- `perPage` (number, 1-100, default: 10) - Items per page
- `sort` (string) - Field name
- `order` ('ASC'|'DESC', default: 'ASC') - Sort direction
- `filter` (JSON string) - Flat object with scalar values

## Customization

**Custom resource name:**

```typescript
@AdminController(EventEntity, { resource: 'events' }) // → /admin/events
```

**Disable guards:**

```typescript
@AdminController(UserEntity, { guards: false })
```

**Custom DTOs:**

```typescript
export class AdminUsersController extends BaseAdminController<
  UserEntity,
  CreateUserDto,
  UpdateUserDto
> { }
```

Default: `Partial<Omit<Entity, 'id' | 'createdAt' | 'updatedAt'>>`

**Override methods:**

```typescript
@Post()
async create(@Body() dto: CreateUserDto): Promise<UserEntity> {
  // Custom logic
  return await this.repository.save(this.repository.create(dto));
}
```

**Complex filtering:**

```typescript
@Get()
async findAll(@Query() query: AdminListQuery) {
  const qb = this.repository.createQueryBuilder('u');
  if (query.filter) {
    const { email } = JSON.parse(query.filter);
    if (email) qb.where('u.email LIKE :email', { email: `%${email}%` });
  }
  qb.skip((query.page - 1) * query.perPage).take(query.perPage);
  if (query.sort) qb.orderBy(`u.${query.sort}`, query.order);
  const [data, total] = await qb.getManyAndCount();
  return { data, total, page: query.page, perPage: query.perPage };
}
```

## Runtime Introspection

```typescript
@Injectable()
export class MetricsService {
  constructor(private readonly adminDiscovery: AdminDiscoveryService) {}

  getAdminStats() {
    return this.adminDiscovery.getAllControllersWithMetadata()
      .map(({ entity, resource }) => ({ resource, entity: entity.name }));
  }
}
```

Use cases: Prometheus metrics, RBAC, audit logging, auto-documentation.

## Integration

**Refine:**

```typescript
<Refine
  dataProvider={dataProvider("http://localhost:3000/admin")}
  resources={[{ name: "users" }]}
/>
```

**React Admin:**

```typescript
<Admin dataProvider={jsonServerProvider("http://localhost:3000/admin")}>
  <Resource name="users" />
</Admin>
```

## Architecture

**Hybrid Pattern:**
1. **Registry** (decoration time) - `@AdminController` registers entity → TypeORM config
2. **Discovery** (runtime) - `AdminDiscoveryService` validates + introspection

**Why?** TypeORM needs entities before module init, Discovery works after.

## Type Reference

```typescript
// Decorator
function AdminController(
  entity: Function,
  options?: { guards?: any[] | false; tag?: string; resource?: string }
): ClassDecorator

// Factory
function createAdminController<T extends { id: string }>(
  entityClass: new () => T,
  options?: AdminControllerOptions
): Type<BaseAdminController<T>>

// Base Controller
abstract class BaseAdminController<
  TEntity extends { id: string },
  TCreateDto = Partial<Omit<TEntity, 'id' | 'createdAt' | 'updatedAt'>>,
  TUpdateDto = Partial<Omit<TEntity, 'id' | 'createdAt' | 'updatedAt'>>
> {
  findAll(query: AdminListQuery): Promise<AdminListResponse<TEntity>>;
  findOne(id: string): Promise<TEntity>;
  create(createDto: TCreateDto): Promise<TEntity>;
  update(id: string, updateDto: TUpdateDto): Promise<TEntity>;
  remove(id: string): Promise<{ id: string }>;
  protected findEntityById(id: string): Promise<TEntity>;
}

// Query DTO (Zod validated)
class AdminListQuery {
  page: number;        // 1+, default: 1
  perPage: number;     // 1-100, default: 10
  sort?: string;
  order: 'ASC' | 'DESC'; // default: 'ASC'
  filter?: string;     // JSON string
}

// Response
interface AdminListResponse<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
}
```

## Design Decisions

**Abstract Base Class** - NestJS idiomatic, simple syntax, great IDE support, easy to learn

**NOT @nestjsx/crud** - Unmaintained (~5 years), incompatible with modern NestJS/TypeORM

**Zod validation** - Consistency, type safety, `z.coerce` for query params, single source of truth
