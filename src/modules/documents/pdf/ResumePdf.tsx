import { Document, Page, Text, View } from "@react-pdf/renderer";
import type { ResumeContent, ResumeEntry } from "../contracts";
import { styles } from "./styles";

/** One-page resume (DESIGN-DOCS.md). Renders reviewed content only; never calls a model. */
export function ResumePdf({ content }: { content: ResumeContent }) {
  return (
    <Document title={`${content.header.name} resume`} author={content.header.name}>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.name}>{content.header.name}</Text>
        {content.header.headline ? (
          <Text style={styles.headline}>{content.header.headline}</Text>
        ) : null}
        {content.header.contact.length > 0 ? (
          <Text style={styles.contact}>{content.header.contact.join(" · ")}</Text>
        ) : null}
        {content.summary ? <Text style={styles.summary}>{content.summary.text}</Text> : null}
        {content.sections.map((section, i) => (
          <View key={i}>
            <Text style={styles.sectionHeading}>{section.title}</Text>
            {section.kind === "skills"
              ? section.entries.map((entry, j) => (
                  <Text key={j} style={styles.skillsLine}>
                    <Text style={styles.bold}>{entry.heading}: </Text>
                    {entry.subheading ?? ""}
                  </Text>
                ))
              : section.entries.map((entry, j) => <Entry key={j} entry={entry} />)}
          </View>
        ))}
      </Page>
    </Document>
  );
}

function Entry({ entry }: { entry: ResumeEntry }) {
  return (
    <View style={styles.entry}>
      <View style={styles.entryRow}>
        <Text style={styles.entryHeading}>{entry.heading}</Text>
        {entry.dateRange ? <Text style={styles.entryDate}>{entry.dateRange}</Text> : null}
      </View>
      {entry.subheading ? <Text style={styles.entrySub}>{entry.subheading}</Text> : null}
      {entry.bullets.length > 0 ? (
        <View style={styles.bullets}>
          {entry.bullets.map((bullet, k) => (
            <View key={k} style={styles.bullet}>
              <Text style={styles.bulletMark}>•</Text>
              <Text style={styles.bulletText}>{bullet.text}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
