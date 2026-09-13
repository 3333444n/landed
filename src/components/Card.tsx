import type { ReactNode } from "react";
import styles from "./Card.module.css";

export function Card({
  title,
  subtitle,
  children,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.card}>
      {title ? (
        <div className={styles.header}>
          <h2 className="title-md">{title}</h2>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
