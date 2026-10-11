import { Brand } from "./components";
import shellStyles from "./app-shell.module.css";
import styles from "./page-skeleton.module.css";

type PageSkeletonVariant = "page" | "trip" | "profile";

// Shown by loading.tsx while a dynamic page renders on the server, so navigation responds instantly.
// The top bar only shows the brand: the session state is not known until the page itself renders.
export function PageSkeleton({ variant = "page" }: { variant?: PageSkeletonVariant }) {
  return (
    <>
      <header className={`${shellStyles.header} ${shellStyles.appHeader}`}>
        <div className={`page ${shellStyles.inner} ${shellStyles.elevatedInner} ${shellStyles.appInner}`}>
          <Brand />
          <span className={`${styles.block} ${styles.navAction}`} />
        </div>
      </header>

      <main className="shell app-content-shell" aria-busy="true">
        <p className={styles.srOnly} role="status">
          Загрузка…
        </p>
        {variant === "trip" ? <TripSkeleton /> : null}
        {variant === "profile" ? <ProfileSkeleton /> : null}
        {variant === "page" ? <GenericSkeleton /> : null}
      </main>
    </>
  );
}

function TripSkeleton() {
  return (
    <div className={styles.card}>
      <div className={`${styles.block} ${styles.hero}`} />
      <div className={styles.cardBody}>
        <div className={styles.facts}>
          {Array.from({ length: 6 }, (_, index) => (
            <div className={styles.fact} key={index}>
              <span className={`${styles.block} ${styles.lineShort}`} />
              <span className={`${styles.block} ${styles.line}`} />
            </div>
          ))}
        </div>
        <TextLines count={3} />
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className={styles.columns}>
      <div className={styles.panel}>
        <span className={`${styles.block} ${styles.avatar}`} />
        <span className={`${styles.block} ${styles.title}`} />
        <TextLines count={3} />
      </div>
      <div className={styles.panel}>
        <span className={`${styles.block} ${styles.title}`} />
        {Array.from({ length: 3 }, (_, index) => (
          <span className={`${styles.block} ${styles.row}`} key={index} />
        ))}
      </div>
    </div>
  );
}

function GenericSkeleton() {
  return (
    <div className={styles.panel}>
      <span className={`${styles.block} ${styles.title}`} />
      <TextLines count={4} />
      <span className={`${styles.block} ${styles.row}`} />
    </div>
  );
}

function TextLines({ count }: { count: number }) {
  return (
    <div className={styles.lines}>
      {Array.from({ length: count }, (_, index) => (
        <span className={`${styles.block} ${styles.line}`} key={index} />
      ))}
    </div>
  );
}
