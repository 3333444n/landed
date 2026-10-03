import type { Metadata } from "next";
import Script from "next/script";
import { Shell } from "@/components/Shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Landed",
  description: "Locally run job-search application.",
};

/*
 * Applies the saved theme and palette before the first paint; ThemeToggle keeps the theme in
 * sync afterwards. `?palette=<name>` in the address picks a palette from palettes.css and
 * remembers it (`?palette=` clears it), so a palette can be tried without a build.
 */
const themeScript = `try{var d=document.documentElement,s=localStorage,q=new URLSearchParams(location.search);var t=s.getItem("landed-theme");if(t==="light"||t==="dark")d.dataset.theme=t;if(q.has("palette")){var p=q.get("palette");if(p)s.setItem("landed-palette",p);else s.removeItem("landed-palette")}var c=s.getItem("landed-palette");if(c)d.dataset.palette=c}catch(e){}`;

// In the desktop app the page draws under the title bar on macOS and Windows (globals.css).
const desktop =
  process.env.LANDED_DESKTOP === "1"
    ? { darwin: "mac", win32: "windows" }[process.platform as string]
    : undefined;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-desktop={desktop} suppressHydrationWarning>
      <head>
        <Script id="landed-theme" strategy="beforeInteractive">
          {themeScript}
        </Script>
      </head>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
