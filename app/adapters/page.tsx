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
import { guides, reference } from "@/lib/site";

export const metadata: Metadata = {
  title: "Adapters",
  description:
    "openAIAdapter and claudeAdapter, their defaults and constraints, and the ModelAdapter contract for writing your own.",
};

const nextUp = [...guides, ...reference].filter((entry) =>
  ["/send-behavior", "/local-example"].includes(entry.href),
);

const openAIConfigCode = `function openAIAdapter(config: OpenAIAdapterConfig): ModelAdapter;

interface OpenAIAdapterConfig {
  apiKey?: string;          // Dev and prototyping only
  model?: string;           // Default: 'gpt-4o'
  baseURL?: string;         // Proxy endpoint (recommended for production)
  temperature?: number;     // Default: 0.2
  headers?: Record<string, string>; // Extra headers, e.g. auth for your proxy
}`;

const claudeConfigCode = `function claudeAdapter(config: ClaudeAdapterConfig): ModelAdapter;

interface ClaudeAdapterConfig {
  apiKey?: string;          // Dev and prototyping only
  model?: string;           // Default: 'claude-opus-5'
  baseURL?: string;         // Proxy endpoint (recommended for production)
  maxTokens?: number;       // Required by the API; default: 16000
  headers?: Record<string, string>; // Extra headers, spread last so they win
}`;

const swapCode = `import { openAIAdapter, claudeAdapter } from 'react-observer-agent';

const model = openAIAdapter({ baseURL: '/api/agent' });

// Same interface, so nothing else in the app changes.
// const model = claudeAdapter({ baseURL: '/api/agent' });`;

const interfaceCode = `interface ModelAdapter {
  sendMessage(request: ModelRequest): Promise<ModelResponse>;
}

interface ModelRequest {
  messages: ConversationMessage[];
  tools: LLMToolDefinition[];      // includes __readState when state is accessible
  state: Record<string, unknown>;  // deprecated: always {} since the pull refactor
  systemPrompt?: string;           // your systemPrompt + the generated manifest prompt
  stateManifest?: { key: string; description: string }[];
  signal?: AbortSignal;            // forward to the transport so requests cancel
}

interface ConversationMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;             // links a tool message to the call it answers
  toolCalls?: LLMToolCall[];       // present on assistant messages that requested tools
}

interface ModelResponse {
  content: string | null;          // null when the model only called tools
  toolCalls?: LLMToolCall[];
  usage?: { promptTokens: number; completionTokens: number };
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

const customAdapterCode = `import type { ModelAdapter, ModelRequest, ModelResponse } from 'react-observer-agent';

export function myAdapter(config: { baseURL: string }): ModelAdapter {
  return {
    async sendMessage(request: ModelRequest): Promise<ModelResponse> {
      let res: Response;
      try {
        res = await fetch(config.baseURL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(toWireFormat(request)),
          signal: request.signal,
        });
      } catch (error) {
        // An abort is a caller decision. Rethrow it unchanged: the loop
        // identifies cancellation by the error name.
        if (error instanceof Error && error.name === 'AbortError') throw error;
        throw new Error(\`Network error: \${String(error)}\`);
      }

      if (!res.ok) {
        throw new Error(\`Provider error (\${res.status}): \${await res.text()}\`);
      }

      return parseResponse(await res.json());
    },
  };
}`;

const adapterRows: [string, string, string][] = [
  [
    "openAIAdapter",
    "Shipped",
    "OpenAI chat completions with function calling. Model gpt-4o, temperature 0.2.",
  ],
  [
    "claudeAdapter",
    "Shipped",
    "Anthropic Messages API with tool use. Model claude-opus-5, maxTokens 16000.",
  ],
  ["ollamaAdapter", "Planned", "Local models via Ollama. Not shipped yet."],
  [
    "Custom",
    "Supported",
    "Implement ModelAdapter and pass it to the provider.",
  ],
];

const contractRows: [string, string][] = [
  [
    "Map every role",
    "All three message roles map to the provider's native format, in order.",
  ],
  [
    "Serialize assistant toolCalls",
    "OpenAI tool_calls, Anthropic tool_use blocks. Providers reject a tool-result message that does not follow an assistant message carrying the matching call, so dropping this field breaks every tool round trip.",
  ],
  [
    "Link tool results",
    "toolCallId maps to tool_call_id (OpenAI) or tool_use_id (Anthropic).",
  ],
  [
    "Parse arguments",
    "JSON-parse the wire format into LLMToolCall.arguments, falling back to the raw string when the JSON is malformed.",
  ],
  [
    "Throw on failure",
    "Network failures, non-2xx responses and malformed payloads throw. The provider converts a throw into AgentResponse.error and calls onError.",
  ],
  [
    "Ignore state",
    "state is always {}. stateManifest is optional context, already injected into systemPrompt by the loop.",
  ],
  [
    "Forward signal, rethrow AbortError",
    "Pass request.signal to the transport, and rethrow an AbortError unchanged rather than rewrapping it. The loop identifies cancellation by that error name.",
  ],
];

export default function Adapters() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        title="Adapters"
        lead="An adapter normalizes one LLM API into a single interface, so swapping models never touches app code."
      />

      <Section title="What ships">
        <Table
          head={["Adapter", "Status", "Notes"]}
          rows={adapterRows.map(([name, status, notes]) => [
            <code key={name}>{name}</code>,
            status,
            notes,
          ])}
        />
        <Prose>
          <p>
            Both built-in adapters are raw <code>fetch</code> with no SDK
            dependency, which is why the package has zero runtime dependencies.
            Both require either <code>apiKey</code> or <code>baseURL</code> and
            throw at construction when given neither. When <code>baseURL</code>{" "}
            already contains the endpoint path (<code>/chat/completions</code>{" "}
            for OpenAI, <code>/v1/messages</code> for Claude) it is used as-is;
            otherwise the path is appended.
          </p>
        </Prose>
        <CodeBlock code={swapCode} lang="ts" />
      </Section>

      <Section title="openAIAdapter">
        <CodeBlock code={openAIConfigCode} lang="ts" />
        <Prose>
          <p>
            Chat completions with function calling. The default model is{" "}
            <code>gpt-4o</code> and the default temperature is{" "}
            <code>0.2</code>. Both are overridable through the config.
          </p>
        </Prose>
      </Section>

      <Section title="claudeAdapter">
        <CodeBlock code={claudeConfigCode} lang="ts" />
        <Prose>
          <p>
            The Anthropic Messages API with tool use. The default model is{" "}
            <code>claude-opus-5</code>, and <code>maxTokens</code> defaults to{" "}
            <code>16000</code> because the API requires the field.
          </p>
          <p>
            It sends <code>anthropic-version: 2023-06-01</code>, and{" "}
            <code>x-api-key</code> when <code>apiKey</code> is set. It sends no
            sampling parameters, since current Claude models reject them, so
            there is no <code>temperature</code> in the config. Your{" "}
            <code>headers</code> are spread last and win over anything the
            adapter sets.
          </p>
        </Prose>
        <Callout tone="note" title="Calling Anthropic straight from a browser">
          Direct browser access additionally requires that provider&apos;s CORS
          opt-in header. Pass it through <code>headers</code>. The proxy pattern
          in <Link href="/permissions">Permissions and safety</Link> avoids the
          question entirely, and is the recommended production path regardless.
        </Callout>
      </Section>

      <Section title="The ModelAdapter interface">
        <Prose>
          <p>
            One method. Anything that implements it can be passed as the{" "}
            <code>model</code> prop, which is how the demos on this site run a
            scripted model instead of a live one.
          </p>
        </Prose>
        <CodeBlock code={interfaceCode} lang="ts" />
      </Section>

      <Section title="The adapter contract">
        <Prose>
          <p>An adapter must:</p>
        </Prose>
        <Table
          head={["Requirement", "Detail"]}
          rows={contractRows.map(([requirement, detail]) => [
            <strong
              key={requirement}
              className="font-semibold text-neutral-800 dark:text-neutral-200"
            >
              {requirement}
            </strong>,
            detail,
          ])}
        />
        <Prose>
          <p>
            The loop passes a snapshot of <code>messages</code>, so an adapter
            can hold onto it across awaits without observing later turns.
          </p>
        </Prose>
        <CodeBlock code={customAdapterCode} lang="ts" filename="myAdapter.ts" />
      </Section>

      <NextLinks entries={nextUp} />
    </div>
  );
}
