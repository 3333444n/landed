import { ChevronDown, Pencil } from "lucide-react";
import type { ReactNode } from "react";
import { IconTile } from "./IconTile";
import { RoundLink } from "./RoundLink";
import styles from "./ExpandableCard.module.css";

/** Native disclosure and a separate edit link: navigation never toggles the disclosure. */
export function ExpandableCard({
  title,
  subtitle,
  icon,
  editHref,
  editLabel,
  nested = false,
  titleStyle = "heading",
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  editHref?: string;
  editLabel?: string;
  nested?: boolean;
  titleStyle?: "heading" | "body";
  children: ReactNode;
}) {
  return (
    <div className={`${styles.card} ${nested ? styles.nested : ""}`}>
      <details className={styles.disclosure}>
        <summary className={styles.summary}>
          {icon ? <IconTile>{icon}</IconTile> : null}
          <span className={styles.heading}>
            <span
              role="heading"
              aria-level={3}
              className={titleStyle === "body" ? styles.bodyTitle : "title-md"}
            >
              {title}
            </span>
            {subtitle ? <span className={styles.subtitle}>{subtitle}</span> : null}
          </span>
          <ChevronDown className={styles.chevron} aria-hidden="true" />
        </summary>
        <div className={styles.content}>{children}</div>
      </details>
      {editHref ? (
        <div className={styles.edit}>
          <RoundLink href={editHref} label={editLabel ?? `Edit ${title}`}>
            <Pencil />
          </RoundLink>
        </div>
      ) : null}
    </div>
  );
}
