import { AppTopbar, PageHeader } from "../../lib/components";
import { BackLink, Card } from "../../ui/components";
import { TelegramLogin } from "./telegram-login";

interface TelegramAuthPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function TelegramAuthPage({ searchParams }: TelegramAuthPageProps) {
  const query = await searchParams;
  const returnToValue = Array.isArray(query.returnTo) ? query.returnTo[0] : query.returnTo;
  const returnTo = returnToValue?.startsWith("/") && !returnToValue.startsWith("//")
    ? returnToValue
    : "/";

  return (
    <main className="shell narrow-shell">
      <AppTopbar />
      <BackLink href="/">
        На главную
      </BackLink>
      <PageHeader eyebrow="Telegram" title="Вход и привязка">
        <p>
          Подтвердите вход в защищённом окне Telegram. После авторизации вы вернётесь на сайт.
        </p>
      </PageHeader>

      <Card className="auth-card" padding="large">
        <h2 id="auth-title">Telegram-аккаунт</h2>
        <TelegramLogin
          botUsername={process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME}
          returnTo={returnTo}
        />
      </Card>
    </main>
  );
}
