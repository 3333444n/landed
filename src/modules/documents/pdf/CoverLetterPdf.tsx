import { Document, Link, Page, Text, View } from "@react-pdf/renderer";
import type { CoverLetterContent } from "../contracts";
import { type LetterHeader, type LetterLink } from "../presentation";
import { FormattedText } from "./FormattedText";
import { styles } from "./styles";
import { textWidth } from "../helvetica";

/** Monochrome letterhead and single-column body, using only saved content and context. */
export function CoverLetterPdf({
  content,
  header,
}: {
  content: CoverLetterContent;
  header: LetterHeader;
}) {
  const title = content.title === undefined ? header.title : content.title;
  return (
    <Document title={`${header.name} cover letter`} author={header.name}>
      <Page size="LETTER" style={styles.letterPage}>
        <View style={styles.letterhead} wrap={false}>
          <View style={styles.letterIdentity}>
            <Text style={styles.letterName}>{header.nameLines.join("\n")}</Text>
            {title ? (
              <Text style={styles.letterTitle}>
                <FormattedText content={content} path="title" text={title} />
              </Text>
            ) : null}
          </View>
          {header.topContact.length > 0 ? (
            <View style={styles.letterLinks}>
              {header.topContact.map((link, i) => (
                <ContactLink key={i} link={link} />
              ))}
            </View>
          ) : null}
        </View>
        <View style={styles.letterRecipient} wrap={false}>
          <View style={styles.letterTo}>
            {header.company ? <Text style={styles.letterStrong}>{header.company}</Text> : null}
            {header.role ? (
              <Text style={styles.letterReference}>
                Job reference: <Text style={styles.letterRole}>{header.role}</Text>
              </Text>
            ) : null}
          </View>
          <Text style={styles.letterDate}>{header.date}</Text>
        </View>
        <View style={styles.letterContent}>
          <Text style={styles.letterGreeting}>
            <FormattedText content={content} path="greeting" text={content.greeting} salutation />
          </Text>
          {content.paragraphs.map((p, i) => (
            <Text key={i} style={styles.letterParagraph} orphans={3} widows={3}>
              <FormattedText content={content} path={`paragraphs.${i}`} text={p.text} />
            </Text>
          ))}
          <View style={styles.letterSignature} wrap={false}>
            <Text>
              <FormattedText content={content} path="closing" text={content.closing} salutation />
            </Text>
            <Text style={styles.letterSignatureName}>
              <FormattedText content={content} path="signature" text={content.signature} bold />
            </Text>
          </View>
        </View>
        {header.locationLines.length > 0 || header.footerLinks.length > 0 ? (
          <View style={styles.letterFooter}>
            <View style={styles.letterFooterColumn}>
              {header.locationLines.map((line, i) => (
                <Text key={i} style={styles.letterStrong}>
                  {line}
                </Text>
              ))}
            </View>
            <View style={styles.letterFooterColumn}>
              {header.footerLinks.map((link, i) => (
                <ContactLink key={i} link={link} />
              ))}
            </View>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}

/** Break unusually long contact words inside their column, keeping the link destination intact. */
function ContactLink({ link }: { link: LetterLink }) {
  return (
    <Text
      style={link.strong ? styles.letterStrong : undefined}
      hyphenationCallback={(word) =>
        textWidth(word, 12, "bold") > 210 ? (word.match(/.{1,16}/gu) ?? [word]) : [word]
      }
    >
      {link.href ? (
        <Link src={link.href} style={styles.letterLink}>
          {link.text}
        </Link>
      ) : (
        link.text
      )}
    </Text>
  );
}
