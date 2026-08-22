"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { sections } from "@/lib/site";

const TOP_LEVEL = [{ href: "/", label: "Overview" }];

/**
 * trailingSlash: true means usePathname reports "/adapters/", while the
 * registry stores "/adapters". Compare both without the slash.
 */
function normalize(path: string) {
  return path !== "/" && path.endsWith("/") ? path.slice(0, -1) : path;
}

function linkClass(active: boolean) {
  return `rounded-md px-3 py-2 text-sm transition ${
    active
      ? "bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
      : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
  }`;
}

/** Horizontally scrolling nav shown instead of the sidebar on small screens. */
export function MobileNav() {
  const pathname = normalize(usePathname());
  const flat = [
    ...TOP_LEVEL,
    ...sections.flatMap((section) =>
      section.entries.map((entry) => ({
        href: entry.href,
        label: entry.title,
      }))
    ),
  ];

  return (
    <nav className="flex gap-2 overflow-x-auto pb-1">
      {flat.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-sm transition ${
              active
                ? "border-indigo-200 bg-indigo-50 font-medium text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-300"
                : "border-neutral-200 text-neutral-600 dark:border-neutral-800 dark:text-neutral-400"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Nav() {
  const pathname = normalize(usePathname());

  return (
    <nav className="flex flex-col gap-1">
      {TOP_LEVEL.map(({ href, label }) => (
        <Link key={href} href={href} className={linkClass(pathname === href)}>
          {label}
        </Link>
      ))}

      {sections.map((section) => (
        <div key={section.label}>
          <div className="mt-4 px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            {section.label}
          </div>
          {section.entries.map((entry) => (
            <Link
              key={entry.href}
              href={entry.href}
              className={`block ${linkClass(pathname === entry.href)}`}
            >
              {entry.title}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
