/**
 * Single source of truth for the nav and the landing page. Adding a page means
 * creating it under the right directory and adding one entry here.
 */

export type Entry = {
  /** Route path, without a trailing slash. */
  href: string;
  title: string;
  blurb: string;
};

export const guides: Entry[] = [
  {
    href: "/getting-started",
    title: "Getting started",
    blurb:
      "Install the package, register a tool, wrap the app, and send the first message.",
  },
  {
    href: "/pull-based-state",
    title: "Pull-based state",
    blurb:
      "Why the agent never receives your state upfront, and how __readState fetches only what a question needs.",
  },
  {
    href: "/permissions",
    title: "Permissions and safety",
    blurb:
      "Allowlists, the two enforcement layers, argument validation, confirmation, and prompt injection.",
  },
  {
    href: "/adapters",
    title: "Adapters",
    blurb:
      "OpenAI and Claude out of the box, the proxy pattern for production keys, and writing your own.",
  },
  {
    href: "/send-behavior",
    title: "How send() behaves",
    blurb:
      "The turn loop, conversation memory, cancellation, the turn budget, and token usage.",
  },
];

export const examples: Entry[] = [
  {
    href: "/examples/chat",
    title: "Reading state",
    blurb:
      "Ask about the cart. Watch the agent call __readState for one key and answer from it.",
  },
  {
    href: "/examples/tool-execution",
    title: "Running a tool",
    blurb:
      "The agent reads the catalogue, picks an id, and calls addToCart. The UI updates underneath it.",
  },
  {
    href: "/examples/confirmation",
    title: "Confirmation",
    blurb:
      "A destructive tool marked confirm: true. Approve it or deny it and see both outcomes.",
  },
  {
    href: "/examples/permissions",
    title: "Permission denial",
    blurb:
      "A tool the model asks for but canExecute does not list, rejected after the model responds.",
  },
  {
    href: "/examples/validation",
    title: "Argument validation",
    blurb:
      "The model sends arguments that fail the parameters schema. The handler never runs.",
  },
  {
    href: "/examples/cancellation",
    title: "Cancellation",
    blurb:
      "Abort an interaction mid-flight and watch it resolve with ABORTED instead of throwing.",
  },
];

export const reference: Entry[] = [
  {
    href: "/api-reference",
    title: "API reference",
    blurb: "Every export, prop, option, and status in one page.",
  },
  {
    href: "/local-example",
    title: "Run it against a real model",
    blurb:
      "The Vite app in this repo, wired to OpenAI or Anthropic through a dev-server proxy.",
  },
];

export const sections: { label: string; entries: Entry[] }[] = [
  { label: "Guides", entries: guides },
  { label: "Examples", entries: examples },
  { label: "Reference", entries: reference },
];
