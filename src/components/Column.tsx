import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useId, type ReactNode } from "react";
import styles from "./Column.module.css";

/**
 * One titled region of canvas (DESIGN.md "Layout"). Layouts render a Column followed by their
 * children so columns end up as siblings inside the Columns shell; CSS decides how many of the
 * last ones are visible. The back link is rendered on every non-root column and hidden by CSS
 * wherever the parent column is visible.
 */
export function Column({
  title,
  count,
  subtitle,
  parentHref,
  parentTitle,
  toolbar,
  width = "list",
  children,
}: {
  title: string;
  count?: number;
  subtitle?: string;
  parentHref?: string;
  parentTitle?: string;
  toolbar?: ReactNode;
  width?: "list" | "detail";
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <section className={`${styles.column} ${styles[width]}`} aria-labelledby={headingId}>
      <div className={styles.inner}>
        {parentHref && parentTitle ? (
          <Link
            href={parentHref}
            className={styles.back}
            aria-label={parentTitle}
            title={parentTitle}
          >
            <ArrowLeft aria-hidden="true" focusable="false" />
          </Link>
        ) : null}
        <div className={styles.header}>
          <h2 id={headingId} className={`title-lg ${styles.title}`}>
            {title}
            {count !== undefined ? <span className={styles.count}> {count}</span> : null}
          </h2>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        </div>
        {toolbar}
        {children}
      </div>
    </section>
  );
}

/** Shown next to a list or hub when nothing in it is selected; absent below 768px. */
export function PlaceholderColumn({ label = "Nothing selected" }: { label?: string }) {
  return (
    <section
      className={`${styles.column} ${styles.detail} ${styles.placeholder}`}
      aria-label={label}
    >
      <div className={styles.inner}>
        <p className="text-secondary">Select something on the left</p>
      </div>
    </section>
  );
}

/** One sentence in `text.secondary` (DESIGN.md "Empty states"). */
export function EmptyState({ children }: { children: string }) {
  return <p className="text-secondary">{children}</p>;
}
