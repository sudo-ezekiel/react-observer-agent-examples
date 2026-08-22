# React Observer Agent docs

The documentation site for [react-observer-agent](https://github.com/sudo-ezekiel/react-observer-agent):
guides, an API reference, and runnable examples.

Live at **[reactobserveragent.sudo-ezekiel.com](https://reactobserveragent.sudo-ezekiel.com)**.

Every page here is a real page in this repository. Nothing is faked with a
screenshot, so if an example renders on the site it compiles and runs.

## Layout

| Path | What is in it |
|------|---------------|
| `app/` | The guide and example pages, one directory per route |
| `components/` | The shared doc components and the agent demo |
| `lib/site.ts` | The registry the nav and the landing page are both built from |
| `lib/demo.ts` | The shop store and the tools every demo runs against |
| `lib/scriptedAdapter.ts` | The `ModelAdapter` that plays a written script instead of calling an LLM |
| `local-example/` | A standalone Vite app that talks to real providers, with its own install and toolchain |

The demos run the library for real: the provider, the permission checks,
`__readState`, argument validation, the confirmation flow and the turn loop are
all shipped code paths. Only the network call is replaced, because a static
export has nowhere to hide an API key. `local-example/` covers the other half by
pointing the OpenAI and Claude adapters at the real APIs through a dev-server
proxy; see the [Run it against a real model](https://reactobserveragent.sudo-ezekiel.com/local-example)
page.

## Local development

```bash
npm install
npm run dev
```

The site depends on the published `react-observer-agent` package, so nothing
else needs to be checked out.

To try an unreleased change to the library, point the dependency at a local
checkout instead:

```bash
npm install ../react-observer-agent
```

Build the library first, since a `file:` specifier resolves to its `dist/`. Run
`npm run dev` without `--turbopack` while that is in place: Turbopack resolves
the symlink behind a `file:` dependency to a path outside this project and then
cannot find the package. `next build` uses webpack and is unaffected.

## Adding a page

Create it under the right directory and add one entry to `lib/site.ts`. The nav
and the landing grid pick it up from there.

## Deploying

Static export served by an assets-only Cloudflare Worker.

```bash
npm run deploy
```

That runs `next build`, which writes the whole site to `out/`, then
`wrangler deploy`. The hostname and the DNS record come from `wrangler.jsonc`.

## Checks

```bash
npm run lint
npm run typecheck
npm run build
```
