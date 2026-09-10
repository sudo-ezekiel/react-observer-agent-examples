import type {
  ModelAdapter,
  ModelRequest,
  ModelResponse,
} from "react-observer-agent";
import type { ShopState } from "@/lib/demo";

/**
 * A ModelAdapter that plays back a written script instead of calling an LLM.
 *
 * The demos on this site run the library for real: the provider, the permission
 * checks, `__readState`, argument validation, the confirmation flow and the
 * turn loop are all the shipped code paths. Only the network call is replaced,
 * because a statically exported site has nowhere to hide an API key and the
 * library's own guidance is that a key never belongs in the browser.
 *
 * The upshot is that a demo cannot lie about what the library does. If a tool
 * is denied here, it is denied by `validateToolCall`, not by this file. What a
 * script does control is what the model decides to say and call, which is the
 * one part a docs page has to stage anyway.
 *
 * See /adapters for the real openAIAdapter and claudeAdapter.
 */

/**
 * A single interaction, written as the turns the model would take.
 *
 * Index 0 is the model's first reply to the user. If it carries tool calls, the
 * loop runs them, feeds the results back, and asks for index 1, and so on. The
 * last entry should be text only, otherwise the loop runs out its turn budget
 * and returns MAX_TURNS (which is exactly what the cancellation and turn budget
 * demos want, so it stays possible on purpose).
 *
 * A turn is a ModelResponse, so it can also carry `stopReason`. The loop only
 * reads that field on a turn with no tool calls, which is why `truncated` and
 * `refused` below are for the last entry of a plan and nowhere else.
 */
export type Turn = ModelResponse;

/**
 * Given what the user typed and the state as it stands right now, the turns the
 * model takes in response.
 *
 * The plan is re-run for every turn, so a closing sentence written against
 * `state` describes the cart after the tools of the earlier turns have run,
 * the way a real model's answer would.
 */
export type Plan = (userMessage: string, state: ShopState) => Turn[];

const FALLBACK: Turn = {
  content:
    "This demo runs a written script rather than a live model, so it only knows a few phrasings. Try one of the suggested prompts.",
};

/**
 * Which turn of the current interaction we are on.
 *
 * The loop appends an assistant message for every turn that requested tools, so
 * the assistant messages after the final user message count the round trips
 * already taken. Deriving it from the request keeps the adapter stateless,
 * which matters because React strict mode mounts effects twice and a counter
 * held in a closure would drift.
 */
function turnIndex(messages: ModelRequest["messages"]): number {
  let lastUser = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      lastUser = i;
      break;
    }
  }
  let assistants = 0;
  for (let i = lastUser + 1; i < messages.length; i++) {
    if (messages[i].role === "assistant") assistants++;
  }
  return assistants;
}

function lastUserMessage(messages: ModelRequest["messages"]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") return messages[i].content;
  }
  return "";
}

export type ScriptedAdapterOptions = {
  /** Latency per turn, so the pending state is visible. */
  delayMs?: number;
  /** Reported back as AgentResponse.usage, to make the token counter real. */
  usage?: { promptTokens: number; completionTokens: number };
};

export function scriptedAdapter(
  plan: Plan,
  getState: () => ShopState,
  options: ScriptedAdapterOptions = {}
): ModelAdapter {
  const { delayMs = 550, usage } = options;

  return {
    async sendMessage(request: ModelRequest): Promise<ModelResponse> {
      await sleep(delayMs, request.signal);

      const turns = plan(lastUserMessage(request.messages), getState());
      const turn = turns[turnIndex(request.messages)] ?? FALLBACK;

      return usage ? { ...turn, usage } : turn;
    },
  };
}

/**
 * Rejects with an AbortError when the signal fires, the same shape `fetch`
 * produces, because that error name is what the agent loop treats as a cancel
 * rather than a transport failure.
 */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    function onAbort() {
      clearTimeout(timer);
      reject(abortError());
    }

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function abortError(): Error {
  const error = new Error("The operation was aborted");
  error.name = "AbortError";
  return error;
}

/** Convenience for writing a tool call turn without repeating the shape. */
export function callTool(
  name: string,
  args: unknown,
  options: { id?: string; say?: string } = {}
): Turn {
  return {
    content: options.say ?? null,
    toolCalls: [{ id: options.id ?? `call_${name}`, name, arguments: args }],
  };
}

/** Convenience for the final, text-only turn that ends an interaction. */
export function say(content: string): Turn {
  return { content };
}

/**
 * A final turn the model was cut off in, which the loop reports as
 * `error.code: "TRUNCATED"` while keeping the partial text as the message.
 *
 * It has to be the last entry of a plan and carry no tool calls, because
 * `stopReason` is only read on a turn the loop treats as the answer.
 */
export function truncated(content: string): Turn {
  return { content, stopReason: "max_tokens" };
}

/**
 * A final turn the model declined to answer, reported as
 * `error.code: "REFUSED"`. Same placement rule as `truncated`.
 */
export function refused(content: string): Turn {
  return { content, stopReason: "refusal" };
}
