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
  AdapterError,
  validateToolNames,
  filterState,
  filterTools,
  validateToolCall,
  validateToolArgs,
} from 'react-observer-agent';`;

const importTypes = `import type {
  ToolDefinition,
  AnyToolDefinition,
  ToolOptions,
  ToolHandler,
  ToolContext,
  ToolArgsValidation,
  AIAgentProviderProps,
  PermissionsConfig,
  AgentOptions,
  AgentEvent,
  AgentContext,
  AgentResponse,
  TokenUsage,
  ToolCallResult,
  ToolCallStatus,
  ConversationEntry,
  ModelAdapter,
  ModelRequest,
  ModelResponse,
  StopReason,
  StateSource,
  PendingToolCall,
  ToolCallEvent,
  SendOptions,
  AgentError,
  AgentErrorCode,
  JSONSchema,
  LLMToolCall,
  LLMToolDefinition,
  ConversationMessage,
  OpenAIAdapterConfig,
  ClaudeAdapterConfig,
  StandardSchemaV1,
  StandardSchemaProps,
  StandardSchemaResult,
  StandardSchemaIssue,
  InferSchemaOutput,
} from 'react-observer-agent';`;

const registerToolSignature = `// Two overloads, in declaration order. With a schema the handler's argument
// type comes from the schema output; without one it is the handler's own.
function registerTool<S extends StandardSchemaV1>(
  name: string,
  handler: ToolHandler<InferSchemaOutput<S>>,
  options: ToolOptions & { schema: S },
): ToolDefinition<InferSchemaOutput<S>>;

function registerTool<TArgs = unknown>(
  name: string,
  handler: ToolHandler<TArgs>,
  options?: ToolOptions,
): ToolDefinition<TArgs>;

type ToolHandler<TArgs = unknown> = (
  args: TArgs,
  context?: ToolContext,
) => unknown | Promise<unknown>;

interface ToolContext {
  signal?: AbortSignal;
}

interface ToolOptions {
  description?: string;
  parameters?: JSONSchema;
  schema?: StandardSchemaV1;
  confirm?: boolean;
}

interface ToolDefinition<TArgs = unknown> {
  name: string;
  handler: ToolHandler<TArgs>;
  description?: string;
  parameters?: JSONSchema;
  schema?: StandardSchemaV1;
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

const registerToolSchemaExample = `import { z } from 'zod';

const AddToCart = z.object({
  productId: z.string(),
  qty: z.number().default(1),
});

const addToCart = registerTool(
  'addToCart',
  // args is { productId: string; qty: number }, inferred from the schema.
  async (args, context) => {
    await syncCart(args.productId, args.qty, { signal: context?.signal });
    return \`Added \${args.qty} x \${args.productId} to the cart\`;
  },
  {
    description: 'Add a product to the shopping cart by id',
    parameters: {
      type: 'object',
      properties: {
        productId: { type: 'string' },
        qty: { type: 'number' },
      },
      required: ['productId'],
    },
    schema: AddToCart,
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
  maxStateBytes?: number;
  onError?: (error: AgentError) => void;
  onToolCall?: (call: ToolCallEvent) => void;
  onConfirm?: (call: PendingToolCall) => Promise<boolean>;
  onEvent?: (event: AgentEvent) => void;
}

interface PendingToolCall {
  toolName: string;
  args: unknown;
  description?: string;
  signal?: AbortSignal;
}

interface ToolCallEvent {
  toolName: string;
  args: unknown;
  result: unknown;
  status: ToolCallStatus;
}

type ToolCallStatus =
  | 'success'
  | 'error'
  | 'denied'
  | 'confirmed'
  | 'cancelled';

type AgentEvent =
  | { type: 'turn_start'; turn: number; maxTurns: number }
  | { type: 'state_read'; requested: string[]; keys: string[] }
  | { type: 'tool_start'; toolName: string; args: unknown }
  | {
      type: 'tool_end';
      toolName: string;
      args: unknown;
      result: unknown;
      status: ToolCallStatus;
    };`;

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
  usage?: TokenUsage;
}

interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  // The cached part of promptTokens, when the provider reports it.
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
}

interface ToolCallResult {
  toolName: string;
  args: unknown;
  result: unknown;
  status: ToolCallStatus;
}

interface ConversationEntry {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ToolCallResult[];
  // Assistant entries only: the error the interaction ended with.
  error?: AgentError;
  timestamp: number;
}

interface AgentError {
  message: string;
  code?: AgentErrorCode;
  // The HTTP status, when the failure came from an adapter that had one.
  status?: number;
  cause?: unknown;
}

type AgentErrorCode =
  | 'ABORTED'
  | 'MAX_TURNS'
  | 'ADAPTER_ERROR'
  | 'TRUNCATED'
  | 'REFUSED';`;

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
  usage?: TokenUsage;
  stopReason?: StopReason;
  providerData?: unknown;
}

type StopReason = 'end' | 'tool_use' | 'max_tokens' | 'refusal' | 'other';

interface ConversationMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  toolCalls?: LLMToolCall[];
  // Tool messages only: the result reports a failure.
  isError?: boolean;
  // Adapter-owned. The loop copies it from ModelResponse and replays it.
  providerData?: unknown;
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
}

class AdapterError extends Error {
  readonly name: 'AdapterError';
  readonly status?: number;
  readonly body?: string;
  constructor(
    message: string,
    options?: { status?: number; body?: string; cause?: unknown },
  );
}`;

const adapterConfigs = `function openAIAdapter(config: OpenAIAdapterConfig): ModelAdapter;

interface OpenAIAdapterConfig {
  apiKey?: string;
  model?: string;
  baseURL?: string;
  // Defaults to 0.2. Null omits the field from the request.
  temperature?: number | null;
  headers?: Record<string, string>;
}

function claudeAdapter(config: ClaudeAdapterConfig): ModelAdapter;

interface ClaudeAdapterConfig {
  apiKey?: string;
  model?: string;
  baseURL?: string;
  maxTokens?: number;
  // Prompt caching for tools and the system prompt. Defaults to true.
  cache?: boolean;
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
        lead="Eleven value exports and the types behind them. Every default listed here is the one the library applies at runtime."
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
              term("AdapterError"),
              "class",
              "The error both built-in adapters throw. Carries the HTTP status and the raw response body when the failure came from a response.",
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
            [
              term("validateToolArgs"),
              "function",
              "Runs the same schema-or-parameters check the loop runs and returns a ToolArgsValidation, either the validated value or the errors. Async, since a Standard Schema validator may be.",
            ],
          ]}
        />
        <Prose>
          <p>
            The last five are building blocks, exported for tests and custom
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
              "schema",
              "StandardSchemaV1",
              "undefined",
              <>
                A Standard Schema validator (Zod 3.24+, Valibot 1+, ArkType 2+).
                It replaces the built-in subset check, the handler receives the
                validated value, and the handler&apos;s argument type is
                inferred from the schema output. <code>parameters</code> still
                supplies the JSON Schema the model sees, since the library
                derives nothing from the validator.
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
              Handlers are called as <code>handler(args, {"{ signal }"})</code>.
              A handler written against an older version takes one argument, so
              the context is optional and reads as <code>context?.signal</code>.
              Forward it to <code>fetch</code> or any other long work: an abort
              ends the loop&apos;s wait either way, but only the handler can
              stop the work itself.
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
              untrusted inside the handler. A tool carrying a{" "}
              <code>schema</code> skips that subset entirely and validates
              through the validator instead.
            </li>
            <li>
              <code>validateToolArgs(tool, args)</code> runs the same check the
              loop runs and resolves to <code>{`{ valid: true, value }`}</code>{" "}
              or <code>{`{ valid: false, errors }`}</code>. The{" "}
              <code>value</code> is what the handler should receive, since a
              schema can apply defaults and transforms.
            </li>
          </ul>
        </Prose>
        <CodeBlock code={registerToolSchemaExample} lang="ts" />
        <Prose>
          <ul>
            <li>
              The argument type comes from the schema output, so annotating the
              handler is optional. An annotation that disagrees with the schema
              is a compile error rather than a silent fallback.{" "}
              <code>InferSchemaOutput&lt;S&gt;</code> is that output type,
              exported for anyone typing a handler by hand.
            </li>
            <li>
              <code>StandardSchemaV1</code> is the package&apos;s own copy of
              the{" "}
              <a
                href="https://standardschema.dev"
                target="_blank"
                rel="noreferrer"
              >
                Standard Schema
              </a>{" "}
              interface, with <code>StandardSchemaProps</code>,{" "}
              <code>StandardSchemaResult</code> and{" "}
              <code>StandardSchemaIssue</code> exported alongside it. Copying
              the spec is what keeps the package dependency free while accepting
              validators from three libraries.
            </li>
            <li>
              An explicit type argument next to an inline schema (
              <code>registerTool&lt;T&gt;(name, handler, {"{ schema }"})</code>)
              is a compile error at the <code>schema</code> property, whether or
              not the two agree. The type argument turns inference off, which
              would leave two unchecked sources of truth for the argument type.
              Drop it and let the schema supply the type.
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
              "maxStateBytes",
              "number",
              "undefined",
              <>
                Per-key byte ceiling on a <code>__readState</code> result, unset
                meaning no limit. A value over it is replaced with{" "}
                <code>{`{ __truncated: true, limit, bytes, preview }`}</code>,
                so one oversized key cannot spend the whole context window.
              </>,
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
                one, those tools are skipped as <code>cancelled</code>. The
                pending call carries the interaction&apos;s{" "}
                <code>signal</code>, so a confirmation UI can close itself when
                the interaction is cancelled underneath it.
              </>,
            ],
            [
              "onEvent",
              "(event: AgentEvent) => void",
              "undefined",
              <>
                Observation only. Fires <code>turn_start</code>,{" "}
                <code>state_read</code>, <code>tool_start</code> and{" "}
                <code>tool_end</code> as the loop runs.
              </>,
            ],
          ])}
        />

        <Prose>
          <p>
            <strong>AgentEvent</strong>
          </p>
        </Prose>
        <Table
          head={["Event", "Fields", "When it fires"]}
          rows={[
            [
              term("turn_start"),
              mono("turn, maxTurns"),
              prose(
                <>
                  Right before each model call. <code>turn</code> counts from 1.
                </>,
              ),
            ],
            [
              term("state_read"),
              mono("requested, keys"),
              prose(
                <>
                  After a <code>__readState</code> call resolves.{" "}
                  <code>requested</code> is what the model asked for,{" "}
                  <code>keys</code> what survived <code>canAccess</code>. A call
                  whose arguments fail the schema is answered with an error and
                  fires nothing.
                </>,
              ),
            ],
            [
              term("tool_start"),
              mono("toolName, args"),
              prose(
                <>
                  Before the <code>canExecute</code> check, with the raw
                  arguments from the model, so a denied call is as visible as an
                  executed one.
                </>,
              ),
            ],
            [
              term("tool_end"),
              mono("toolName, args, result, status"),
              prose(
                <>
                  Once per <code>tool_start</code>, with the final status.{" "}
                  <code>args</code> is the validated value once the schema has
                  run, and the raw model arguments on a call that was denied or
                  failed validation.
                </>,
              ),
            ],
          ]}
        />
        <Prose>
          <p>
            <code>onToolCall</code> reports a tool after the fact and never
            reports <code>__readState</code>. <code>onEvent</code> brackets each
            tool with a start and an end, and <code>state_read</code> is the one
            place a state read is visible at all, which makes it the hook to
            wire progress UI and telemetry to.
          </p>
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
                Runs one interaction, queued behind any already in flight. It
                resolves rather than rejects: failures arrive as{" "}
                <code>response.error</code>. The one exception is an{" "}
                <code>onError</code> callback that throws, which rejects{" "}
                <code>send()</code> after the records are written.
              </>,
            ],
            [
              "isProcessing",
              "boolean",
              <>
                True from the first <code>send()</code> until the last one
                queued behind it settles.
              </>,
            ],
            [
              "history",
              "ConversationEntry[]",
              <>
                One user entry per <code>send()</code> and one assistant entry
                per <code>send()</code>, success or failure alike, so history
                always alternates user, assistant. A failed or aborted
                interaction puts its error on{" "}
                <code>ConversationEntry.error</code>, and its content follows{" "}
                <code>AgentResponse.message</code>: the partial or refusal text
                on <code>TRUNCATED</code> or <code>REFUSED</code>, empty
                otherwise. Scoped to the provider instance.
              </>,
            ],
            [
              "clearHistory",
              "() => void",
              <>
                Clears the history, the last response, and the replayed model
                transcript. Called while an interaction is running, it discards
                that interaction too: its <code>send()</code> still resolves and{" "}
                <code>onError</code> still fires, but nothing it produced lands
                anywhere.
              </>,
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
              "The final text. Empty when the interaction ended on MAX_TURNS or ABORTED, and the partial or refusal text when it ended on TRUNCATED or REFUSED.",
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
              "TokenUsage | undefined",
              <>
                Totalled across the turns of the interaction. Undefined when no
                adapter response reported usage, rather than a zero.{" "}
                <code>promptTokens</code> is the whole input, cached tokens
                included; <code>cacheReadTokens</code> and{" "}
                <code>cacheWriteTokens</code> break that cached part out when
                the provider reports it.
              </>,
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
        <Prose>
          <p>
            <strong>AgentErrorCode</strong>
          </p>
        </Prose>
        <Table
          head={["Code", "When it is set", "What comes with it"]}
          rows={[
            [
              term("ABORTED"),
              prose(
                <>
                  The <code>signal</code> passed to <code>send()</code> fired,
                  or the provider unmounted.
                </>,
              ),
              prose(
                <>
                  An empty <code>message</code>. The one code that does not
                  reach <code>onError</code>, since a cancel is a caller
                  decision.
                </>,
              ),
            ],
            [
              term("MAX_TURNS"),
              prose(
                "The turn budget ran out while the model was still calling tools, so it never got to answer.",
              ),
              prose(
                <>
                  An empty <code>message</code>. The tool calls made along the
                  way are still in <code>toolCalls</code>.
                </>,
              ),
            ],
            [
              term("ADAPTER_ERROR"),
              prose(
                <>
                  The adapter threw an <code>AdapterError</code>. Both built-in
                  adapters throw one on every failure path.
                </>,
              ),
              prose(
                <>
                  <code>error.status</code> when the failure came from a non-2xx
                  response, absent on a network failure or an unparseable body.{" "}
                  <code>error.cause</code> is the <code>AdapterError</code>,
                  which also carries the raw <code>body</code>.
                </>,
              ),
            ],
            [
              term("TRUNCATED"),
              prose("The model hit its output token limit."),
              prose(
                <>
                  The partial text, in <code>message</code>.
                </>,
              ),
            ],
            [
              term("REFUSED"),
              prose("The model declined to answer."),
              prose(
                <>
                  Whatever text came back, in <code>message</code>.
                </>,
              ),
            ],
          ]}
        />
        <Callout tone="note" title="An exception with no code">
          Only an <code>AdapterError</code> becomes{" "}
          <code>ADAPTER_ERROR</code>. Anything else thrown at the provider, a
          custom adapter raising a plain <code>Error</code> or a throwing{" "}
          <code>onToolCall</code>, still produces an error with a message and a{" "}
          <code>cause</code> and no code. It reaches <code>onError</code> like
          any other failure.
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
                no <code>onConfirm</code> handler to ask. An approval that
                arrives after the interaction was cancelled lands here too,
                without running the handler.
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
                The handler threw, or the arguments failed the tool&apos;s{" "}
                <code>schema</code> or <code>parameters</code> check. A
                validation failure means the handler never ran.
              </>,
              mono("{ error }"),
            ],
          ]}
        />
        <Prose>
          <p>
            <code>onToolCall</code> fires for each of these, including a name
            that passes <code>canExecute</code> but has no matching tool
            definition. Before 0.3.0 that case landed in <code>toolCalls</code>{" "}
            as <code>denied</code> without firing the callback.{" "}
            <code>onEvent</code> reports the same outcomes as{" "}
            <code>tool_end</code>, one per <code>tool_start</code>.
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
              Throwing an <code>AdapterError</code> is what gets the failure
              reported as <code>ADAPTER_ERROR</code> with a{" "}
              <code>status</code>; a plain <code>Error</code> arrives with no
              code.
            </li>
            <li>
              Rethrow an <code>AbortError</code> unchanged instead of rewrapping
              it. The loop identifies cancellation by that error name.
            </li>
            <li>
              Skip an assistant message with empty content and no{" "}
              <code>toolCalls</code>. Both providers reject an empty assistant
              turn, and the loop already keeps the final one out of the
              transcript.
            </li>
          </ul>
          <p>And should:</p>
          <ul>
            <li>
              Report <code>stopReason</code>. With no tool calls in the
              response, <code>max_tokens</code> becomes <code>TRUNCATED</code>{" "}
              and <code>refusal</code> becomes <code>REFUSED</code>. A missing
              one reads as a normal end, and tool calls are processed whatever
              the stop reason.
            </li>
            <li>
              Report <code>usage</code> with <code>promptTokens</code> as the
              total input for the call, cached tokens included, and break the
              cached part out into <code>cacheReadTokens</code> and{" "}
              <code>cacheWriteTokens</code> when the provider reports it.
            </li>
            <li>
              Set <code>providerData</code> when the provider needs something
              back unchanged, and prefer it over rebuilding the message when it
              comes back on an assistant message. This is what keeps Anthropic
              thinking blocks and their signatures intact.
            </li>
            <li>
              Map <code>isError</code> on a tool message onto the provider&apos;s
              own failure flag when it has one (Anthropic{" "}
              <code>is_error</code>). OpenAI has none, so the adapter drops it.
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
              "number | null",
              "0.2",
              <>
                Sent on every request, unless it is <code>null</code>, which
                leaves the field out for reasoning models that reject any value
                but their own default.
              </>,
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
              "cache",
              "boolean",
              "true",
              <>
                Prompt caching. The system prompt goes out as a text block with
                a <code>cache_control</code> breakpoint, which caches the tools
                and the system prompt together across calls.{" "}
                <code>cache: false</code> sends the plain string instead, the
                shape 0.2.0 used.
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
            <code>options.maxStateBytes</code> caps the serialized size of each
            key that comes back. A value over the cap is replaced with a marker
            carrying the limit, the real size and a JSON preview. Arguments are
            validated against the schema above first, so a call that sends{" "}
            <code>keys</code> as a string is answered with an error the model
            can retry from rather than failing the interaction.
          </p>
          <p>
            The round trip never appears in <code>history</code>,{" "}
            <code>AgentResponse.toolCalls</code> or <code>onToolCall</code>. The
            one consumer-facing trace is the <code>state_read</code> event on{" "}
            <code>options.onEvent</code>, which reports every validated call
            with the keys the model asked for and the keys left after{" "}
            <code>canAccess</code> filtering. Everything else about it stays
            inside the model-facing message list.{" "}
            <Link href="/pull-based-state">Pull-based state</Link> covers the
            reasoning.
          </p>
        </Prose>
      </Section>

      <NextLinks entries={nextEntries} />
    </div>
  );
}
