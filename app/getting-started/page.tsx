import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "@/components/CodeBlock";
import {
  Callout,
  NextLinks,
  PageHeader,
  Prose,
  Section,
} from "@/components/doc";
import { examples, guides } from "@/lib/site";

export const metadata: Metadata = {
  title: "Getting started",
  description:
    "Install react-observer-agent, register a tool, configure an adapter, wrap the app in AIAgentProvider, and send the first message.",
};

const registerToolCode = `// tools.ts
import { registerTool } from 'react-observer-agent';
import { useStore } from './store';

export const tools = [
  registerTool(
    'addToCart',
    (args: { productId: string }) => {
      useStore.getState().addToCart(args.productId);
      return \`Added \${args.productId} to the cart\`;
    },
    {
      description: 'Add a product to the shopping cart',
      parameters: {
        type: 'object',
        properties: { productId: { type: 'string' } },
        required: ['productId'],
      },
      confirm: true,
    },
  ),

  registerTool('clearCart', () => {
    useStore.getState().clearCart();
    return 'Cart cleared';
  }, {
    description: 'Remove all items from the cart',
    // parameters omitted: the empty object schema is substituted
    confirm: true,
  }),
];`;

const schemaAndContextCode = `import { z } from 'zod';
import { registerTool } from 'react-observer-agent';
import { useStore } from './store';

const AddToCart = z.object({
  productId: z.string(),
  qty: z.number().int().positive().default(1),
});

registerTool(
  'addToCart',
  (args) => {
    useStore.getState().addToCart(args.productId, args.qty);
    return \`Added \${args.qty} x \${args.productId} to the cart\`;
  },
  {
    description: 'Add a product to the cart',
    parameters: {
      type: 'object',
      properties: { productId: { type: 'string' }, qty: { type: 'integer' } },
      required: ['productId'],
    },
    schema: AddToCart, // args is { productId: string; qty: number }
  },
);

registerTool(
  'searchProducts',
  async (args: { query: string }, context) => {
    // Forwarding the signal is what stops the request. The loop only stops
    // waiting on the handler; it cannot cancel work already running.
    const res = await fetch(\`/api/search?q=\${encodeURIComponent(args.query)}\`, {
      signal: context?.signal,
    });
    return res.json();
  },
  {
    description: 'Search the product catalog',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query'],
    },
  },
);`;

const adapterCode = `// model.ts
import { openAIAdapter, claudeAdapter } from 'react-observer-agent';

// Production: your backend holds the key and forwards the request.
export const model = openAIAdapter({
  baseURL: '/api/agent',
  headers: { Authorization: \`Bearer \${getSessionToken()}\` },
});

// Local development only. This ships the key to the browser.
// export const model = openAIAdapter({ apiKey: import.meta.env.VITE_OPENAI_KEY });

// Claude is the same interface, so nothing else in the app changes.
// export const model = claudeAdapter({ baseURL: '/api/agent' });`;

const providerCode = `// App.tsx
import { AIAgentProvider } from 'react-observer-agent';
import { useStore } from './store';
import { tools } from './tools';
import { model } from './model';

export default function App() {
  return (
    <AIAgentProvider
      model={model}
      state={() => {
        const { user, cart, products } = useStore.getState();
        return { user, cart, products };
      }}
      tools={tools}
      permissions={{
        canAccess: ['user', 'cart', 'products'],
        canExecute: ['addToCart', 'clearCart'],
        stateDescriptions: {
          user: 'Current logged-in user profile',
          cart: 'Shopping cart items and quantities',
          products: 'Available product catalog with IDs, names, and prices',
        },
      }}
      options={{
        maxTurns: 5,
        onConfirm: async (call) =>
          window.confirm(\`Allow agent to run "\${call.toolName}"?\`),
      }}
    >
      <Router />
    </AIAgentProvider>
  );
}`;

const sendCode = `// ChatPanel.tsx
import { useState } from 'react';
import { useAgent } from 'react-observer-agent';

function ChatPanel() {
  const { send, isProcessing, history } = useAgent();
  const [input, setInput] = useState('');

  const handleSend = async () => {
    const response = await send(input);
    // response.message   -> the agent's final text
    // response.toolCalls -> every user tool it invoked, with a status each
    // response.error     -> present when the interaction failed or was cancelled
    setInput('');
  };

  return (
    <div>
      {history.map((entry, i) => (
        <div key={i} className={entry.role}>{entry.content}</div>
      ))}
      {isProcessing && <Spinner />}
      <input value={input} onChange={(e) => setInput(e.target.value)} />
      <button onClick={handleSend} disabled={isProcessing}>Send</button>
    </div>
  );
}`;

/** Pulled from the registry by href, so a retitled page never goes stale here. */
const nextUp = [...guides, ...examples].filter((entry) =>
  ["/pull-based-state", "/examples/chat"].includes(entry.href),
);

const stateFormsCode = `// Vanilla React state: pass an object. Each render passes a fresh one.
<AIAgentProvider state={{ user, cart }} ... >

// External stores (Zustand, Redux): pass a getter.
<AIAgentProvider state={() => useStore.getState()} ... >
<AIAgentProvider state={() => store.getState()} ... >

// Wrong. This passes the hook itself, and the agent loop is not a render.
<AIAgentProvider state={useStore} ... >`;

export default function GettingStarted() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        title="Getting started"
        lead="Install the package, register the actions the agent may take, point it at a model, wrap the app, and send a message."
      />

      <Section title="Install">
        <CodeBlock code="npm install react-observer-agent" lang="bash" />
        <Prose>
          <p>
            React 18 or newer is a peer dependency. The package itself has no
            runtime dependencies, and ships both ESM and CJS builds with types.
            As of v0.3.0 both bundles carry a <code>{"'use client'"}</code>{" "}
            banner, so importing <code>react-observer-agent</code> inside a
            Next.js App Router tree needs no hand-written re-export module
            around it.
          </p>
        </Prose>
        <Callout tone="note" title="Your own files still need the directive">
          The banner covers the package, not your code. A file calling{" "}
          <code>useAgent</code> has to be marked{" "}
          <code>{'"use client"'}</code> because a hook cannot run in a Server
          Component, and in practice the file that renders{" "}
          <code>AIAgentProvider</code> does too: its <code>model</code> adapter,{" "}
          <code>state</code> getter, <code>tools</code> handlers and{" "}
          <code>options</code> callbacks are all functions, and functions do not
          cross the server-to-client boundary. Every file on this site that
          touches the library carries the directive for that reason.
        </Callout>
      </Section>

      <Section title="1. Register tools">
        <Prose>
          <p>
            A tool is a named function the agent is allowed to invoke.{" "}
            <code>registerTool(name, handler, options?)</code> returns a
            validated definition. The handler&apos;s return value is serialized
            and fed back to the model, so return something meaningful rather
            than <code>undefined</code>.
          </p>
        </Prose>
        <CodeBlock code={registerToolCode} lang="ts" filename="tools.ts" />
        <Prose>
          <ul>
            <li>
              <strong>A tool needs a <code>description</code> to be visible to
              the model.</strong> Without one the model has nothing to decide
              on, so the provider hides it. It stays executable if the model
              names it anyway, since <code>canExecute</code> is the authority.
            </li>
            <li>
              <strong>Omitting <code>parameters</code> substitutes the empty
              object schema</strong> <code>
                {'{ "type": "object", "properties": {} }'}
              </code>. Use that for tools that take no arguments.
            </li>
            <li>
              <strong><code>schema</code> takes a Standard Schema
              validator</strong> (Zod 3.24+, Valibot 1+, ArkType 2+). It
              replaces the built-in JSON Schema subset check, the handler
              receives the validated value so defaults and transforms apply,
              and the handler&apos;s argument type is inferred from the schema
              output. <code>parameters</code> still supplies the JSON Schema the
              model sees; the library does not derive one from the schema.
            </li>
            <li>
              <strong><code>confirm: true</code></strong> routes the call
              through your <code>onConfirm</code> handler before the handler
              runs. See <Link href="/permissions">Permissions and safety</Link>.
            </li>
            <li>
              <strong>The handler takes a second argument</strong>, a{" "}
              <code>ToolContext</code> carrying the interaction&apos;s{" "}
              <code>signal</code>. Read it as <code>context?.signal</code>: the
              parameter is typed optional so one-argument handlers written
              against 0.2.0 keep compiling.
            </li>
            <li>
              Names must be unique across the tools passed to one provider, and
              names beginning with <code>__</code> are reserved for internal
              tools. The provider throws on mount for either violation.
            </li>
          </ul>
        </Prose>
        <Prose>
          <p>
            The two together: a schema-validated tool, whose <code>args</code>{" "}
            the handler gets typed for free, and a slow tool that forwards the
            signal so a cancelled interaction stops the request rather than
            leaving it running with its result discarded.
          </p>
        </Prose>
        <CodeBlock
          code={schemaAndContextCode}
          lang="ts"
          filename="tools.ts"
        />
      </Section>

      <Section title="2. Configure an adapter">
        <Prose>
          <p>
            An adapter turns the library&apos;s request into an LLM API call.
            Two ship with the package: <code>openAIAdapter</code> and{" "}
            <code>claudeAdapter</code>. Both take either an <code>apiKey</code>{" "}
            or a <code>baseURL</code>, and throw at construction with neither.
          </p>
        </Prose>
        <CodeBlock code={adapterCode} lang="ts" filename="model.ts" />
        <Callout tone="warn" title="Keys do not belong in the browser">
          Passing <code>apiKey</code> ships the key to the client, where it is
          visible in DevTools and in network requests. That is for local
          development. In production, route through your own backend with{" "}
          <code>baseURL</code> plus <code>headers</code>.
        </Callout>
      </Section>

      <Section title="3. Wrap the app">
        <Prose>
          <p>
            <code>AIAgentProvider</code> wires the model, the state source, the
            tools and the permissions together. Permissions are allowlists:{" "}
            <code>canAccess</code> lists the state keys the agent may read,{" "}
            <code>canExecute</code> lists the tool names it may invoke.
          </p>
        </Prose>
        <CodeBlock code={providerCode} lang="tsx" filename="App.tsx" />
        <Prose>
          <p>
            <code>stateDescriptions</code> is optional. Missing entries fall
            back to the key name, and good descriptions let the model pick the
            right key without reading everything.
          </p>
          <p>
            Prop updates take effect on the next <code>send()</code>. The
            provider reads <code>model</code>, <code>state</code>,{" "}
            <code>tools</code>, <code>permissions</code> and{" "}
            <code>options</code> through refs, so an interaction in flight keeps
            the values it started with.
          </p>
        </Prose>
      </Section>

      <Section title="The two forms of the state prop">
        <Prose>
          <p>
            <code>state</code> accepts an object or a getter function. An object
            is read directly each time state is resolved, which suits React
            state because every re-render passes a fresh object. A getter is
            called each time state is resolved, which suits external stores.
          </p>
        </Prose>
        <CodeBlock code={stateFormsCode} lang="tsx" />
        <Callout tone="warn" title="The getter must not call hooks">
          It runs outside React rendering, inside the async agent loop.{" "}
          <code>state={"{() => useStore.getState()}"}</code> is correct.{" "}
          <code>state={"{useStore}"}</code> passes the hook itself and throws an
          invalid hook call the first time the agent reads state.
        </Callout>
      </Section>

      <Section title="4. Send a message">
        <Prose>
          <p>
            <code>useAgent()</code> works anywhere inside the provider tree and
            throws when called outside one. It returns <code>send</code>,{" "}
            <code>isProcessing</code>, <code>history</code>,{" "}
            <code>clearHistory</code> and <code>lastResponse</code>.
          </p>
        </Prose>
        <CodeBlock code={sendCode} lang="tsx" filename="ChatPanel.tsx" />
        <Prose>
          <p>
            <code>send()</code> resolves rather than rejects. A failed
            interaction comes back as an <code>AgentResponse</code> with{" "}
            <code>error</code> set, and the same response is stored in{" "}
            <code>lastResponse</code>. What the loop does between the call and
            the response is covered in{" "}
            <Link href="/send-behavior">How send() behaves</Link>.
          </p>
        </Prose>
      </Section>

      <NextLinks entries={nextUp} />
    </div>
  );
}
