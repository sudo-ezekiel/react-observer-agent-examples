# Basic example

A small shopping app wired to `react-observer-agent`, used as the live smoke test for both adapters. Zustand holds the state, three tools are registered (`navigateTo`, `addToCart`, `clearCart`), and `clearCart` requires confirmation.

## Setup

This app installs `react-observer-agent` from npm, so nothing else needs to be checked out:

```bash
cd local-example && npm install && cp .env.example .env
```

To smoke test an unreleased change to the library, build a local checkout and point this app at it instead:

```bash
cd ../../react-observer-agent && npm install && npm run build
cd - && npm install ../../react-observer-agent
```

Put a key in `.env` for whichever provider you are testing. The dev server reads it in Node and attaches it to proxied requests, so it never reaches the browser bundle. To use Claude, also set `VITE_PROVIDER=claude`.

```bash
npm run dev
```

## Why the requests go through a proxy

The browser calls a same-origin `/api/openai` or `/api/anthropic` path, and `vite.config.ts` forwards it to the provider with the key attached. This mirrors the backend proxy pattern the library recommends for production (spec section 3.4), keeps the key out of the bundle, and avoids CORS negotiation with either provider.

## Smoke test

Run these three prompts against each provider. Together they exercise the whole loop. Keep the browser console open, since `debug: true` logs every step.

**1. "What's in my cart?"**

Exercises the pull-based state path: the model should call `__readState` for `cart`, get the values back, and answer from them. In the console you should see a `readState requested` line followed by `readState result`, and the network tab should show two requests to the provider rather than one.

This is the case that regressed in v0.1.0. If the second request fails with a 400 about tool messages, the adapter is not serializing assistant tool calls correctly.

**2. "Add the wireless headphones to my cart"**

Exercises the rest: the model should read `products` to find the id, then call `addToCart` with it. The header's cart count should increment.

The catalogue in [src/store.ts](src/store.ts) holds Wireless Headphones, a Mechanical Keyboard and a USB-C Hub, so name one of those. Asking for something that is not stocked is a worthwhile second test: the model should read `products`, find no match, and say so rather than inventing an id.

**3. "Clear my cart"**

Exercises confirmation. A browser confirm dialog should appear before anything changes. Decline it once and check that the agent reports the cancellation rather than clearing the cart anyway, then try again and accept.

## What to watch for

- Requests to `/api/...` returning 401 mean the key is missing or wrong in `.env`. Restart the dev server after editing it, since the proxy reads the key at startup.
- A 400 mentioning `tool_calls` or `tool_use` points at adapter message conversion.
- The agent answering about the cart without a `__readState` call in the console means the state manifest is not reaching the system prompt.
