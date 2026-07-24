import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AppTopbar } from "../../lib/components";
import { legalDocuments, legalLinks } from "../legal-documents";
import styles from "./legal.module.css";

interface LegalPageProps {
  params: Promise<{ slug: string }>;
}

function getLegalDocument(slug: string) {
  return legalDocuments.find((document) => document.slug === slug);
}

export function generateStaticParams() {
  return legalDocuments.map((document) => ({ slug: document.slug }));
}

export async function generateMetadata({ params }: LegalPageProps): Promise<Metadata> {
  const { slug } = await params;
  const document = getLegalDocument(slug);

  if (!document) {
    return {
      title: "Документ не найден - BikeTrips",
    };
  }

  return {
    title: `${document.title} - BikeTrips`,
    description: document.description,
  };
}

export default async function LegalPage({ params }: LegalPageProps) {
  const { slug } = await params;
  const document = getLegalDocument(slug);

  if (!document) {
    notFound();
  }

  return (
    <main className={`shell ${styles.shell}`}>
      <AppTopbar />

      <article className={styles.document}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Юридические документы</p>
          <h1>{document.title}</h1>
          <p>{document.description}</p>
          <dl className={styles.meta}>
            <div>
              <dt>Дата редакции</dt>
              <dd>{document.effectiveDate}</dd>
            </div>
            <div>
              <dt>Сервис</dt>
              <dd>BikeTrips</dd>
            </div>
          </dl>
        </header>

        <div className={styles.content}>
          {document.sections.map((section) => (
            <section className={styles.section} key={section.title}>
              <h2>{section.title}</h2>
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.items ? (
                <ul>
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      </article>

      <nav className={styles.related} aria-label="Другие юридические документы">
        {legalLinks.map((link) => (
          <a
            aria-current={link.href.endsWith(`/${document.slug}`) ? "page" : undefined}
            href={link.href}
            key={link.href}
          >
            {link.label}
          </a>
        ))}
      </nav>
    </main>
  );
}
