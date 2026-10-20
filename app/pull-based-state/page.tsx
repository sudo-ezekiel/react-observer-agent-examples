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
  title: "Pull-based state",
  description:
    "How the state manifest and the internal __readState tool let the agent fetch only the keys a question needs.",
};

const nextUp = [...guides, ...examples].filter((entry) =>
  ["/permissions", "/examples/chat"].includes(entry.href),
);

const manifestPromptCode = `Available application state (use the __readState tool to access specific keys when needed):
- user: Current logged-in user profile
- cart: Shopping cart items and quantities
- products: Available product catalog with IDs, names, and prices

Only request state keys relevant to the user's question. Do not read all keys at once unless necessary.`;

const readStateSchema = `{
  "name": "__readState",
  "description": "Read specific keys from the application state. Only request keys you need.",
  "parameters": {
    "type": "object",
    "properties": {
      "keys": {
        "type": "array",
        "items": { "type": "string" },
        "description": "State keys to read"
      }
    },
    "required": ["keys"]
  }
}`;

const traceCode = `User: "What's in my cart?"

System prompt lists: user, cart, products (with descriptions)

Agent calls: __readState({ keys: ["cart"] })
Tool returns: { "cart": [{ "product": "Headphones", "qty": 1 }] }

Agent responds: "You have Wireless Headphones in your cart."`;

const maxStateBytesCode = `options={{
  maxTurns: 5,
  maxStateBytes: 20_000,
}}`;

const truncatedResultCode = `{
  "cart": [{ "product": "Headphones", "qty": 1 }],
  "products": {
    "__truncated": true,
    "limit": 20000,
    "bytes": 84210,
    "preview": "[{\\"id\\":\\"p1\\",\\"name\\":\\"Wireless Headphones\\",\\"price\\":249,\\"in"
  }
}`;

const stateReadEventCode = `options={{
  onEvent: (event) => {
    if (event.type === 'state_read') {
      // requested: ['cart', 'orders'], keys: ['cart']
      console.log(event.requested, event.keys);
    }
  },
}}`;

const permissionsCode = `permissions={{
  canAccess: ['user', 'cart', 'products'],
  canExecute: ['addToCart', 'clearCart'],
  stateDescriptions: {
    user: 'Current logged-in user profile',
    cart: 'Shopping cart items and quantities',
    products: 'Available product catalog with IDs, names, and prices',
  },
}}`;

export default function PullBasedState() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        title="Pull-based state"
        lead="The model never receives your state. It receives a list of key names and descriptions, and asks for the values it needs."
      />

      <Section title="The problem with pushing state">
        <Prose>
          <p>
            The naive way to give an agent access to app state is to dump the
            entire filtered state into the LLM context on every interaction.
            That has two issues. For apps with large state trees most of the
            state is irrelevant to any given question, so the tokens are wasted.
            And the library becomes syntactic sugar over &ldquo;serialize state,
            call LLM&rdquo;, which any developer can write in ten lines.
          </p>
        </Prose>
      </Section>

      <Section title="The manifest">
        <Prose>
          <p>
            On each interaction the loop maps <code>canAccess</code> to{" "}
            <code>{"{ key, description }"}</code> pairs. Descriptions come from{" "}
            <code>stateDescriptions</code>, falling back to the key name when an
            entry is missing.
          </p>
        </Prose>
        <CodeBlock code={permissionsCode} lang="tsx" />
        <Prose>
          <p>
            That manifest is rendered into the system prompt, appended to your
            own <code>options.systemPrompt</code> when you provide one:
          </p>
        </Prose>
        <CodeBlock code={manifestPromptCode} />
        <Prose>
          <p>
            Key names and descriptions travel with the request. Values do not.
            Adapters also receive the manifest as{" "}
            <code>ModelRequest.stateManifest</code>, which is informational,
            since the loop has already rendered it into the prompt.
          </p>
        </Prose>
      </Section>

      <Section title="The __readState tool">
        <Prose>
          <p>
            Whenever the manifest is non-empty, the loop appends one extra tool
            to the list it sends the model:
          </p>
        </Prose>
        <CodeBlock code={readStateSchema} lang="json" />
        <Prose>
          <p>When the model calls it, four things happen in order:</p>
          <ul>
            <li>
              <strong>Keys are filtered.</strong> Requested keys are intersected
              with <code>canAccess</code>. Unauthorized keys are silently
              dropped, so the model gets a result without a hint that the key
              exists.
            </li>
            <li>
              <strong>The state source is resolved.</strong>{" "}
              <code>typeof state === &apos;function&apos; ? state() : state</code>{" "}
              runs per <code>__readState</code> call rather than once per
              interaction, so a value read in turn three reflects turn
              three&apos;s state.
            </li>
            <li>
              <strong>The result is serialized.</strong> Functions, symbols,
              bigints and values that fail <code>JSON.stringify</code> (circular
              references) are stripped from the snapshot, with a warning when{" "}
              <code>options.debug</code> is on. A key whose JSON runs past{" "}
              <code>options.maxStateBytes</code> is swapped for a truncation
              marker at this same point, covered below.
            </li>
            <li>
              <strong>It is fed back as a tool message</strong> inside the
              LLM-facing conversation, and the loop takes another turn.
            </li>
          </ul>
        </Prose>
      </Section>

      <Section title="A worked trace">
        <CodeBlock code={traceCode} />
        <Prose>
          <p>
            Two round trips to the model, one key read. <code>user</code> and{" "}
            <code>products</code> were advertised and never serialized.{" "}
            <Link href="/examples/chat">Reading state</Link> runs this same
            exchange against the real library.
          </p>
        </Prose>
      </Section>

      <Section title="Capping one key">
        <Prose>
          <p>
            Reading on demand answers a large state tree. A single large key is
            a separate problem. A catalogue of two thousand products is one
            entry in <code>canAccess</code>, and one{" "}
            <code>__readState({"{ keys: ['products'] }"})</code> spends the
            context window on it.
          </p>
          <p>
            <code>options.maxStateBytes</code> puts a byte ceiling on each key a
            read returns. Unset means no limit.
          </p>
        </Prose>
        <CodeBlock code={maxStateBytesCode} lang="tsx" />
        <Prose>
          <p>
            The cap is measured on the JSON, not on the object, and it applies
            per key rather than per read. So a read of <code>cart</code> and{" "}
            <code>products</code> returns <code>cart</code> whole and replaces
            only the key that went over:
          </p>
        </Prose>
        <CodeBlock code={truncatedResultCode} lang="json" />
        <Prose>
          <ul>
            <li>
              <strong>
                <code>bytes</code>
              </strong>{" "}
              is the real length of the serialized value, so the model can tell
              how far over the limit it went.
            </li>
            <li>
              <strong>
                <code>preview</code>
              </strong>{" "}
              is the first <code>limit</code> bytes of that same JSON, cut
              wherever the count lands, mid-token included. It runs to the full
              20000 bytes here; the block above is shortened.
            </li>
            <li>
              <strong>
                <code>options.debug</code>
              </strong>{" "}
              logs a warning naming the key and its size whenever a value is
              truncated.
            </li>
          </ul>
        </Prose>
        <Callout tone="note" title="A truncated read still costs a turn">
          The model asked, got a marker back, and has to decide what to do with
          it. A size hint in <code>stateDescriptions</code> (
          <code>&apos;Product catalogue, roughly 2000 items&apos;</code>) and a
          tool that filters server-side are what keep it from asking in the
          first place.
        </Callout>
      </Section>

      <Section title="What you never see">
        <Prose>
          <p>
            <code>__readState</code> is internal. It does not appear in{" "}
            <code>AgentResponse.toolCalls</code>, it does not fire{" "}
            <code>onToolCall</code>, and it is absent from{" "}
            <code>history</code>. It exists only inside the LLM-facing message
            list, so the model can reason across turns about what it already
            read.
          </p>
          <p>
            One trace exists. <code>options.onEvent</code> emits a{" "}
            <code>state_read</code> event once a valid read has resolved,
            carrying the keys the model asked for alongside the keys it was
            allowed:
          </p>
        </Prose>
        <CodeBlock code={stateReadEventCode} lang="tsx" />
        <Prose>
          <p>
            <code>requested</code> is what the model sent.{" "}
            <code>keys</code> is what survived <code>canAccess</code>. The gap
            between the two is the one place the silent drop above becomes
            visible, which makes it worth logging when a model keeps reaching
            for a key you did not grant.
          </p>
          <p>
            The event is observation only, and it fires after the read has
            already resolved. A malformed <code>__readState</code> call is
            rejected before that point and emits nothing.{" "}
            <code>onEvent</code> carries turn and tool events too;{" "}
            <code>state_read</code> is the one that concerns{" "}
            <code>__readState</code>.
          </p>
        </Prose>
        <Callout tone="note" title="Replayed reads are point-in-time">
          The transcript is replayed on the next <code>send()</code>, so an
          earlier <code>__readState</code> result comes back carrying the values
          it held when it ran. The manifest instruction tells the model to read
          again when it needs current values, and{" "}
          <code>clearHistory()</code> drops the transcript entirely. See{" "}
          <Link href="/send-behavior">How send() behaves</Link>.
        </Callout>
      </Section>

      <Section title="What falls out of it">
        <Prose>
          <ul>
            <li>
              <strong>Token cost scales with what the agent reads</strong>,
              rather than with the size of the state tree.
            </li>
            <li>
              <strong>Unread state never leaves the client.</strong> A key the
              agent does not ask for is never serialized into a request.
            </li>
            <li>
              <strong>Descriptions do real work.</strong> They are the only
              thing the model has to choose a key from, so a vague description
              costs an extra turn or an unnecessary read.
            </li>
          </ul>
        </Prose>
      </Section>

      <NextLinks entries={nextUp} />
    </div>
  );
}
