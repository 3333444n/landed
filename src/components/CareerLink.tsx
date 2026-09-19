"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ComponentProps } from "react";
import { careerFilterQuery, withCareerFilters } from "@/app/about/filter-query";

/** Career browsing state follows edit, add, manage and back links. Other routes are unchanged. */
export function CareerLink({
  href,
  ...props
}: Omit<ComponentProps<typeof Link>, "href"> & { href: string }) {
  const search = useSearchParams();
  return <Link {...props} href={withCareerFilters(href, careerFilterQuery(search))} />;
}
export function CareerFilterFields() {
  const search = useSearchParams();
  return <input type="hidden" name="_careerFilters" value={careerFilterQuery(search)} />;
}
