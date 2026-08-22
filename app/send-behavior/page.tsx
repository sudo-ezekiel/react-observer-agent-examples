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
import { examples, reference } from "@/lib/site";

export const metadata: Metadata = {
  title: "How send() behaves",
  description:
    "The turn loop, conversation replay, cancellation, the turn budget, token usage, and the five tool call statuses.",
};

const nextUp = [...examples, ...reference].filter((entry) =>
  ["/examples/cancellation", "/api-reference"].includes(entry.href),
);

const loopCode = `1. Build state manifest from canAccess + stateDescriptions
2. Filter tools by canExecute; map to LLM tool definitions
3. Append __readState to the tool list when the manifest is non-empty
4. System prompt = options.systemPrompt + generated manifest prompt
5. Turn loop, at most maxTurns iterations (default 5):
   a. If the signal is aborted, stop and return an ABORTED error
   b. model.sendMessage({ messages, tools, systemPrompt, stateManifest, signal })
      An AbortError from the adapter also ends the loop as ABORTED
   c. Accumulate reported token usage
   d. Text-only response: capture as final message, exit loop
   e. Tool calls: append the assistant message, then for each call:
      - stop first if the signal is aborted, before any further side effect
      - __readState: filter requested keys to canAccess, snapshot state,
        append result as a tool message (internal, not surfaced)
      - name not in canExecute: append error result, status 'denied'
      - arguments failing the parameters schema: append the validation
        error, status 'error'; the handler does not run
      - confirm:true: run onConfirm; on deny or missing handler,
        append cancelled result, status 'cancelled'
      - otherwise execute handler; append result,
        status 'success' | 'confirmed' | 'error'
   f. Next turn with the grown message list
6. Return the response plus the message list, for replay on the next send`;

const responseCode = `interface AgentResponse {
  message: string;              // the agent's final text
  toolCalls: ToolCallResult[];  // user tools invoked this interaction, all statuses
  error?: AgentError;           // present when the interaction failed or was cancelled
  usage?: { promptTokens: number; completionTokens: number }; // totalled across turns
}`;

const cancelCode = `const controller = new AbortController();

const response = await send('Summarise the catalogue', {
  signal: controller.signal,
});

// Elsewhere: controller.abort()

if (response.error?.code === 'ABORTED') {
  // The user cancelled. onError deliberately did not fire.
}`;

const statusRows: [string, string, string][] = [
  [
    "success",
    "Tool executed normally, no confirmation required.",
    "{ result }",
  ],
  ["confirmed", "confirm: true tool approved and executed.", "{ result }"],
  [
    "cancelled",
    "confirm: true tool denied, or no onConfirm handler.",
    "{ status: 'cancelled', reason }",
  ],
  ["denied", "Name failed the canExecute check.", "{ error }"],
  [
    "error",
    "Handler threw, or arguments failed the parameters schema.",
    "{ error }",
  ],
];

export default function SendBehavior() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        title="How send() behaves"
        lead="One send() is a loop of at most maxTurns model round trips, default 5, that ends when the model answers with text instead of another tool call."
      />

      <Section title="The loop">
        <Prose>
          <p>
            <code>send(message)</code> runs the following, implemented in{" "}
            <code>src/provider/executeAgentLoop.ts</code>:
          </p>
        </Prose>
        <CodeBlock code={loopCode} />
        <Prose>
          <p>
            Exceptions thrown anywhere in the loop, adapter failures included,
            are caught by the provider, converted to an{" "}
            <code>AgentResponse</code> with <code>error</code> set, stored in{" "}
            <code>lastResponse</code> and passed to <code>onError</code>.{" "}
            <code>send()</code> resolves rather than rejects.
          </p>
        </Prose>
        <CodeBlock code={responseCode} lang="ts" />
      </Section>

      <Section title="Conversation memory">
        <Prose>
          <p>
            The provider keeps two records, and they are different things.{" "}
            <code>history</code> is the user-facing record exposed through{" "}
            <code>useAgent()</code>: one entry per user message and one per
            assistant response, with tool activity attached to the assistant
            entry. The transcript is the LLM-facing record, held in a ref and
            never exposed, carrying assistant messages with their tool calls
            intact and the tool results answering them.
          </p>
          <p>
            On each <code>send()</code>, the transcript is replayed verbatim, so
            the agent can reason about what it already did. Structured tool
            calls cannot survive a text-only replay, which is why the two
            records exist separately.
          </p>
          <p>Two kinds of turn are deliberately dropped rather than replayed:</p>
          <ul>
            <li>
              <strong>Aborted turns.</strong> A cancel can land after the
              assistant message announcing tool calls and before the results
              answering them. Both OpenAI and Anthropic reject that shape, so
              replaying it would break the next request outright.
            </li>
            <li>
              <strong>Turns whose adapter threw.</strong> Nothing coherent
              happened, so there is nothing worth replaying.
            </li>
          </ul>
        </Prose>
        <Callout tone="note" title="Replayed __readState values are point-in-time">
          A replayed read holds the values it captured when it ran, not current
          ones. The manifest instruction tells the model to read again when it
          needs fresh state. See{" "}
          <Link href="/pull-based-state">Pull-based state</Link>.
        </Callout>
        <Prose>
          <p>
            The transcript grows. <code>maxTurns</code> bounds growth within one
            interaction, and nothing bounds it across interactions.{" "}
            <code>clearHistory()</code> resets both records, and compaction is
            on the roadmap.
          </p>
        </Prose>
      </Section>

      <Section title="Cancellation">
        <Prose>
          <p>
            <code>send(message, {"{ signal }"})</code> takes an{" "}
            <code>AbortSignal</code>. The loop checks it before each model call
            and before each tool call, so a cancel stops the interaction before
            the next side effect. An <code>AbortError</code> from the adapter
            ends the loop the same way.
          </p>
        </Prose>
        <CodeBlock code={cancelCode} lang="ts" />
        <Prose>
          <p>
            The call resolves with <code>error.code: &apos;ABORTED&apos;</code>{" "}
            rather than throwing, keeping whatever <code>toolCalls</code>{" "}
            accumulated before the stop.{" "}
            <strong>
              <code>onError</code> deliberately does not fire on an abort
            </strong>
            , since a cancel is a caller decision rather than an application
            failure. Every other error the loop returns does reach{" "}
            <code>onError</code>.{" "}
            <Link href="/examples/cancellation">Cancellation</Link> runs it.
          </p>
        </Prose>
      </Section>

      <Section title="The turn budget">
        <Prose>
          <p>
            When <code>maxTurns</code> is exhausted while the model is still
            calling tools, the loop returns an empty <code>message</code>,
            whatever <code>toolCalls</code> accumulated, and{" "}
            <code>error.code: &apos;MAX_TURNS&apos;</code>, plus a debug
            warning. It does not throw.
          </p>
          <p>
            The default of 5 is enough for a read, an action and an answer with
            room to spare. Raise it for tasks that legitimately chain several
            tools, and keep in mind that each turn is a full request carrying
            the whole transcript so far.
          </p>
        </Prose>
      </Section>

      <Section title="Token usage">
        <Prose>
          <p>
            <code>AgentResponse.usage</code> totals prompt and completion tokens
            across every model call in the interaction, when the adapter reports
            them. A three-turn interaction reports one summed figure rather than
            three.
          </p>
        </Prose>
      </Section>

      <Section title="Tool call statuses">
        <Prose>
          <p>
            Every user tool invoked during an interaction appears in{" "}
            <code>AgentResponse.toolCalls</code> with one of five statuses, and
            each status decides what the model is told:
          </p>
        </Prose>
        <Table
          head={["Status", "Meaning", "Fed back to the model as"]}
          rows={statusRows.map(([status, meaning, fedBack]) => [
            <code key={status}>{status}</code>,
            meaning,
            <code key={`${status}-fed`}>{fedBack}</code>,
          ])}
        />
        <Prose>
          <p>
            <code>__readState</code> is absent from that list. It never appears
            in <code>toolCalls</code>, <code>onToolCall</code> or{" "}
            <code>history</code>.
          </p>
        </Prose>
      </Section>

      <NextLinks entries={nextUp} />
    </div>
  );
}
