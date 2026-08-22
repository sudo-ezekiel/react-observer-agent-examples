import type { ReactNode } from "react";
import { CodeBlock } from "./CodeBlock";
import { PageHeader } from "./doc";

export function ExampleShell({
  title,
  lead,
  children,
  source,
  notes,
}: {
  title: string;
  lead: string;
  children: ReactNode;
  source: string;
  notes?: ReactNode;
}) {
  return (
    <article className="w-full">
      <PageHeader title={title} lead={lead} />

      <div className="mt-8">{children}</div>

      <h2 className="mb-3 mt-10 text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        Source
      </h2>
      <CodeBlock code={source} lang="tsx" />

      {notes ? <div className="mt-10 flex flex-col gap-4">{notes}</div> : null}
    </article>
  );
}
