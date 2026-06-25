import Link from "next/link";

import { AppTopbar, PageHeader } from "../../lib/components";

export default function TelegramAuthPage() {
  return (
    <main className="shell narrow-shell">
      <AppTopbar />
      <Link className="back-link" href="/">
        На главную
      </Link>
      <PageHeader eyebrow="Telegram" title="Вход и привязка">
        <p>
          Этот экран зарезервирован под Telegram Login Widget. После подключения бота он будет
          получать подпись Telegram, отправлять ее в API и возвращать пользователя к поездке.
        </p>
      </PageHeader>

      <section className="panel auth-card" aria-labelledby="auth-title">
        <h2 id="auth-title">Telegram-аккаунт</h2>
        <div className="telegram-placeholder" aria-hidden="true">
          TG
        </div>
        <p className="muted">
          Пока виджет не настроен, локальный organizer-токен можно передать через серверную
          переменную окружения.
        </p>
        <Link className="button" href="/">
          Вернуться к поездкам
        </Link>
      </section>
    </main>
  );
}
