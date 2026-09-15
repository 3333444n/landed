/*
 * The icon on a job card follows its derived status chip (docs/05). Keyed by the chip's label,
 * as the filter rule is, so the rule module stays free of presentation.
 */
import {
  Circle,
  CircleCheck,
  CircleX,
  ClipboardCheck,
  Eye,
  FilePen,
  Handshake,
  MessagesSquare,
  ScanSearch,
  Send,
  Sparkles,
  TriangleAlert,
  Trophy,
  Undo2,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import type { ChipTone, StatusChip } from "@/modules/applications/contracts";

export const statusIcons: Record<string, LucideIcon> = {
  New: Sparkles,
  Evaluating: ScanSearch,
  Assessed: ClipboardCheck,
  Preparing: FilePen,
  "Crafting documents": Wand2,
  "Needs review": Eye,
  Ready: CircleCheck,
  Applied: Send,
  Interviewing: MessagesSquare,
  Offer: Handshake,
  Accepted: Trophy,
  Rejected: CircleX,
  Withdrawn: Undo2,
};

const toneFallback: Record<ChipTone, LucideIcon> = {
  accent: Sparkles,
  success: CircleCheck,
  warning: TriangleAlert,
  neutral: Circle,
};

/** The icon for a chip; a label without an entry falls back to its tone. */
export function statusIcon(chip: StatusChip): LucideIcon {
  return statusIcons[chip.label] ?? toneFallback[chip.tone];
}
