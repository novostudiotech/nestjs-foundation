# Database Fixtures для E2E тестов

## Обзор

Database fixtures предоставляют удобный доступ к базе данных в E2E тестах через одну фикстуру `useDb()`.

## Использование

### Базовый пример

```typescript
import { test, expect } from './fixtures';

test('example test', async ({ useDb }) => {
  const db = useDb();
  
  // Доступ к репозиториям
  const users = await db.userRepo.find();
  expect(users).toBeDefined();
});
```

### Доступные репозитории

Фикстура `useDb()` предоставляет следующие репозитории:

- `db.userRepo` - Repository для таблицы `user`
- `db.sessionRepo` - Repository для таблицы `session`
- `db.accountRepo` - Repository для таблицы `account`
- `db.verificationRepo` - Repository для таблицы `verification`

### Проверка данных в БД

```typescript
test('should create user in database', async ({ useAuthenticatedApi, useDb }) => {
  const { user } = await useAuthenticatedApi();
  const db = useDb();
  
  const dbUser = await db.userRepo.findOne({ where: { email: user.email } });
  expect(dbUser).toBeDefined();
  expect(dbUser?.name).toBe(user.name);
});
```

### Создание тестовых данных

```typescript
test('should create test data', async ({ useDb, useApi }) => {
  const db = useDb();
  
  // Создаём пользователя напрямую в БД
  const user = db.userRepo.create({
    email: 'test@example.com',
    name: 'Test User',
    emailVerified: true
  });
  await db.userRepo.save(user);
  
  // Проверяем через API
  const api = await useApi();
  // ... тест логики
});
```

### Ручная очистка БД

```typescript
test('should cleanup database', async ({ useDb }) => {
  const db = useDb();
  
  // Создаём тестовые данные
  const user = db.userRepo.create({ 
    email: 'test@example.com', 
    name: 'Test' 
  });
  await db.userRepo.save(user);
  
  // Очищаем БД
  await db.cleanup();
  
  // Проверяем что данные удалены
  const count = await db.userRepo.count();
  expect(count).toBe(0);
});
```

### Raw SQL запросы

```typescript
test('should execute raw queries', async ({ useDb }) => {
  const db = useDb();
  
  const result = await db.dataSource.query(
    'SELECT COUNT(*) as count FROM "user"'
  );
  
  expect(result[0].count).toBeDefined();
});
```

## API Reference

### DatabaseFixture

```typescript
interface DatabaseFixture {
  // Typed repositories
  userRepo: Repository<any>;
  sessionRepo: Repository<any>;
  accountRepo: Repository<any>;
  verificationRepo: Repository<any>;
  
  // Utilities
  cleanup: () => Promise<void>;
  dataSource: DataSource;
}
```

### cleanup()

Метод `cleanup()` выполняет `TRUNCATE CASCADE` для всех таблиц:
- session
- account
- verification
- user

**Важно:** Очистка НЕ выполняется автоматически. Вызывайте `db.cleanup()` вручную когда нужно.

### dataSource

Прямой доступ к TypeORM DataSource для выполнения raw queries или других операций.

## Технические детали

- Используется singleton подключение к БД (создаётся один раз для всех тестов)
- Подключение к `TEST_DATABASE_URL` из `.env.test`
- Репозитории получаются через `dataSource.getRepository(tableName)`
- Не требует импорта entity классов (избегаем проблем с декораторами в Playwright)

## Примеры из реальных тестов

См. файл [`e2e/auth.spec.ts`](../e2e/auth.spec.ts) для примеров использования database fixtures в тестах аутентификации.
