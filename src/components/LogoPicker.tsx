"use client";

import { ImagePlus, Link, Plus } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { LogoImage } from "@/app/jobs/LogoImage";
import styles from "./LogoPicker.module.css";

const accept = "image/png,image/jpeg,image/webp,image/svg+xml";

/**
 * The icon tile of a job form as a control (DESIGN.md "Icon tile button"): it opens a small menu
 * to choose an image file, paste an image address or remove the logo. Its inputs sit outside the
 * form element and join the submission through the `form` attribute, so the Server Action
 * receives the file with the rest of the paste.
 */
export function LogoPicker({ formId, current }: { formId: string; current: string | null }) {
  const [open, setOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [removed, setRemoved] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const addressInput = useRef<HTMLInputElement>(null);
  const menuId = useId();
  const addressId = useId();

  const shown = preview ?? (removed ? null : current);
  const hasLogo = !!shown || (!!address && !removed);
  const name = hasLogo ? "Change logo" : "Add logo";

  useEffect(() => {
    if (!open && !addressOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) {
        setOpen(false);
        setAddressOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, addressOpen]);

  useEffect(() => {
    if (addressOpen) addressInput.current?.focus();
  }, [addressOpen]);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setAddressOpen(false);
      close();
    }
  };

  const chooseFile = () => {
    setOpen(false);
    file.current?.click();
  };

  const onFileChange = () => {
    const chosen = file.current?.files?.[0];
    if (!chosen) return;
    setPreview(URL.createObjectURL(chosen));
    setRemoved(false);
    setAddress("");
  };

  const remove = () => {
    if (file.current) file.current.value = "";
    setPreview(null);
    setAddress("");
    setRemoved(true);
    close();
  };

  return (
    <div className={styles.root} ref={root} onKeyDown={onKeyDown}>
      <button
        ref={trigger}
        type="button"
        className={styles.tile}
        aria-label={name}
        title={name}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => {
          setAddressOpen(false);
          setOpen((value) => !value);
        }}
      >
        {shown ? (
          <LogoImage src={shown} />
        ) : address && !removed ? (
          <Link aria-hidden="true" focusable="false" />
        ) : current ? (
          <ImagePlus aria-hidden="true" focusable="false" />
        ) : (
          <Plus aria-hidden="true" focusable="false" />
        )}
      </button>
      <input
        ref={file}
        type="file"
        name="logoFile"
        accept={accept}
        form={formId}
        className={styles.hidden}
        tabIndex={-1}
        aria-label="Logo file"
        onChange={onFileChange}
      />
      {removed ? <input type="hidden" name="removeLogo" value="on" form={formId} /> : null}
      {open ? (
        <div id={menuId} role="menu" aria-label={name} className={styles.menu}>
          <button type="button" role="menuitem" className={styles.item} onClick={chooseFile}>
            Choose an image
          </button>
          <button
            type="button"
            role="menuitem"
            className={styles.item}
            onClick={() => {
              setOpen(false);
              setAddressOpen(true);
            }}
          >
            Paste an image address
          </button>
          {hasLogo ? (
            <button type="button" role="menuitem" className={styles.item} onClick={remove}>
              Remove logo
            </button>
          ) : null}
        </div>
      ) : null}
      <div className={styles.panel} hidden={!addressOpen}>
        <label className={styles.label} htmlFor={addressId}>
          Image address
        </label>
        <input
          ref={addressInput}
          id={addressId}
          type="url"
          inputMode="url"
          name="logoUrl"
          form={formId}
          placeholder="https://"
          className={styles.input}
          value={address}
          onChange={(event) => {
            setAddress(event.target.value);
            if (event.target.value) setRemoved(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              setAddressOpen(false);
              trigger.current?.focus();
            }
          }}
        />
        <p className={styles.helper}>
          Up to 1 MB. The image is copied once when you save and kept with the job.
        </p>
      </div>
    </div>
  );
}
