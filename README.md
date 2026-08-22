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

The site depends on the library through `file:../react-observer-agent`, so a
sibling checkout of the library repository is required while the package is
unpublished. Build it once before installing here, since the `file:` specifier
resolves to `dist/`:

```bash
cd ../react-observer-agent && npm install && npm run build
```

Once the package is on npm, that dependency becomes a normal version range and
the sibling checkout stops being necessary.

`npm run dev` runs Next on webpack rather than Turbopack. Turbopack resolves the
symlink behind a `file:` dependency to its real path, which sits outside this
project, and then fails to resolve the package at all. `next build` uses webpack
and is unaffected, so this only ever showed up in the dev server. The flag can go
back once the dependency is a published version range rather than a symlink.

Once the package is on npm that dependency becomes an ordinary version range and
the sibling checkout stops being necessary.

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
