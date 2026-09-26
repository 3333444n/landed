import { Text } from "@react-pdf/renderer";
import type { DocumentContent } from "../contracts";
import { formattingSegments, salutationFormattingSegments } from "../formatting";

export function FormattedText({
  content,
  path,
  text,
  bold = false,
  italic = false,
  salutation = false,
}: {
  content: DocumentContent;
  path: string;
  text: string;
  bold?: boolean;
  italic?: boolean;
  salutation?: boolean;
}) {
  return (
    salutation
      ? salutationFormattingSegments(content, path, text)
      : formattingSegments(content, path, text)
  ).map((segment, i) => {
    const isBold = bold || segment.marks.includes("bold");
    const isItalic = italic || segment.marks.includes("italic");
    return (
      <Text
        key={i}
        style={{
          fontFamily: isBold
            ? isItalic
              ? "Helvetica-BoldOblique"
              : "Helvetica-Bold"
            : isItalic
              ? "Helvetica-Oblique"
              : "Helvetica",
          textDecoration: segment.marks.includes("underline") ? "underline" : "none",
        }}
      >
        {segment.text}
      </Text>
    );
  });
}
