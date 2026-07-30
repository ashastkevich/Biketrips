import { AppTopbar, PageHeader } from "../../lib/components";
import { Card } from "../../ui/components";
import { TelegramLogin } from "./telegram-login";
import styles from "./telegram.module.css";

interface TelegramAuthPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function TelegramAuthPage({ searchParams }: TelegramAuthPageProps) {
  const query = await searchParams;
  const returnToValue = Array.isArray(query.returnTo) ? query.returnTo[0] : query.returnTo;
  const returnTo =
    returnToValue?.startsWith("/") && !returnToValue.startsWith("//") ? returnToValue : "/";

  return (
    <>
      <AppTopbar />

      <main className="shell app-content-shell narrow-shell">
        <PageHeader title="Вход через Telegram" />

        <Card className={styles.card} padding="large">
          <h2 id="auth-title">Telegram-аккаунт</h2>
          <TelegramLogin returnTo={returnTo} />
        </Card>
      </main>
    </>
  );
}
