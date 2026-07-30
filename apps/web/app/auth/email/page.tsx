import { AppTopbar, PageHeader } from "../../lib/components";
import { Card } from "../../ui/components";
import { EmailLogin } from "./email-login";
import styles from "./email.module.css";

interface EmailAuthPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function EmailAuthPage({ searchParams }: EmailAuthPageProps) {
  const query = await searchParams;
  const returnToValue = Array.isArray(query.returnTo) ? query.returnTo[0] : query.returnTo;
  const returnTo =
    returnToValue?.startsWith("/") && !returnToValue.startsWith("//") ? returnToValue : "/";

  return (
    <>
      <AppTopbar />

      <main className="shell app-content-shell narrow-shell">
        <PageHeader title="Вход по email">
          <p>Укажите адрес электронной почты, получите шестизначный код и вернитесь на сайт.</p>
        </PageHeader>

        <Card className={styles.card} padding="large">
          <EmailLogin returnTo={returnTo} />
        </Card>
      </main>
    </>
  );
}
