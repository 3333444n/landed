import { Document, Link, Page, Text, View } from "@react-pdf/renderer";
import { summaryHeading, type ResumeContent, type Snapshot, type ResumeEntry } from "../contracts";
import { resumeContacts } from "../contacts";
import { colors } from "./styles";
import { FormattedText } from "./FormattedText";
import { resumeStyles } from "./styles";

type Styles = ReturnType<typeof resumeStyles>;

/**
 * One-page resume (DESIGN-DOCS.md). Renders reviewed content only; never calls a model.
 * `spacing` scales the gaps between blocks so the page can be filled to its bottom margin.
 */
export function ResumePdf({
  content,
  spacing = 1,
  snapshot = null,
}: {
  content: ResumeContent;
  spacing?: number;
  snapshot?: Snapshot | null;
}) {
  const styles = resumeStyles(spacing);
  const contacts = resumeContacts(content, snapshot);
  return (
    <Document title={`${content.header.name} resume`} author={content.header.name}>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.name}>{content.header.name}</Text>
        {content.header.headline ? (
          <Text style={styles.headline}>
            <FormattedText
              content={content}
              path="header.headline"
              text={content.header.headline}
            />
          </Text>
        ) : null}
        {contacts.length > 0 ? (
          <Text style={styles.contact}>
            {contacts.map((contact, i) => (
              <Text key={i}>
                {i > 0 ? " · " : ""}
                {contact.href ? (
                  <Link
                    src={contact.href}
                    style={{ color: colors.link, textDecoration: "underline" }}
                  >
                    {contact.text}
                  </Link>
                ) : (
                  contact.text
                )}
              </Text>
            ))}
          </Text>
        ) : null}
        {content.summary ? (
          <View>
            <Text style={styles.sectionHeading}>{summaryHeading}</Text>
            <Text style={styles.summary}>
              <FormattedText content={content} path="summary" text={content.summary.text} />
            </Text>
          </View>
        ) : null}
        {content.sections.map((section, i) => (
          <View key={i}>
            <Text style={styles.sectionHeading}>{section.title}</Text>
            {section.kind === "skills"
              ? section.entries.map((entry, j) => (
                  <Text key={j} style={styles.skillsLine}>
                    <Text style={styles.bold}>
                      <FormattedText
                        content={content}
                        path={`sections.${i}.entries.${j}.heading`}
                        text={entry.heading}
                        bold
                      />
                      :{" "}
                    </Text>
                    <FormattedText
                      content={content}
                      path={`sections.${i}.entries.${j}.subheading`}
                      text={entry.subheading ?? ""}
                    />
                  </Text>
                ))
              : section.entries.map((entry, j) => (
                  <Entry
                    key={j}
                    entry={entry}
                    styles={styles}
                    content={content}
                    path={`sections.${i}.entries.${j}`}
                  />
                ))}
          </View>
        ))}
      </Page>
    </Document>
  );
}

function Entry({
  entry,
  styles,
  content,
  path,
}: {
  entry: ResumeEntry;
  styles: Styles;
  content: ResumeContent;
  path: string;
}) {
  return (
    <View style={styles.entry}>
      <View style={styles.entryRow}>
        <Text style={styles.entryHeading}>
          <FormattedText content={content} path={`${path}.heading`} text={entry.heading} bold />
        </Text>
        {entry.dateRange ? (
          <Text style={styles.entryDate}>
            <FormattedText
              content={content}
              path={`${path}.dateRange`}
              text={entry.dateRange}
              bold
            />
          </Text>
        ) : null}
      </View>
      {entry.subheading || entry.location ? (
        <View style={styles.entryRow}>
          <Text style={styles.entrySub}>
            <FormattedText
              content={content}
              path={`${path}.subheading`}
              text={entry.subheading ?? ""}
            />
          </Text>
          {entry.location ? (
            <Text style={styles.entryLocation}>
              <FormattedText content={content} path={`${path}.location`} text={entry.location} />
            </Text>
          ) : null}
        </View>
      ) : null}
      {entry.bullets.length > 0 ? (
        <View style={styles.bullets}>
          {entry.bullets.map((bullet, k) => (
            <View key={k} style={styles.bullet}>
              <Text style={styles.bulletMark}>•</Text>
              <Text style={styles.bulletText}>
                <FormattedText content={content} path={`${path}.bullets.${k}`} text={bullet.text} />
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
