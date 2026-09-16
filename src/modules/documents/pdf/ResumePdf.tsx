import { Document, Page, Text, View } from "@react-pdf/renderer";
import { summaryHeading, type ResumeContent, type ResumeEntry } from "../contracts";
import { resumeStyles } from "./styles";

type Styles = ReturnType<typeof resumeStyles>;

/**
 * One-page resume (DESIGN-DOCS.md). Renders reviewed content only; never calls a model.
 * `spacing` scales the gaps between blocks so the page can be filled to its bottom margin.
 */
export function ResumePdf({ content, spacing = 1 }: { content: ResumeContent; spacing?: number }) {
  const styles = resumeStyles(spacing);
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
        {content.summary ? (
          <View>
            <Text style={styles.sectionHeading}>{summaryHeading}</Text>
            <Text style={styles.summary}>{content.summary.text}</Text>
          </View>
        ) : null}
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
              : section.entries.map((entry, j) => <Entry key={j} entry={entry} styles={styles} />)}
          </View>
        ))}
      </Page>
    </Document>
  );
}

function Entry({ entry, styles }: { entry: ResumeEntry; styles: Styles }) {
  return (
    <View style={styles.entry}>
      <View style={styles.entryRow}>
        <Text style={styles.entryHeading}>{entry.heading}</Text>
        {entry.dateRange ? <Text style={styles.entryDate}>{entry.dateRange}</Text> : null}
      </View>
      {entry.subheading || entry.location ? (
        <View style={styles.entryRow}>
          <Text style={styles.entrySub}>{entry.subheading ?? ""}</Text>
          {entry.location ? <Text style={styles.entryLocation}>{entry.location}</Text> : null}
        </View>
      ) : null}
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
