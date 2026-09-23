import { Document, Page, Text, View } from "@react-pdf/renderer";
import type { CoverLetterContent } from "../contracts";
import { styles } from "./styles";

export interface LetterHeader {
  name: string;
  contact: string[];
  date: string;
}

/** One-page cover letter (DESIGN-DOCS.md): header, date, greeting, paragraphs, closing, name. */
export function CoverLetterPdf({
  content,
  header,
}: {
  content: CoverLetterContent;
  header: LetterHeader;
}) {
  return (
    <Document title={`${header.name} cover letter`} author={header.name}>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.name}>{header.name}</Text>
        {header.contact.length > 0 ? (
          <Text style={styles.contact}>{header.contact.join(" · ")}</Text>
        ) : null}
        <Text style={styles.letterMeta}>{header.date}</Text>
        <Text style={styles.letterMeta}>{content.greeting.replace(/,+$/, "")},</Text>
        <View style={styles.letterBody}>
          {content.paragraphs.map((p, i) => (
            <Text key={i} style={styles.letterParagraph}>
              {p.text}
            </Text>
          ))}
        </View>
        <Text style={styles.letterMeta}>{content.closing.replace(/,+$/, "")},</Text>
        <Text>{content.signature}</Text>
      </Page>
    </Document>
  );
}
