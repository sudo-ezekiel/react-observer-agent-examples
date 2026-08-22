import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "@/components/CodeBlock";
import { Callout, PageHeader, Prose, Section } from "@/components/doc";
import { sections } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "React Observer Agent" },
  description:
    "A React library that lets an LLM agent observe app state, understand user context, and run pre-defined actions behind permission boundaries.",
};

const quickStart = `import {
  AIAgentProvider,
  registerTool,
  openAIAdapter,
  useAgent,
} from 'react-observer-agent';
import { useStore } from './store';

// 1. Register the actions the agent is allowed to perform.
const tools = [
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
      confirm: true, // the user approves each call
    },
  ),
];

// 2. Point an adapter at your backend proxy, which holds the real API key.
const model = openAIAdapter({ baseURL: '/api/agent' });

// 3. Wrap the app. Nothing is readable or executable unless it is listed here.
export default function App() {
  return (
    <AIAgentProvider
      model={model}
      state={() => useStore.getState()}
      tools={tools}
      permissions={{
        canAccess: ['cart', 'products'],
        canExecute: ['addToCart'],
        stateDescriptions: {
          cart: 'Shopping cart items and quantities',
          products: 'Product catalogue with ids, names and prices',
        },
      }}
      options={{
        onConfirm: async (call) => window.confirm(\`Allow "\${call.toolName}"?\`),
      }}
    >
      <Chat />
    </AIAgentProvider>
  );
}

// 4. Talk to it from anywhere inside the provider.
function Chat() {
  const { send, isProcessing } = useAgent();

  return (
    <button
      disabled={isProcessing}
      onClick={() => send('Add the wireless headphones to my cart')}
    >
      Ask the agent
    </button>
  );
}`;

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        title="react-observer-agent"
        lead="A React library that lets an LLM agent observe your app's state, understand what the user is doing, and run pre-defined actions, through a declarative <AIAgentProvider> and registered tools, with permission boundaries built in."
      />

      <div className="mt-6">
        <Prose>
          <p>
            The agent sees what you allow it to see and can call what you allow
            it to call. State keys go in <code>canAccess</code>, tool names go
            in <code>canExecute</code>, and anything unlisted does not exist
            from the agent&apos;s point of view.
          </p>
          <ul>
            <li>Zero runtime dependencies. Adapters are raw fetch, no SDKs.</li>
            <li>TypeScript, dual ESM and CJS builds with types included.</li>
            <li>React &gt;= 18 as a peer dependency.</li>
            <li>
              Works with any state manager: Zustand, Redux, vanilla React state.
            </li>
          </ul>
        </Prose>
      </div>

      <div className="mt-6">
        <Callout tone="note" title="Status: experimental">
          This is a solo experiment and it is not production ready. I am
          exploring whether an AI agent can be useful inside a live React app
          without dumping the whole state into a prompt or letting the model run
          arbitrary code. It works and it is tested, and it may change, break,
          or stop at any time.
        </Callout>
      </div>

      <Section title="Install">
        <CodeBlock code="npm install react-observer-agent" lang="bash" />
      </Section>

      <Section title="Quick start">
        <CodeBlock code={quickStart} lang="tsx" filename="App.tsx" />
        <Prose>
          <p>
            <Link href="/getting-started">Getting started</Link> walks through
            the same four steps in detail, including the plain-object form of
            the <code>state</code> prop for apps that keep state in React.
          </p>
        </Prose>
      </Section>

      <Section title="The defining choice: pull-based state">
        <Prose>
          <p>
            State values are never sent to the model upfront. The model gets a
            manifest in the system prompt, key names plus descriptions, and
            pulls the specific values it needs through an internal{" "}
            <code>__readState</code> tool. Token cost then scales with what the
            agent actually reads rather than with the size of the state tree,
            and a key the agent never asks for is never serialized into a
            request.
          </p>
          <p>
            <Link href="/pull-based-state">Pull-based state</Link> covers the
            manifest, the tool schema, and what happens on each read.
          </p>
        </Prose>
      </Section>

      {sections.map((section) => (
        <Section key={section.label} title={section.label}>
          <div className="grid gap-4 sm:grid-cols-2">
            {section.entries.map((entry) => (
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
        </Section>
      ))}

      <Section title="About the examples">
        <Prose>
          <p>
            Every example on this site runs the real library against a scripted
            model rather than a live one, so no API key is involved. The
            provider, the permission checks, <code>__readState</code>, argument
            validation, the confirmation flow and the turn loop are the shipped
            code paths. Only the network call is replaced.
          </p>
        </Prose>
      </Section>
    </div>
  );
}
