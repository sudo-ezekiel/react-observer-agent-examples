import type { Metadata } from "next";
import type { ReactNode } from "react";
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
import { Badge } from "@/components/ui";
import { examples, guides, reference } from "@/lib/site";

export const metadata: Metadata = {
  title: "API reference",
  description:
    "Every export, prop, option, type and tool call status in react-observer-agent, in one page.",
};

const nextEntries = [...guides, ...examples, ...reference].filter((entry) =>
  ["/getting-started", "/local-example"].includes(entry.href),
);

/** The identifier column: an export, a prop, or a field. */
function term(text: string) {
  return (
    <span className="whitespace-nowrap font-mono text-xs text-indigo-700 dark:text-indigo-300">
      {text}
    </span>
  );
}

/** A type or a default, set quietly next to the identifier it belongs to. */
function mono(text: string) {
  return (
    <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
      {text}
    </span>
  );
}

/** Table cells sit outside Prose, so inline <code> needs its styling here. */
const CELL_CODE =
  "[&_code]:rounded [&_code]:bg-neutral-200 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em] [&_code]:text-neutral-800 dark:[&_code]:bg-neutral-800 dark:[&_code]:text-neutral-200";

function prose(node: ReactNode) {
  return <span className={CELL_CODE}>{node}</span>;
}

/** name, type, default, description. */
type PropRow = [string, string, string, ReactNode];

function propRows(rows: PropRow[]): ReactNode[][] {
  return rows.map(([n, t, d, description]) => [
    <span key="name">{term(n)}</span>,
    <span key="type">{mono(t)}</span>,
    <span key="default">{mono(d)}</span>,
    <span key="description">{prose(description)}</span>,
  ]);
}

/** name, type, description. For result shapes, which have no defaults. */
type FieldRow = [string, string, ReactNode];

function fieldRows(rows: FieldRow[]): ReactNode[][] {
  return rows.map(([n, t, description]) => [
    <span key="name">{term(n)}</span>,
    <span key="type">{mono(t)}</span>,
    <span key="description">{prose(description)}</span>,
  ]);
}

const PROP_HEAD = ["Name", "Type", "Default", "What it does"];
const FIELD_HEAD = ["Field", "Type", "What it holds"];

const importValues = `import {
  registerTool,
  AIAgentProvider,
  useAgent,
  openAIAdapter,
  claudeAdapter,
  validateToolNames,
  filterState,
  filterTools,
  validateToolCall,
} from 'react-observer-agent';`;

const importTypes = `import type {
  ToolDefinition,
  AnyToolDefinition,
  ToolOptions,
  AIAgentProviderProps,
  PermissionsConfig,
  AgentOptions,
  AgentContext,
  AgentResponse,
  ToolCallResult,
  ConversationEntry,
  ModelAdapter,
  ModelRequest,
  ModelResponse,
  StateSource,
  PendingToolCall,
  ToolCallEvent,
  SendOptions,
  AgentError,
  JSONSchema,
  LLMToolCall,
  LLMToolDefinition,
  ConversationMessage,
  OpenAIAdapterConfig,
  ClaudeAdapterConfig,
} from 'react-observer-agent';`;

const registerToolSignature = `function registerTool<TArgs = unknown>(
  name: string,
  handler: (args: TArgs) => unknown | Promise<unknown>,
  options?: ToolOptions,
): ToolDefinition<TArgs>;

interface ToolOptions {
  description?: string;
  parameters?: JSONSchema;
  confirm?: boolean;
}

interface ToolDefinition<TArgs = unknown> {
  name: string;
  handler: (args: TArgs) => unknown | Promise<unknown>;
  description?: string;
  parameters?: JSONSchema;
  confirm: boolean;
}

// JSON Schema, as far as the library is concerned.
type JSONSchema = Record<string, unknown>;

// A ToolDefinition with its argument type erased, so tools taking different
// argument types can share one array.
type AnyToolDefinition = ToolDefinition<any>;`;

const registerToolExample = `const addToCart = registerTool(
  'addToCart',
  (args: { productId: string }) => {
    useStore.getState().addToCart(args.productId);
    return \`Added \${args.productId} to the cart\`;
  },
  {
    description: 'Add a product to the shopping cart by id',
    parameters: {
      type: 'object',
      properties: { productId: { type: 'string' } },
      required: ['productId'],
    },
    confirm: true,
  },
);`;

const providerSignature = `interface AIAgentProviderProps {
  model: ModelAdapter;
  state: StateSource;
  tools: AnyToolDefinition[];
  permissions: PermissionsConfig;
  options?: AgentOptions;
  children: React.ReactNode;
}

interface PermissionsConfig {
  canAccess: string[];
  canExecute: string[];
  stateDescriptions?: Record<string, string>;
}

interface AgentOptions {
  debug?: boolean;
  maxTurns?: number;
  systemPrompt?: string;
  onError?: (error: AgentError) => void;
  onToolCall?: (call: ToolCallEvent) => void;
  onConfirm?: (call: PendingToolCall) => Promise<boolean>;
}

interface PendingToolCall {
  toolName: string;
  args: unknown;
  description?: string;
}

interface ToolCallEvent {
  toolName: string;
  args: unknown;
  result: unknown;
  status: 'success' | 'error' | 'denied' | 'confirmed' | 'cancelled';
}`;

const useAgentSignature = `function useAgent(): AgentContext;

interface AgentContext {
  send: (message: string, options?: SendOptions) => Promise<AgentResponse>;
  isProcessing: boolean;
  history: ConversationEntry[];
  clearHistory: () => void;
  lastResponse: AgentResponse | null;
}

interface SendOptions {
  signal?: AbortSignal;
}

interface AgentResponse {
  message: string;
  toolCalls: ToolCallResult[];
  error?: AgentError;
  usage?: { promptTokens: number; completionTokens: number };
}

interface ToolCallResult {
  toolName: string;
  args: unknown;
  result: unknown;
  status: 'success' | 'error' | 'denied' | 'confirmed' | 'cancelled';
}

interface ConversationEntry {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ToolCallResult[];
  timestamp: number;
}

interface AgentError {
  message: string;
  code?: string;
  cause?: unknown;
}`;

const adapterSignature = `interface ModelAdapter {
  sendMessage(request: ModelRequest): Promise<ModelResponse>;
}

interface ModelRequest {
  messages: ConversationMessage[];
  tools: LLMToolDefinition[];
  state: Record<string, unknown>;
  systemPrompt?: string;
  stateManifest?: { key: string; description: string }[];
  signal?: AbortSignal;
}

interface ModelResponse {
  content: string | null;
  toolCalls?: LLMToolCall[];
  usage?: { promptTokens: number; completionTokens: number };
}

interface ConversationMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  toolCalls?: LLMToolCall[];
}

interface LLMToolCall {
  id: string;
  name: string;
  arguments: unknown;
}

interface LLMToolDefinition {
  name: string;
  description: string;
  parameters: JSONSchema;
}`;

const adapterConfigs = `function openAIAdapter(config: OpenAIAdapterConfig): ModelAdapter;

interface OpenAIAdapterConfig {
  apiKey?: string;
  model?: string;
  baseURL?: string;
  temperature?: number;
  headers?: Record<string, string>;
}

function claudeAdapter(config: ClaudeAdapterConfig): ModelAdapter;

interface ClaudeAdapterConfig {
  apiKey?: string;
  model?: string;
  baseURL?: string;
  maxTokens?: number;
  headers?: Record<string, string>;
}`;

const stateSourceSignature = `type StateSource = object | (() => object);

// Object form: a fresh object on every render, so React state works as is.
<AIAgentProvider state={{ user, cart }} ... />

// Getter form: called each time state is resolved, inside the agent loop.
<AIAgentProvider state={() => useStore.getState()} ... />`;

const readStateToolDef = `{
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

export default function ApiReferencePage() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        title="API reference"
        lead="Nine value exports and the types behind them. Every default listed here is the one the library applies at runtime."
      />

      <Section title="Exports">
        <CodeBlock code={importValues} lang="ts" />
        <Table
          head={["Export", "Kind", "What it is"]}
          rows={[
            [
              term("registerTool"),
              "function",
              "Builds a validated tool definition from a name, a handler and options.",
            ],
            [
              term("AIAgentProvider"),
              "component",
              "Wires model, state, tools and permissions together and publishes the agent context.",
            ],
            [
              term("useAgent"),
              "hook",
              "Reads that context. Throws outside a provider.",
            ],
            [
              term("openAIAdapter"),
              "function",
              "Chat completions with function calling.",
            ],
            [
              term("claudeAdapter"),
              "function",
              "The Anthropic Messages API with tool use.",
            ],
            [
              term("validateToolNames"),
              "function",
              "Throws on a reserved __ prefix or a duplicate name. The provider calls it on mount.",
            ],
            [
              term("filterState"),
              "function",
              "Copies the canAccess keys out of a state object.",
            ],
            [
              term("filterTools"),
              "function",
              "Keeps the tools whose names appear in canExecute.",
            ],
            [
              term("validateToolCall"),
              "function",
              "Returns whether a tool name is in canExecute.",
            ],
          ]}
        />
        <Prose>
          <p>
            The last four are building blocks, exported for tests and custom
            wiring. The provider already calls them on the paths that matter, so
            a typical app never calls them directly.
          </p>
        </Prose>
        <CodeBlock code={importTypes} lang="ts" />
      </Section>

      <Section title="registerTool">
        <CodeBlock code={registerToolSignature} lang="ts" />
        <Table
          head={PROP_HEAD}
          rows={propRows([
            [
              "description",
              "string",
              "undefined",
              <>
                Shown to the model. A tool without one is hidden from the model
                entirely, though it stays executable if the model names it
                anyway, since <code>canExecute</code> is the authority.
              </>,
            ],
            [
              "parameters",
              "JSONSchema",
              "undefined",
              <>
                JSON Schema for the arguments. When omitted, the provider
                advertises{" "}
                <code>{`{ type: 'object', properties: {} }`}</code> to the model
                and runs no argument validation.
              </>,
            ],
            [
              "confirm",
              "boolean",
              "false",
              <>
                Routes every invocation through <code>options.onConfirm</code>{" "}
                before the handler runs.
              </>,
            ],
          ])}
        />
        <CodeBlock code={registerToolExample} lang="ts" />
        <Prose>
          <ul>
            <li>
              The handler return value is serialized and fed back to the model,
              so return something it can use (<code>Added Headphones to cart</code>)
              rather than <code>undefined</code>.
            </li>
            <li>
              Names beginning with <code>__</code> are reserved for internal
              tools. <code>__readState</code> is the only one today.
            </li>
            <li>
              Names must be unique across the tools passed to a single provider.
              Uniqueness is enforced by the provider on mount rather than at
              registration, so tools can be composed from independent modules
              without global coordination. The provider throws on a duplicate.
            </li>
            <li>
              Argument validation covers a subset of JSON Schema:{" "}
              <code>type</code>, <code>properties</code>, <code>required</code>,{" "}
              <code>items</code> and <code>enum</code>. Keywords outside that
              set pass through untouched, so treat <code>args</code> as
              untrusted inside the handler.
            </li>
          </ul>
        </Prose>
      </Section>

      <Section title="AIAgentProvider">
        <CodeBlock code={providerSignature} lang="ts" />
        <Table
          head={PROP_HEAD}
          rows={propRows([
            [
              "model",
              "ModelAdapter",
              "required",
              "The adapter every turn is sent through.",
            ],
            [
              "state",
              "StateSource",
              "required",
              "An object, or a getter returning one. Only canAccess keys ever leave it.",
            ],
            [
              "tools",
              "AnyToolDefinition[]",
              "required",
              "Everything registerTool produced. Names are validated on mount.",
            ],
            [
              "permissions",
              "PermissionsConfig",
              "required",
              "The two allowlists, plus the optional manifest descriptions.",
            ],
            ["options", "AgentOptions", "undefined", "Loop settings and callbacks."],
            [
              "children",
              "React.ReactNode",
              "required",
              "The tree that can call useAgent().",
            ],
          ])}
        />

        <Prose>
          <p>
            <strong>PermissionsConfig</strong>
          </p>
        </Prose>
        <Table
          head={PROP_HEAD}
          rows={propRows([
            [
              "canAccess",
              "string[]",
              "required",
              <>
                State keys the agent may read. The list becomes the manifest in
                the system prompt, and <code>__readState</code> requests are
                filtered back down to it.
              </>,
            ],
            [
              "canExecute",
              "string[]",
              "required",
              "Tool names the agent may invoke. A registered tool absent from this list is never shown to the model and is rejected if it asks for it.",
            ],
            [
              "stateDescriptions",
              "Record<string, string>",
              "undefined",
              "Per-key descriptions for the manifest. A key with no entry falls back to its own name.",
            ],
          ])}
        />

        <Prose>
          <p>
            <strong>AgentOptions</strong>
          </p>
        </Prose>
        <Table
          head={PROP_HEAD}
          rows={propRows([
            [
              "debug",
              "boolean",
              "false",
              <>
                Logs the manifest, the exposed tool list, each turn, every{" "}
                <code>__readState</code> round trip and every tool outcome,
                prefixed <code>[react-observer-agent]</code>.
              </>,
            ],
            [
              "maxTurns",
              "number",
              "5",
              <>
                Model round trips allowed per <code>send()</code>. Exhausting
                the budget returns <code>error.code: MAX_TURNS</code>.
              </>,
            ],
            [
              "systemPrompt",
              "string",
              "undefined",
              "Joined ahead of the generated manifest prompt, separated by a blank line.",
            ],
            [
              "onError",
              "(error: AgentError) => void",
              "undefined",
              <>
                Called when an interaction fails, including errors the loop
                returns rather than throws. <code>ABORTED</code> is the one
                exception, since a cancel is a caller decision.
              </>,
            ],
            [
              "onToolCall",
              "(call: ToolCallEvent) => void",
              "undefined",
              <>
                Fires once per user tool outcome, whatever the status. Never for{" "}
                <code>__readState</code>.
              </>,
            ],
            [
              "onConfirm",
              "(call: PendingToolCall) => Promise<boolean>",
              "undefined",
              <>
                Approval handler for <code>confirm: true</code> tools. Without
                one, those tools are skipped as <code>cancelled</code>.
              </>,
            ],
          ])}
        />
        <Prose>
          <p>
            The provider reads <code>model</code>, <code>state</code>,{" "}
            <code>tools</code>, <code>permissions</code> and{" "}
            <code>options</code> through refs, so prop updates take effect on
            the next <code>send()</code> and an in-flight interaction keeps the
            values it started with.
          </p>
        </Prose>
      </Section>

      <Section title="useAgent">
        <CodeBlock code={useAgentSignature} lang="ts" />
        <Table
          head={FIELD_HEAD}
          rows={fieldRows([
            [
              "send",
              "(message, options?) => Promise<AgentResponse>",
              <>
                Runs one interaction. It resolves rather than rejects: failures
                arrive as <code>response.error</code>.
              </>,
            ],
            [
              "isProcessing",
              "boolean",
              "True while an interaction is in flight.",
            ],
            [
              "history",
              "ConversationEntry[]",
              "One user entry per send, one assistant entry per completed response. Scoped to the provider instance.",
            ],
            [
              "clearHistory",
              "() => void",
              "Clears the history, the last response, and the replayed model transcript.",
            ],
            [
              "lastResponse",
              "AgentResponse | null",
              "The most recent response, error responses included.",
            ],
          ])}
        />

        <Prose>
          <p>
            <strong>AgentResponse</strong>
          </p>
        </Prose>
        <Table
          head={FIELD_HEAD}
          rows={fieldRows([
            [
              "message",
              "string",
              "The final text. Empty when the interaction ended on MAX_TURNS or ABORTED.",
            ],
            [
              "toolCalls",
              "ToolCallResult[]",
              "Every user tool touched during the interaction, at every status. __readState is excluded.",
            ],
            [
              "error",
              "AgentError | undefined",
              "Present when the interaction failed or was cancelled.",
            ],
            [
              "usage",
              "{ promptTokens, completionTokens }",
              "Totalled across the turns of the interaction. Undefined when no adapter response reported usage, rather than a zero.",
            ],
          ])}
        />
        <Prose>
          <ul>
            <li>
              Tool activity rides on the assistant entry of{" "}
              <code>history</code>. Standalone <code>tool</code> entries are
              reserved for future use.
            </li>
            <li>
              Each <code>send()</code> replays the prior model-facing
              transcript, assistant tool calls and the results answering them
              included, so the agent can reason about what it already did. The
              provider keeps that transcript separately from{" "}
              <code>history</code>.
            </li>
            <li>
              An aborted turn is not added to the transcript. A cancel can land
              between an assistant tool call and its result, and providers
              reject that shape. A turn whose adapter threw is dropped the same
              way.
            </li>
            <li>
              Replayed <code>__readState</code> results hold the values read at
              the time. The manifest instruction tells the model to re-read when
              it needs current values.
            </li>
          </ul>
        </Prose>
        <Callout tone="note" title="AgentError codes">
          <code>MAX_TURNS</code> when the turn budget runs out while the model
          is still calling tools, and <code>ABORTED</code> when the{" "}
          <code>signal</code> passed to <code>send()</code> fires. An adapter
          that throws produces an error with a message and a <code>cause</code>{" "}
          and no code.
        </Callout>
      </Section>

      <Section title="Tool call statuses">
        <Prose>
          <p>
            Every entry in <code>AgentResponse.toolCalls</code> carries one of
            five statuses. The last column is what the model receives as the
            tool result, which is what shapes its next turn.
          </p>
        </Prose>
        <Table
          head={["Status", "Meaning", "Fed back to the model as"]}
          rows={[
            [
              <Badge key="s" tone="success">
                success
              </Badge>,
              "The handler ran and returned. No confirmation was required.",
              mono("{ result }"),
            ],
            [
              <Badge key="s" tone="confirmed">
                confirmed
              </Badge>,
              <>
                A <code>confirm: true</code> tool that <code>onConfirm</code>{" "}
                approved, then ran.
              </>,
              mono("{ result }"),
            ],
            [
              <Badge key="s" tone="cancelled">
                cancelled
              </Badge>,
              <>
                A <code>confirm: true</code> tool the user denied, or one with
                no <code>onConfirm</code> handler to ask.
              </>,
              mono("{ status: 'cancelled', reason }"),
            ],
            [
              <Badge key="s" tone="denied">
                denied
              </Badge>,
              <>
                The name failed the <code>canExecute</code> check after the
                model asked for it.
              </>,
              mono("{ error }"),
            ],
            [
              <Badge key="s" tone="error">
                error
              </Badge>,
              <>
                The handler threw, or the arguments failed the{" "}
                <code>parameters</code> schema. A validation failure means the
                handler never ran.
              </>,
              mono("{ error }"),
            ],
          ]}
        />
        <Prose>
          <p>
            <code>onToolCall</code> fires for each of these, with one edge case:
            a name that passes <code>canExecute</code> but has no matching tool
            definition is recorded as <code>denied</code> in{" "}
            <code>toolCalls</code> without firing the callback.
          </p>
          <p>
            <Link href="/permissions">Permissions and safety</Link> walks
            through where each status comes from, with a runnable demo per
            outcome.
          </p>
        </Prose>
      </Section>

      <Section title="Adapters">
        <Prose>
          <p>
            An adapter is one method. Implement it and the provider will drive
            any backend you like.
          </p>
        </Prose>
        <CodeBlock code={adapterSignature} lang="ts" />
        <Table
          head={FIELD_HEAD}
          rows={fieldRows([
            [
              "messages",
              "ConversationMessage[]",
              "A snapshot of the turn transcript, in order. Safe to hold across awaits.",
            ],
            [
              "tools",
              "LLMToolDefinition[]",
              "The allowed tools that have a description, plus __readState when the manifest is non-empty.",
            ],
            [
              "state",
              "Record<string, unknown>",
              "Always an empty object since the pull refactor. Kept for compatibility.",
            ],
            [
              "systemPrompt",
              "string | undefined",
              "options.systemPrompt joined with the generated manifest prompt.",
            ],
            [
              "stateManifest",
              "{ key, description }[]",
              "Informational. It is already baked into systemPrompt.",
            ],
            [
              "signal",
              "AbortSignal | undefined",
              "Forward it to the transport so the request cancels in flight.",
            ],
          ])}
        />
        <Prose>
          <p>An adapter must:</p>
          <ul>
            <li>Map all three message roles to the native format, in order.</li>
            <li>
              Serialize <code>toolCalls</code> on assistant messages into the
              native structure (OpenAI <code>tool_calls</code>, Anthropic{" "}
              <code>tool_use</code> blocks). Providers reject a tool result that
              does not follow the assistant message carrying the matching call.
            </li>
            <li>
              Link tool messages to their call through <code>toolCallId</code>{" "}
              (OpenAI <code>tool_call_id</code>, Anthropic{" "}
              <code>tool_use_id</code>).
            </li>
            <li>
              Parse tool-call arguments into <code>LLMToolCall.arguments</code>.
              Both built-in adapters fall back to the raw string when the JSON
              is malformed.
            </li>
            <li>
              Throw on network failures, non-2xx responses and malformed
              payloads. The provider turns a throw into{" "}
              <code>AgentResponse.error</code> and calls <code>onError</code>.
            </li>
            <li>
              Rethrow an <code>AbortError</code> unchanged instead of rewrapping
              it. The loop identifies cancellation by that error name.
            </li>
          </ul>
        </Prose>

        <CodeBlock code={adapterConfigs} lang="ts" />

        <Prose>
          <p>
            <strong>openAIAdapter</strong>
          </p>
        </Prose>
        <Table
          head={PROP_HEAD}
          rows={propRows([
            [
              "apiKey",
              "string",
              "undefined",
              <>
                Sent as <code>Authorization: Bearer</code>. Development only.
              </>,
            ],
            ["model", "string", "'gpt-4o'", "Model id sent with every request."],
            [
              "baseURL",
              "string",
              "'https://api.openai.com/v1'",
              <>
                Trailing slashes are stripped. <code>/chat/completions</code> is
                appended unless the URL already contains it.
              </>,
            ],
            [
              "temperature",
              "number",
              "0.2",
              "Sent on every request.",
            ],
            [
              "headers",
              "Record<string, string>",
              "undefined",
              <>
                Merged after <code>Content-Type</code> and before the{" "}
                <code>Authorization</code> header derived from{" "}
                <code>apiKey</code>.
              </>,
            ],
          ])}
        />

        <Prose>
          <p>
            <strong>claudeAdapter</strong>
          </p>
        </Prose>
        <Table
          head={PROP_HEAD}
          rows={propRows([
            [
              "apiKey",
              "string",
              "undefined",
              <>
                Sent as <code>x-api-key</code>. Development only.
              </>,
            ],
            [
              "model",
              "string",
              "'claude-opus-5'",
              "Model id sent with every request.",
            ],
            [
              "baseURL",
              "string",
              "'https://api.anthropic.com'",
              <>
                Trailing slashes are stripped. <code>/v1/messages</code> is
                appended unless the URL already contains it.
              </>,
            ],
            [
              "maxTokens",
              "number",
              "16000",
              <>
                Sent as <code>max_tokens</code>, which the Anthropic API
                requires.
              </>,
            ],
            [
              "headers",
              "Record<string, string>",
              "undefined",
              "Spread last, so it can override anything the adapter sets, including the browser CORS opt-in header.",
            ],
          ])}
        />
        <Prose>
          <p>
            Both adapters require either <code>apiKey</code> or{" "}
            <code>baseURL</code> and throw at initialization when given neither.{" "}
            <code>claudeAdapter</code> sends{" "}
            <code>anthropic-version: 2023-06-01</code> and no sampling
            parameters, which current Claude models reject.
          </p>
        </Prose>
        <Callout tone="warn" title="API keys belong on a server">
          Passing <code>apiKey</code> ships the key to the browser, where it is
          visible in DevTools and in every request. For production, point{" "}
          <code>baseURL</code> at your own endpoint and authenticate the user
          with <code>headers</code>. The backend holds the real key, applies
          rate limits, and forwards to the provider.{" "}
          <Link href="/adapters">Adapters</Link> has the full pattern.
        </Callout>
      </Section>

      <Section title="StateSource">
        <CodeBlock code={stateSourceSignature} lang="tsx" />
        <Prose>
          <p>
            The type is <code>object</code> rather than{" "}
            <code>Record&lt;string, unknown&gt;</code> on purpose. Store
            interfaces are usually declared with named fields and no index
            signature, and <code>Record&lt;string, unknown&gt;</code> would
            reject them, forcing a cast at every call site. Any object shape is
            accepted instead, and the permission layer decides what can be read
            out of it.
          </p>
          <p>
            The getter is called inside the agent loop, outside React rendering,
            so it must not call hooks. Pass{" "}
            <code>{`() => useStore.getState()`}</code>, never the hook itself.
          </p>
        </Prose>
      </Section>

      <Section title="__readState">
        <Prose>
          <p>
            The one internal tool. It is appended to the tool list whenever the
            manifest is non-empty, and the model calls it to pull the values it
            needs.
          </p>
        </Prose>
        <CodeBlock code={readStateToolDef} lang="json" />
        <Prose>
          <p>
            Requested keys are intersected with <code>canAccess</code> and
            anything else is dropped. The state source is resolved at call time,
            filtered, and serialized. Values that cannot survive{" "}
            <code>JSON.stringify</code>, functions, symbols, bigints and
            circular references, are stripped, with a warning in debug mode.
          </p>
          <p>
            The round trip never appears in <code>history</code>,{" "}
            <code>AgentResponse.toolCalls</code> or <code>onToolCall</code>. It
            exists only inside the model-facing message list.{" "}
            <Link href="/pull-based-state">Pull-based state</Link> covers the
            reasoning.
          </p>
        </Prose>
      </Section>

      <NextLinks entries={nextEntries} />
    </div>
  );
}
