import Link from "next/link";
import type { ReactNode } from "react";
import type { Entry } from "@/lib/site";

export function PageHeader({ title, lead }: { title: string; lead: string }) {
  return (
    <header>
      <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">
        {title}
      </h1>
      <p className="mt-3 text-lg text-neutral-600 dark:text-neutral-400">
        {lead}
      </p>
    </header>
  );
}

/** Anchor id for a heading, so the nav and cross-links can point at sections. */
function slug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-12">
      <h2
        id={slug(title)}
        className="scroll-mt-8 text-xl font-bold text-neutral-900 dark:text-neutral-50"
      >
        {title}
      </h2>
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </section>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 text-neutral-600 dark:text-neutral-400 [&_a]:font-medium [&_a]:text-indigo-600 [&_a]:underline-offset-2 [&_a:hover]:underline dark:[&_a]:text-indigo-400 [&_code]:rounded [&_code]:bg-neutral-200 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em] [&_code]:text-neutral-800 dark:[&_code]:bg-neutral-800 dark:[&_code]:text-neutral-200 [&_li]:mt-1.5 [&_strong]:font-semibold [&_strong]:text-neutral-800 dark:[&_strong]:text-neutral-200 [&_ul]:list-disc [&_ul]:pl-5">
      {children}
    </div>
  );
}

export function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
      <table className="w-full min-w-[38rem] border-collapse text-left text-sm">
        <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400">
          <tr>
            {head.map((cell) => (
              <th key={cell} className="px-3 py-2 font-semibold">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className="border-t border-neutral-100 align-top dark:border-neutral-800"
            >
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="px-3 py-2 text-neutral-600 dark:text-neutral-400"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const CALLOUT_TONES = {
  note: "border-indigo-300 bg-indigo-50 text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-200",
  warn: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200",
};

export function Callout({
  tone,
  title,
  children,
}: {
  tone: "note" | "warn";
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${CALLOUT_TONES[tone]}`}>
      {title ? <div className="mb-1 font-semibold">{title}</div> : null}
      {children}
    </div>
  );
}

export function NextLinks({ entries }: { entries: Entry[] }) {
  return (
    <section className="mt-14 border-t border-neutral-200 pt-8 dark:border-neutral-800">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        Keep reading
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {entries.map((entry) => (
          <Link
            key={entry.href}
            href={entry.href}
            className="group rounded-xl border border-neutral-200 bg-white p-5 transition hover:border-indigo-400 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-indigo-600"
          >
            <h3 className="font-semibold text-neutral-900 group-hover:text-indigo-700 dark:text-neutral-100 dark:group-hover:text-indigo-300">
              {entry.title}
            </h3>
            <p className="mt-1.5 text-sm text-neutral-600 dark:text-neutral-400">
              {entry.blurb}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
