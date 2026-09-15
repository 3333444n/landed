// The rules file is browser-safe; the module index would pull the service and the database in.
import type { WordCloudItem } from "@/modules/jobs/rules";
import { Card } from "./Card";
import styles from "./WordCloud.module.css";

/**
 * The posting's most frequent words, bigger the more often they appear and centered so the
 * biggest sit in the middle; a word that is one of the profile's skills is tinted (DESIGN.md
 * "Word cloud"). Plain data in; nothing here calls a module.
 */
export function WordCloud({
  items,
  variant = "card",
}: {
  items: WordCloudItem[];
  /** `card` on the job column; `inline` under a form field, with a label instead of a card. */
  variant?: "card" | "inline";
}) {
  if (items.length < 3) return null;
  const list = (
    <ul className={styles.cloud} aria-label="Frequent words">
      {items.map((item) => (
        <li
          key={item.word}
          className={`${styles.word} ${styles[`step${item.step}`]} ${item.matched ? styles.matched : ""}`}
        >
          {item.word}
          <span
            className={styles.hidden}
          >{`, ${item.count} ${item.count === 1 ? "time" : "times"}${item.matched ? ", in your skills" : ""}`}</span>
        </li>
      ))}
    </ul>
  );
  if (variant === "inline") {
    return (
      <div className={styles.inline}>
        <p className={styles.label}>Frequent words</p>
        {list}
        <p className={styles.helper}>Bigger means more often. Tinted words are in your skills.</p>
      </div>
    );
  }
  return (
    <Card
      title="Frequent words"
      subtitle="Bigger means more often. Tinted words are in your skills."
    >
      {list}
    </Card>
  );
}
