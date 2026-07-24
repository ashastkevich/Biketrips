import { AppTopbar, PageHeader } from "../../lib/components";
import { BackLink, Card } from "../../ui/components";
import { EmailLogin } from "./email-login";
import styles from "./email.module.css";

interface EmailAuthPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function EmailAuthPage({ searchParams }: EmailAuthPageProps) {
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
      <PageHeader eyebrow="Почта" title="Вход по коду">
        <p>
          Укажите адрес электронной почты, получите шестизначный код и вернитесь на сайт.
        </p>
      </PageHeader>

      <Card className={styles.card} padding="large">
        <h2 id="auth-title">Email-аккаунт</h2>
        <EmailLogin returnTo={returnTo} />
      </Card>
    </main>
  );
}
