import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "@/components/CodeBlock";
import {
  Callout,
  NextLinks,
  PageHeader,
  Prose,
  Section,
  Table,
} from "@/components/doc";
import { examples, guides, reference } from "@/lib/site";

export const metadata: Metadata = {
  title: "Run it against a real model",
  description:
    "The Vite app in this repository, wired to OpenAI or Anthropic through a dev-server proxy that keeps the API key in Node.",
};

const nextEntries = [...guides, ...examples, ...reference].filter((entry) =>
  ["/adapters", "/api-reference"].includes(entry.href),
);

/** Table cells sit outside Prose, so inline <code> needs its styling here. */
const CELL_CODE =
  "[&_code]:rounded [&_code]:bg-neutral-200 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em] [&_code]:text-neutral-800 dark:[&_code]:bg-neutral-800 dark:[&_code]:text-neutral-200";

const buildLibrary = `# The example resolves the library through file:../../react-observer-agent,
# so it reads dist/ from a sibling checkout of the library repo.
cd ../react-observer-agent
npm install && npm run build`;

const runExample = `cd local-example
npm install
cp .env.example .env
npm run dev`;

const envFile = `# Deliberately not prefixed with VITE_. The dev server reads these in Node and
# attaches them to proxied requests, so they never reach the browser bundle.
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Which adapter the example uses: openai (default) or claude.
VITE_PROVIDER=openai`;

const viteProxy = `export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/openai': {
          target: 'https://api.openai.com/v1',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\\/api\\/openai/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (env.OPENAI_API_KEY) {
                proxyReq.setHeader('Authorization', \`Bearer \${env.OPENAI_API_KEY}\`);
              }
            });
          },
        },
        '/api/anthropic': {
          target: 'https://api.anthropic.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\\/api\\/anthropic/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (env.ANTHROPIC_API_KEY) {
                proxyReq.setHeader('x-api-key', env.ANTHROPIC_API_KEY);
              }
            });
          },
        },
      },
    },
  };
});`;

const providerSwitch = `// Set VITE_PROVIDER=claude to run the same example against the Anthropic API.
const provider = import.meta.env.VITE_PROVIDER === 'claude' ? 'claude' : 'openai';

// Both point at the dev server's /api proxy, which holds the key.
const model =
  provider === 'claude'
    ? claudeAdapter({ baseURL: '/api/anthropic' })
    : openAIAdapter({ baseURL: '/api/openai' });`;

const providerWiring = `// Resolved inside the agent loop, outside React rendering, so this reads the
// store through its vanilla API rather than calling the hook.
const getAppState = () => useAppStore.getState();

<AIAgentProvider
  model={model}
  state={getAppState}
  tools={tools}
  permissions={{
    canAccess: ['user', 'currentPage', 'cart', 'products'],
    canExecute: ['navigateTo', 'addToCart', 'clearCart'],
    stateDescriptions: {
      user: 'Current logged-in user profile (name, email)',
      currentPage: 'The page the user is currently viewing',
      cart: 'Shopping cart items and quantities',
      products: 'Available product catalog with IDs, names, and prices',
    },
  }}
  options={{
    debug: true,
    systemPrompt:
      'You are a helpful shopping assistant. You can navigate the app, add products to the cart, and clear the cart. Use readState to check available products before answering questions.',
    onConfirm: async (pending) =>
      window.confirm(
        \`Allow "\${pending.toolName}" with args \${JSON.stringify(pending.args)}?\`,
      ),
  }}
>
  <ChatPanel />
</AIAgentProvider>`;

export default function LocalExamplePage() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        title="Run it against a real model"
        lead="The demos on this site talk to a scripted adapter. The Vite app in local-example/ talks to OpenAI or Anthropic for real, through a dev-server proxy that keeps the key in Node."
      />

      <Section title="What it is">
        <Prose>
          <p>
            <code>local-example/</code> is a small shopping app wired to the
            library: a Zustand store holding <code>user</code>,{" "}
            <code>currentPage</code>, <code>cart</code> and{" "}
            <code>products</code>, three registered tools (
            <code>navigateTo</code>, <code>addToCart</code>,{" "}
            <code>clearCart</code>, the last one with <code>confirm: true</code>
            ), and a chat panel built on <code>useAgent()</code>. It is the live
            smoke test for both shipped adapters, so a change to message
            conversion or tool serialization gets caught against the real APIs
            rather than against a mock.
          </p>
          <p>
            It is a standalone project with its own <code>package.json</code>,
            React 18 and Vite toolchain, so it is excluded from this site&apos;s
            TypeScript and ESLint runs and never ends up in the static export.
          </p>
        </Prose>
      </Section>

      <Section title="Setup">
        <Prose>
          <p>
            The example depends on the library through a <code>file:</code>{" "}
            specifier, which reads the built <code>dist/</code> rather than the
            source. Build the library once first.
          </p>
        </Prose>
        <CodeBlock code={buildLibrary} lang="bash" />
        <Prose>
          <p>Then, from the root of this repository:</p>
        </Prose>
        <CodeBlock code={runExample} lang="bash" />
        <Prose>
          <p>
            Put a key in <code>.env</code> for whichever provider you are
            testing. <code>.env</code> is gitignored;{" "}
            <code>.env.example</code> is the tracked template.
          </p>
        </Prose>
        <CodeBlock code={envFile} lang="bash" filename="local-example/.env" />
        <Callout tone="note" title="Restart after editing .env">
          The proxy reads the key at startup, so a key added while the dev
          server is running does not take effect until you restart it.
        </Callout>
      </Section>

      <Section title="Why the requests go through a proxy">
        <Prose>
          <p>
            The browser calls a same-origin <code>/api/openai</code> or{" "}
            <code>/api/anthropic</code> path and{" "}
            <code>vite.config.ts</code> forwards it to the provider with the key
            attached on the Node side. Three things fall out of that:
          </p>
          <ul>
            <li>
              It mirrors the backend proxy pattern the library recommends for
              production, so the example demonstrates the shape you should
              actually ship rather than a shortcut you would have to undo.
            </li>
            <li>
              The key never reaches the bundle. The variables are not prefixed
              with <code>VITE_</code> on purpose: a <code>VITE_</code> variable
              would be inlined into client code and served to the browser.
            </li>
            <li>
              Same-origin requests sidestep CORS entirely, including the opt-in
              header the Anthropic API otherwise demands for direct browser
              calls.
            </li>
          </ul>
        </Prose>
        <CodeBlock
          code={viteProxy}
          lang="ts"
          filename="local-example/vite.config.ts"
        />
        <Prose>
          <p>
            The rewrite strips the <code>/api/...</code> prefix and the target
            supplies the rest, so the paths the adapters build line up with the
            provider endpoints:{" "}
            <code>openAIAdapter({`{ baseURL: '/api/openai' }`})</code> appends{" "}
            <code>/chat/completions</code>, and{" "}
            <code>claudeAdapter({`{ baseURL: '/api/anthropic' }`})</code>{" "}
            appends <code>/v1/messages</code>.
          </p>
        </Prose>
      </Section>

      <Section title="Switching providers">
        <Prose>
          <p>
            Set <code>VITE_PROVIDER=claude</code> in <code>.env</code> and
            restart. That single variable picks the adapter, and nothing else in
            the app changes: same store, same tools, same permissions, same
            provider component.
          </p>
        </Prose>
        <CodeBlock
          code={providerSwitch}
          lang="tsx"
          filename="local-example/src/App.tsx"
        />
        <CodeBlock
          code={providerWiring}
          lang="tsx"
          filename="local-example/src/App.tsx"
        />
      </Section>

      <Section title="The smoke test">
        <Prose>
          <p>
            Run these three prompts against each provider. Together they cover
            the whole loop. Keep the browser console open, since{" "}
            <code>debug: true</code> logs every step under the{" "}
            <code>[react-observer-agent]</code> prefix.
          </p>
        </Prose>
        <Table
          head={["Prompt", "What it proves"]}
          rows={[
            [
              <span
                key="p"
                className="whitespace-nowrap font-mono text-xs text-indigo-700 dark:text-indigo-300"
              >
                What&apos;s in my cart?
              </span>,
              <span key="w" className={CELL_CODE}>
                The pull-based state path. The model should call{" "}
                <code>__readState</code> for <code>cart</code>, get the values
                back, and answer from them. The console shows a{" "}
                <code>readState requested</code> line followed by{" "}
                <code>readState result</code>, and the network tab shows two
                requests to the provider rather than one.
              </span>,
            ],
            [
              <span
                key="p"
                className="font-mono text-xs text-indigo-700 dark:text-indigo-300"
              >
                Add the wireless headphones to my cart
              </span>,
              <span key="w" className={CELL_CODE}>
                Tool execution end to end. The model reads{" "}
                <code>products</code> to find the id, then calls{" "}
                <code>addToCart</code>. The cart count in the header increments.
              </span>,
            ],
            [
              <span
                key="p"
                className="whitespace-nowrap font-mono text-xs text-indigo-700 dark:text-indigo-300"
              >
                Clear my cart
              </span>,
              <span key="w" className={CELL_CODE}>
                The confirmation flow. A browser confirm dialog appears before
                anything changes. Decline it once and the agent reports the
                cancellation instead of clearing the cart, then try again and
                accept.
              </span>,
            ],
          ]}
        />
        <Prose>
          <p>
            The catalogue is three items, so the second prompt has something to
            resolve against: <code>p1</code> Wireless Headphones,{" "}
            <code>p2</code> Mechanical Keyboard, <code>p3</code> USB-C Hub.
          </p>
        </Prose>
        <Callout tone="note" title="The first prompt is the regression test">
          Reading the cart is the case that broke in v0.1.0. If the second
          request fails with a 400 about tool messages, the adapter is not
          serializing assistant tool calls correctly.
        </Callout>
      </Section>

      <Section title="What to watch for">
        <Prose>
          <ul>
            <li>
              A request to <code>/api/...</code> returning 401 means the key is
              missing or wrong in <code>.env</code>. Restart the dev server
              after editing it, since the proxy reads the key at startup.
            </li>
            <li>
              A 400 mentioning <code>tool_calls</code> or <code>tool_use</code>{" "}
              points at adapter message conversion.
            </li>
            <li>
              The agent answering about the cart with no{" "}
              <code>__readState</code> call in the console means the state
              manifest is not reaching the system prompt.
            </li>
          </ul>
        </Prose>
      </Section>

      <Section title="How this differs from the demos here">
        <Prose>
          <p>
            The <Link href="/examples/chat">examples</Link> on this site run the
            real provider, the real permission checks, the real{" "}
            <code>__readState</code> round trip, the real argument validation
            and the real turn loop against a scripted adapter. They prove the
            library&apos;s logic, and they need no API key, which is what lets
            them run inside a static export.
          </p>
          <p>
            What a script cannot prove is that the adapters speak each
            provider&apos;s wire format correctly: tool calls serialized the way
            OpenAI and Anthropic expect them, tool results linked to the call
            they answer, usage parsed out of two different response shapes.
            That is this example&apos;s job, and it needs a real key and a real
            endpoint to do it.
          </p>
        </Prose>
      </Section>

      <NextLinks entries={nextEntries} />
    </div>
  );
}
