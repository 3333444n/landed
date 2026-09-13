import { useId, type ReactNode } from "react";
import styles from "./Page.module.css";

export function Page({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main className={styles.main}>
      <div className={styles.section}>
        <h1 className="title-xl">{title}</h1>
        {subtitle ? <p className="text-secondary">{subtitle}</p> : null}
      </div>
      {children}
    </main>
  );
}

/** A titled section is a landmark region named by its heading, so tests and screen readers can address it. */
export function Section({ title, children }: { title?: string; children: ReactNode }) {
  const headingId = useId();
  return (
    <section className={styles.section} aria-labelledby={title ? headingId : undefined}>
      {title ? (
        <h2 id={headingId} className="title-lg">
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}

/** Empty state per DESIGN.md: one sentence, no illustration. The primary action sits in the form above. */
export function EmptyState({ children }: { children: string }) {
  return <p className="text-secondary">{children}</p>;
}

export { styles as pageStyles };
