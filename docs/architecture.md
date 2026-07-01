# BikeTrips: стек и архитектура

## Принятый стек

BikeTrips развивается как TypeScript-монорепозиторий с отдельными приложениями для web, backend, Telegram-бота и будущих мобильных клиентов.

Основные технологии:

- Web: Next.js, React, TypeScript, Tailwind CSS.
- Mobile: React Native + Expo, TypeScript.
- Backend: Node.js + NestJS.
- Auth: Passport.js, JWT, Telegram auth strategy, refresh tokens.
- Database: PostgreSQL.
- ORM: TypeORM.
- Background jobs: Redis + BullMQ.
- Files: S3-compatible storage для GPX, изображений и вложений.
- API: REST API с OpenAPI-описанием.
- Infrastructure: Docker Compose для локальной разработки, reverse proxy через Nginx или Caddy.

Vercel и Supabase в проекте не используются.

## Архитектурный подход

Backend строится как модульное NestJS-приложение с классическим использованием TypeORM. Каждый доменный модуль подключает свои entities через `TypeOrmModule.forFeature(...)`, а сервисы получают стандартные TypeORM repositories через `@InjectRepository(...)`.

Основная бизнес-логика живет в NestJS services. Controllers принимают запросы, валидируют DTO и вызывают services. TypeORM entities описывают структуру таблиц и связи между сущностями.

## Рекомендуемая структура репозитория

```text
apps/
  web/                 Next.js web app
  mobile/              Expo React Native app
  api/                 NestJS backend API
  bot/                 Telegram bot worker

packages/
  domain/              общие типы, enums, Zod-схемы, бизнес-правила
  api-client/          typed REST client для web/mobile/bot
  config/              общие eslint/tsconfig/env helpers
```

## Backend-модули

```text
apps/api/src/
  modules/
    auth/
    users/
    organizers/
    trips/
    participants/
    notifications/
    telegram/
    files/
    admin/
  infrastructure/
    database/
    storage/
    queues/
```

Каждый доменный модуль должен иметь понятные границы:

- `controller` принимает HTTP-запросы и возвращает DTO;
- `service` содержит сценарии приложения;
- `entity` описывает таблицу БД и связи TypeORM;
- `dto` описывает входные и выходные контракты API;
- TypeORM repositories внедряются в services стандартным способом NestJS.

## Пример стандартного использования TypeORM

```text
TripsController
  -> TripsService
    -> TypeORM Repository<TripEntity>
```

Модуль подключает entities через `TypeOrmModule.forFeature(...)`:

```ts
@Module({
  imports: [TypeOrmModule.forFeature([TripEntity, TripParticipantEntity])],
  controllers: [TripsController],
  providers: [TripsService],
})
export class TripsModule {}
```

Сервис получает repository напрямую:

```ts
@Injectable()
export class TripsService {
  constructor(
    @InjectRepository(TripEntity)
    private readonly tripsRepository: Repository<TripEntity>,
  ) {}

  async findById(id: string): Promise<TripEntity | null> {
    return this.tripsRepository.findOne({
      where: { id },
      relations: { organizer: true },
    });
  }
}
```

## Правила для TypeORM

- Использовать стандартную интеграцию NestJS: `TypeOrmModule`, `@InjectRepository`, `Repository<T>`.
- Разделять DTO и entities: входные данные API не должны напрямую приниматься как entity.
- Не возвращать наружу лишние поля entities, особенно приватные и служебные данные.
- Не размещать бизнес-правила в entity lifecycle hooks.
- Не полагаться на скрытую lazy-loading магию.
- Для сложных выборок использовать явный query builder.
- Использовать явные транзакции для сценариев записи, где меняется несколько сущностей.
- Миграции хранить в репозитории и применять через CI/CD или release-процесс.

## Основные доменные сущности

- User.
- Organizer.
- Trip.
- TripParticipant.
- WaitlistEntry.
- TripUpdate.
- TelegramAccount.
- NotificationJob.
- RouteFile.
- City.

## Интеграции

Telegram-бот работает как отдельное приложение в монорепозитории. Он не содержит бизнес-логику поездок, а вызывает backend API или application services через общий клиент.

Web и mobile клиенты используют один REST API. Общие типы, enum-значения, схемы валидации и API-клиент выносятся в `packages`, чтобы не дублировать контракты между Next.js, React Native и ботом.
