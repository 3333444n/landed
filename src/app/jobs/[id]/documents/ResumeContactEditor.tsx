"use client";
import { useActionState, useState } from "react";
import { ContactSelection } from "@/components/ContactSelection";
import { Button } from "@/components/Button";
import { idleState, type ActionState } from "@/app/form-state";
import type { ResumeContent, Snapshot } from "@/modules/documents/contracts";
import {
  availableResumeContacts,
  resumeContacts,
  selectedResumeContacts,
  resumeContactSelection,
  type ContactId,
} from "@/modules/documents/contacts";
import styles from "@/components/forms.module.css";
import documentStyles from "./documents.module.css";
export function ResumeContactEditor({
  content,
  snapshot,
  profileDefault,
  revisionId,
  action,
  open,
  onOpen,
  onClose,
}: {
  content: ResumeContent;
  snapshot: Snapshot | null;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  profileDefault: ContactId[];
  revisionId: string;
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [selection, setSelection] = useState(() => resumeContactSelection(content, snapshot));
  const [state, formAction, pending] = useActionState(action, idleState);
  const contacts = resumeContacts(content, snapshot);
  if (!open || !snapshot)
    return (
      <div className={`${documentStyles.unit} ${documentStyles.contact}`}>
        <button
          type="button"
          aria-label="Resume contact row"
          title="Edit contact details"
          className={`${documentStyles.unitText} ${documentStyles.fieldText} ${!contacts.length ? documentStyles.emptyField : ""}`}
          disabled={!snapshot}
          onClick={() => {
            setSelection(resumeContactSelection(content, snapshot));
            onOpen();
          }}
        >
          {contacts.length
            ? contacts.map((item, index) => (
                <span key={index}>
                  {index > 0 ? " · " : null}
                  <span className={item.href ? documentStyles.contactLink : undefined}>
                    {item.text}
                  </span>
                </span>
              ))
            : "Add contact details"}
        </button>
      </div>
    );
  const labels = Object.fromEntries(
    availableResumeContacts(snapshot).map((item) => [item.id, item.text]),
  );
  return (
    <form action={formAction} className={styles.form}>
      <input type="hidden" name="expectedRevisionId" value={revisionId} />
      <input type="hidden" name="selection" value={selection.join(",")} />
      <p className={documentStyles.contact} aria-label="Contact links">
        {selectedResumeContacts(snapshot, selection).map((item, index) => (
          <span key={item.id}>
            {index > 0 ? " · " : null}
            {item.href ? (
              <a href={item.href} target="_blank" rel="noopener noreferrer">
                {item.text}
              </a>
            ) : (
              item.text
            )}
          </span>
        ))}
      </p>
      <ContactSelection
        value={selection}
        onChange={setSelection}
        labels={labels}
        disabled={pending}
      />
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        onClick={() => setSelection([...profileDefault])}
      >
        Apply profile default
      </Button>
      {state.status === "error" ? (
        <p role="alert">{Object.values(state.fieldErrors).flat().join(" ")}</p>
      ) : null}
      <div className={styles.actions}>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving" : "Save contact row"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => {
            setSelection(resumeContactSelection(content, snapshot));
            onClose();
          }}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
