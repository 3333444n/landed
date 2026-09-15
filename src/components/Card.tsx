import type { ReactNode } from "react";
import { IconTile } from "./IconTile";
import { LinkCard } from "./LinkCard";
import styles from "./Card.module.css";

/**
 * An opaque surface (DESIGN.md). With `href` the whole card is one link that opens the next
 * column and shows as selected while its route is open.
 */
export function Card({
  icon,
  title,
  subtitle,
  meta = [],
  chips,
  href,
  children,
}: {
  /** A meaningful icon shown in a tile at the left of the header (DESIGN.md "Icon tile"). */
  icon?: ReactNode;
  title?: string;
  subtitle?: string;
  /** Short metadata lines in `body.sm`, shown under the subtitle. */
  meta?: string[];
  chips?: ReactNode;
  href?: string;
  children?: ReactNode;
}) {
  const content = (
    <>
      {title ? (
        <div className={styles.header}>
          <h3 className="title-md">{title}</h3>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        </div>
      ) : null}
      {meta.map((line) => (
        <p key={line} className={styles.meta}>
          {line}
        </p>
      ))}
      {chips ? <div className={styles.chips}>{chips}</div> : null}
      {children}
    </>
  );
  const body = icon ? (
    <div className={styles.row}>
      <IconTile>{icon}</IconTile>
      <div className={styles.body}>{content}</div>
    </div>
  ) : (
    content
  );
  if (href) return <LinkCard href={href}>{body}</LinkCard>;
  return <section className={styles.card}>{body}</section>;
}

/** A vertical list of cards named for assistive technology and tests. */
export function CardList({ label, children }: { label: string; children: ReactNode }) {
  return (
    <ul className={styles.list} aria-label={label}>
      {children}
    </ul>
  );
}
