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
import { examples, guides } from "@/lib/site";

export const metadata: Metadata = {
  title: "Permissions and safety",
  description:
    "Allowlists, the two enforcement layers, argument validation, the confirmation flow, prompt injection, and keeping API keys off the client.",
};

const nextUp = [...guides, ...examples].filter((entry) =>
  ["/adapters", "/examples/confirmation"].includes(entry.href),
);

const allowlistCode = `permissions={{
  canAccess: ['user', 'cart', 'products'],   // state keys the agent may read
  canExecute: ['addToCart', 'clearCart'],    // tool names the agent may invoke
}}`;

const validationCode = `registerTool(
  'setQuantity',
  (args: { productId: string; qty: number }) => {
    // Still treat args as untrusted: keywords the validator does not
    // understand pass through unchecked.
    if (!Number.isInteger(args.qty) || args.qty < 1) {
      throw new Error('qty must be a positive integer');
    }
    return useStore.getState().setQuantity(args.productId, args.qty);
  },
  {
    description: 'Set the quantity of a cart line',
    parameters: {
      type: 'object',
      properties: {
        productId: { type: 'string' },
        qty: { type: 'number' },
      },
      required: ['productId', 'qty'],
    },
  },
);`;

const confirmCode = `<AIAgentProvider
  // ...
  options={{
    onConfirm: async (call) => {
      // call.toolName, call.args, call.description
      return await showApprovalModal(call);
    },
  }}
>`;

const proxyCode = `// Client
const model = openAIAdapter({
  baseURL: '/api/agent',
  headers: { Authorization: \`Bearer \${sessionToken}\` },
});`;

const statusRows: [string, string][] = [
  [
    "denied",
    "The tool name failed the canExecute check, or no matching definition exists.",
  ],
  [
    "error",
    "Arguments failed the parameters schema, or the handler threw. On a validation failure the handler never runs.",
  ],
  [
    "cancelled",
    "A confirm: true tool was denied, or no onConfirm handler was provided.",
  ],
  ["confirmed", "A confirm: true tool was approved and executed."],
  ["success", "The tool executed normally, with no confirmation required."],
];

export default function Permissions() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        title="Permissions and safety"
        lead="The library treats the LLM as an untrusted planner operating inside a capability sandbox. Nothing is readable or executable unless you list it."
      />

      <Section title="Allowlists">
        <Prose>
          <p>
            <code>canAccess</code> and <code>canExecute</code> are allowlists. A
            key or a tool that is not listed does not exist from the
            agent&apos;s point of view, and there is no deny list to keep in
            sync.
          </p>
        </Prose>
        <CodeBlock code={allowlistCode} lang="tsx" />
      </Section>

      <Section title="Two enforcement layers">
        <Prose>
          <ol className="ml-5 list-decimal">
            <li>
              <strong>Visibility, before the model call.</strong> The model only
              ever sees manifest keys from <code>canAccess</code> and tools from{" "}
              <code>canExecute</code>. It cannot request what it cannot see.
            </li>
            <li>
              <strong>Execution, after the model responds.</strong> Tool names
              are re-validated against <code>canExecute</code> before anything
              runs, and <code>__readState</code> requests are re-filtered
              against <code>canAccess</code>. A hallucinated or injected name is
              rejected with status <code>denied</code>.
            </li>
          </ol>
          <p>
            The second layer exists because the first is a matter of what the
            model was told, and a model can name a tool it was never shown.{" "}
            <Link href="/examples/permissions">Permission denial</Link> shows
            that rejection happening.
          </p>
        </Prose>
      </Section>

      <Section title="Argument validation">
        <Prose>
          <p>
            Tool arguments are checked against the tool&apos;s{" "}
            <code>parameters</code> schema before the handler runs, and before
            the confirmation prompt. Nobody is ever asked to approve a
            malformed call. A call that fails validation is reported with status{" "}
            <code>error</code> and the handler does not run.
          </p>
          <p>
            Validation covers a deliberate subset of JSON Schema:{" "}
            <code>type</code>, <code>properties</code>, <code>required</code>,{" "}
            <code>items</code> and <code>enum</code>. Keywords outside that set
            are ignored, so a richer schema validates on the parts the library
            understands instead of failing outright. The trade-off is that
            unvalidated keywords pass through untouched.
          </p>
        </Prose>
        <CodeBlock code={validationCode} lang="ts" />
        <Callout tone="note" title="Handlers should still treat args as untrusted">
          The validator is a hand-written subset, kept that way so the package
          stays dependency free. Anything it does not understand reaches your
          handler unchecked, so guard the constraints that matter.{" "}
          <Link href="/examples/validation">Argument validation</Link> shows a
          rejected call.
        </Callout>
      </Section>

      <Section title="Human confirmation">
        <Prose>
          <p>
            A tool registered with <code>confirm: true</code> routes through
            your <code>onConfirm</code> handler. Resolving <code>true</code>{" "}
            executes it, with a final status of <code>confirmed</code>.
            Resolving <code>false</code> skips it with status{" "}
            <code>cancelled</code>, and the model is told the user declined.
          </p>
        </Prose>
        <CodeBlock code={confirmCode} lang="tsx" />
        <Prose>
          <p>
            You own the UI: a modal, a toast, an inline card,{" "}
            <code>window.confirm</code>, anything that eventually yields a
            boolean.
          </p>
          <p>
            <strong>With no <code>onConfirm</code> handler, the tool is
            skipped</strong> with status <code>cancelled</code> and a debug
            warning. Confirmation is never silently bypassed. Use{" "}
            <code>confirm: true</code> for anything irreversible or
            user-visible: purchases, deletions, navigation away from unsaved
            work.
          </p>
        </Prose>
      </Section>

      <Section title="Prompt injection">
        <Prose>
          <p>
            State often contains user-generated content: product reviews,
            messages, profile fields. Once a value like that is serialized into
            the conversation, it can attempt prompt injection, and no amount of
            prompt engineering makes that impossible.
          </p>
          <p>
            The permission and confirmation layers are the backstop. An injected
            instruction can, at worst, invoke a tool you already allowlisted,
            and a <code>confirm: true</code> tool still requires a human yes.
            That is the reason to keep <code>canExecute</code> as short as the
            app can tolerate and to mark the destructive entries{" "}
            <code>confirm: true</code>.
          </p>
        </Prose>
      </Section>

      <Section title="API keys">
        <Callout tone="warn" title="Never ship an API key to the browser">
          Passing <code>apiKey</code> to an adapter puts the key in client-side
          code, where it is visible in DevTools and in every network request.
          That is acceptable for local development and never for production.
        </Callout>
        <Prose>
          <p>
            For production, route through your own backend with{" "}
            <code>baseURL</code> plus <code>headers</code>:
          </p>
        </Prose>
        <CodeBlock code={proxyCode} lang="ts" />
        <Prose>
          <p>
            The backend holds the real API key, applies auth and rate limits,
            and forwards the request to the LLM provider. Both built-in adapters
            require either <code>apiKey</code> or <code>baseURL</code> and throw
            at construction with neither. See{" "}
            <Link href="/adapters">Adapters</Link>.
          </p>
        </Prose>
      </Section>

      <Section title="What each outcome means">
        <Table
          head={["Status", "Cause"]}
          rows={statusRows.map(([status, cause]) => [
            <code key={status}>{status}</code>,
            cause,
          ])}
        />
        <Prose>
          <p>
            Every one of these lands in <code>AgentResponse.toolCalls</code> and
            is fed back to the model so it can react.{" "}
            <code>onToolCall</code> fires for each of them too, with no
            exceptions: a name that passes <code>canExecute</code> but has no
            matching tool definition reports like every other denial. What the
            model receives for each status is in{" "}
            <Link href="/send-behavior">How send() behaves</Link>.
          </p>
        </Prose>
      </Section>

      <NextLinks entries={nextUp} />
    </div>
  );
}
