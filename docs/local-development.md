# Локальная разработка

## База данных и Redis

Для BikeTrips используйте PostgreSQL и Redis только через Docker Compose. Проект
рассчитывает на следующие локальные адреса:

- PostgreSQL: `localhost:5432`, база `biketrips`, пользователь `biketrips`;
- Redis: `localhost:6379`.

Не запускайте локальный Homebrew PostgreSQL одновременно с контейнерами: он займёт
порт `5432`, и `biketrips-postgres` не сможет стартовать.

На macOS локальный PostgreSQL можно остановить командой:

```bash
brew services stop postgresql@18
```

Запустите инфраструктуру проекта:

```bash
docker compose up -d postgres redis
docker compose ps
```

Оба контейнера должны перейти в состояние `healthy`. При первом запуске примените
миграции:

```bash
npm run migration:run -w @biketrips/api
```

Данные PostgreSQL и Redis сохраняются в Docker volumes `postgres-data` и
`redis-data`. Обычная остановка контейнеров их не удаляет:

```bash
docker compose stop
```

Для повторного запуска:

```bash
docker compose start
```

Не используйте `docker compose down -v`, если не хотите полностью удалить
локальные данные проекта.

## Переменные окружения

API читает локальные настройки из `apps/api/.env`:

```env
DATABASE_URL=postgres://biketrips:biketrips@localhost:5432/biketrips
REDIS_URL=redis://localhost:6379
JWT_SECRET=replace-with-a-local-secret
TELEGRAM_BOT_TOKEN=replace-with-telegram-bot-token
```

Web-приложение читает настройки из `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=replace-with-telegram-bot-username
NEXT_PUBLIC_MAPTILER_API_KEY=replace-with-public-maptiler-key
DADATA_API_KEY=replace-with-dadata-api-key
```

Эти файлы игнорируются Git. Не добавляйте в репозиторий реальные токены и секреты.
Ключ MapTiler используется в браузере, поэтому создайте для него ограничения по
разрешённым URL: `http://localhost:3000/*` для локальной разработки, а также
отдельные production и preview-домены. Не выдавайте этому ключу лишние права.
Ключ DaData используется только серверным маршрутом web-приложения для определения
адреса точки старта по координатам.

## Запуск приложения

Запускайте API и web-приложение в отдельных терминалах:

```bash
npm run dev:api
npm run dev:web
```

После запуска доступны:

- web: `http://localhost:3000`;
- API: `http://localhost:4000`;
- Swagger: `http://localhost:4000/docs`.

Не запускайте `next build` одновременно с `next dev`: оба процесса используют
директорию `.next`, из-за чего dev-сервер может потерять CSS и манифесты. Если это
произошло, остановите и заново запустите `npm run dev:web`.

## Диагностика

Проверить, кто занимает порт PostgreSQL:

```bash
lsof -nP -iTCP:5432 -sTCP:LISTEN
```

Проверить контейнеры и их логи:

```bash
docker compose ps
docker compose logs postgres redis
```

Проверить подключение к базе:

```bash
docker compose exec postgres pg_isready -U biketrips -d biketrips
```
