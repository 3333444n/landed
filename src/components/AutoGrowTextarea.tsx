"use client";

import { useCallback, useLayoutEffect, useRef, type ComponentProps } from "react";

/**
 * A textarea whose height follows its content, so long text never scrolls inside a short box.
 * `rows` stays the minimum. The CSS `field-sizing: content` does the same where supported; this
 * covers the rest and the initial value.
 */
export function AutoGrowTextarea(props: ComponentProps<"textarea">) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fit = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);
  useLayoutEffect(fit, [fit, props.value, props.defaultValue]);
  return (
    <textarea
      {...props}
      ref={ref}
      onInput={(event) => {
        fit();
        props.onInput?.(event);
      }}
    />
  );
}
