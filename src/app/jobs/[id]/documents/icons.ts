import { FileUser, Mail, MessageSquareText, type LucideIcon } from "lucide-react";
import type { DocumentType } from "@/modules/documents";

/** One icon per document type for the Materials cards (DESIGN.md "Icon tile"). */
export const documentIcons: Record<DocumentType, LucideIcon> = {
  resume: FileUser,
  cover_letter: Mail,
  recruiter_message: MessageSquareText,
};
