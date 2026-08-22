import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Nav, MobileNav } from "@/components/Nav";

export const metadata: Metadata = {
  metadataBase: new URL("https://reactobserveragent.sudo-ezekiel.com"),
  title: {
    default: "React Observer Agent",
    template: "%s | React Observer Agent",
  },
  description:
    "Documentation and runnable examples for react-observer-agent: let an LLM agent observe React state and run pre-defined actions behind permission boundaries.",
  openGraph: {
    title: "React Observer Agent",
    description:
      "Documentation and runnable examples for giving an LLM agent scoped access to a live React app.",
    url: "https://reactobserveragent.sudo-ezekiel.com",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 md:flex-row md:py-12">
          <aside className="shrink-0 md:sticky md:top-12 md:h-fit md:w-56">
            <Link href="/" className="mb-6 block">
              <span className="text-lg font-bold text-neutral-900 dark:text-neutral-50">
                Observer Agent
              </span>
              <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">
                Docs and runnable examples
              </span>
            </Link>

            <div className="hidden md:block">
              <Nav />
            </div>
            <div className="md:hidden">
              <MobileNav />
            </div>

            <div className="mt-6 hidden flex-col gap-1 border-t border-neutral-200 pt-4 text-sm md:flex dark:border-neutral-800">
              <a
                href="https://github.com/sudo-ezekiel/react-observer-agent"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1 text-neutral-500 transition hover:text-indigo-600 dark:text-neutral-400 dark:hover:text-indigo-400"
              >
                GitHub
              </a>
              <a
                href="https://www.npmjs.com/package/react-observer-agent"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1 text-neutral-500 transition hover:text-indigo-600 dark:text-neutral-400 dark:hover:text-indigo-400"
              >
                npm
              </a>
            </div>
          </aside>

          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
