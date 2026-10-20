"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AIAgentProvider, useAgent } from "react-observer-agent";
import type {
  AgentEvent,
  PendingToolCall,
  ToolCallEvent,
} from "react-observer-agent";
import {
  STATE_DESCRIPTIONS,
  createTools,
  useShop,
  useShopStore,
} from "@/lib/demo";
import type { ShopState, ShopStore } from "@/lib/demo";
import { scriptedAdapter } from "@/lib/scriptedAdapter";
import type { Plan } from "@/lib/scriptedAdapter";
import { Badge, Button, Stat } from "./ui";

/** Fixed numbers, so the token readout is stable enough to talk about in prose. */
const USAGE = { promptTokens: 420, completionTokens: 55 };

export type AgentDemoProps = {
  /** Turns the scripted model takes, keyed off what the user typed and current state. */
  plan: Plan;
  /** Clickable prompt chips. The first is the one the page is really about. */
  suggestions: string[];
  /** State keys the agent may read. Anything omitted is unreachable. */
  canAccess: string[];
  /** Tool names the agent may run. */
  canExecute: string[];
  /** How confirm:true tools get resolved. Default "inline". */
  confirmMode?: "inline" | "approve" | "deny" | "none";
  /** Render a Cancel button that aborts the in-flight send. Default false. */
  cancellable?: boolean;
  /** Show the token usage readout. Default false. */
  showUsage?: boolean;
  /** Wire AgentOptions.onEvent and show what it reports. Default false. */
  showEvents?: boolean;
  /** Makes addToCart slow enough to cancel mid-flight. Default 0. */
  addToCartDelayMs?: number;
  /** Passed through to AgentOptions.maxTurns. */
  maxTurns?: number;
};

type PendingConfirm = {
  call: PendingToolCall;
  resolve: (allowed: boolean) => void;
};

export function AgentDemo({
  plan,
  suggestions,
  canAccess,
  canExecute,
  confirmMode = "inline",
  cancellable = false,
  showUsage = false,
  showEvents = false,
  addToCartDelayMs = 0,
  maxTurns,
}: AgentDemoProps) {
  const store = useShopStore();
  const tools = useMemo(
    () => createTools(store, { addToCartDelayMs }),
    [addToCartDelayMs, store]
  );
  const adapter = useMemo(
    () =>
      scriptedAdapter(plan, store.getState, {
        delayMs: 550,
        usage: showUsage ? USAGE : undefined,
      }),
    [plan, showUsage, store]
  );

  const [toolCalls, setToolCalls] = useState<ToolCallEvent[]>([]);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const onToolCall = useCallback((call: ToolCallEvent) => {
    setToolCalls((previous) => [...previous, call]);
  }, []);

  const recordEvent = useCallback((event: AgentEvent) => {
    setEvents((previous) => [...previous, event]);
  }, []);

  const onConfirm = useMemo(() => {
    if (confirmMode === "none") return undefined;
    if (confirmMode === "approve") return async () => true;
    if (confirmMode === "deny") return async () => false;
    return (call: PendingToolCall) =>
      new Promise<boolean>((resolve) => {
        // A cancel while the prompt is open has to take the prompt with it.
        // The loop has already dropped the call by then, so an Allow clicked
        // afterwards would answer a question nobody is still asking.
        const onAbort = () => {
          setPending((current) => (current?.call === call ? null : current));
          resolve(false);
        };
        call.signal?.addEventListener("abort", onAbort, { once: true });

        setPending({
          call,
          resolve: (allowed) => {
            call.signal?.removeEventListener("abort", onAbort);
            resolve(allowed);
          },
        });
      });
  }, [confirmMode]);

  const resolveConfirm = useCallback(
    (allowed: boolean) => {
      pending?.resolve(allowed);
      setPending(null);
    },
    [pending]
  );

  const reset = useCallback(() => {
    // A reset during a confirmation would otherwise leave the loop awaiting a
    // promise nothing can settle.
    pending?.resolve(false);
    setPending(null);
    setToolCalls([]);
    setEvents([]);
    store.reset();
  }, [pending, store]);

  return (
    <AIAgentProvider
      model={adapter}
      state={() => store.getState()}
      tools={tools}
      permissions={{ canAccess, canExecute, stateDescriptions: STATE_DESCRIPTIONS }}
      options={{
        maxTurns,
        onConfirm,
        onToolCall,
        // Left off where nothing renders it, so a demo that ignores the stream
        // does not re-render on every turn and state read.
        onEvent: showEvents ? recordEvent : undefined,
      }}
    >
      <Panel
        store={store}
        canAccess={canAccess}
        suggestions={suggestions}
        cancellable={cancellable}
        showUsage={showUsage}
        showEvents={showEvents}
        toolCalls={toolCalls}
        events={events}
        pending={pending}
        onResolveConfirm={resolveConfirm}
        onReset={reset}
      />
    </AIAgentProvider>
  );
}

type PanelProps = {
  store: ShopStore;
  canAccess: string[];
  suggestions: string[];
  cancellable: boolean;
  showUsage: boolean;
  showEvents: boolean;
  toolCalls: ToolCallEvent[];
  events: AgentEvent[];
  pending: PendingConfirm | null;
  onResolveConfirm: (allowed: boolean) => void;
  onReset: () => void;
};

function Panel({
  store,
  canAccess,
  suggestions,
  cancellable,
  showUsage,
  showEvents,
  toolCalls,
  events,
  pending,
  onResolveConfirm,
  onReset,
}: PanelProps) {
  const { send, isProcessing, history, clearHistory, lastResponse } = useAgent();
  const state = useShop(store);
  const [input, setInput] = useState("");
  const controller = useRef<AbortController | null>(null);
  const transcript = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = transcript.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [history, isProcessing, pending]);

  const submit = async (text: string) => {
    const message = text.trim();
    if (!message || isProcessing) return;

    setInput("");
    if (!cancellable) {
      await send(message);
      return;
    }

    const abort = new AbortController();
    controller.current = abort;
    await send(message, { signal: abort.signal });
    controller.current = null;
  };

  const cartItems = state.cart.reduce((total, line) => total + line.qty, 0);
  const error = lastResponse?.error;

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center justify-between gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-2 dark:border-neutral-800 dark:bg-neutral-800/50">
        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Live demo
        </span>
        <Button
          onClick={() => {
            onReset();
            clearHistory();
          }}
        >
          Reset
        </Button>
      </div>

      <div className="grid md:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="flex min-w-0 flex-col">
          <div
            ref={transcript}
            className="flex max-h-80 min-h-48 flex-col gap-3 overflow-y-auto p-4"
          >
            {history.length === 0 && !isProcessing ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Send a message, or pick one of the prompts below.
              </p>
            ) : null}

            {history.map((entry, index) => (
              <div
                key={index}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  entry.role === "user"
                    ? "self-end bg-indigo-600 text-white"
                    : "self-start bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200"
                }`}
              >
                {entry.content}
                {!entry.content && !entry.error ? (
                  <span className="italic text-neutral-500 dark:text-neutral-400">
                    No text came back for this turn.
                  </span>
                ) : null}

                {/* Per-turn attribution the banner below cannot give:
                    lastResponse only ever holds the newest interaction, so a
                    failed turn further up the transcript keeps its reason. */}
                {entry.error ? (
                  <div
                    className={`text-xs text-red-600 dark:text-red-400 ${
                      entry.content ? "mt-2" : ""
                    }`}
                  >
                    <span className="font-mono font-semibold">
                      {entry.error.code ?? "ERROR"}
                    </span>{" "}
                    {entry.error.message}
                  </div>
                ) : null}
              </div>
            ))}

            {isProcessing ? (
              <div className="flex items-center gap-1 self-start rounded-2xl bg-neutral-100 px-3 py-3 dark:bg-neutral-800">
                <span className="thinking-dot h-1.5 w-1.5 rounded-full bg-neutral-500" />
                <span className="thinking-dot h-1.5 w-1.5 rounded-full bg-neutral-500" />
                <span className="thinking-dot h-1.5 w-1.5 rounded-full bg-neutral-500" />
              </div>
            ) : null}
          </div>

          {pending ? (
            <div className="border-t border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
              <div className="text-sm text-amber-900 dark:text-amber-200">
                The agent wants to run{" "}
                <span className="font-mono font-semibold">
                  {pending.call.toolName}
                </span>
                .
              </div>
              <pre className="mt-2 overflow-x-auto rounded-md border border-amber-200 bg-white/70 p-2 font-mono text-xs text-amber-900 dark:border-amber-900 dark:bg-neutral-900 dark:text-amber-200">
                {format(pending.call.args)}
              </pre>
              <div className="mt-3 flex gap-2">
                <Button tone="primary" onClick={() => onResolveConfirm(true)}>
                  Allow
                </Button>
                <Button tone="danger" onClick={() => onResolveConfirm(false)}>
                  Deny
                </Button>
              </div>
            </div>
          ) : null}

          <div className="border-t border-neutral-200 p-4 dark:border-neutral-800">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void submit(input);
                }}
                disabled={isProcessing}
                placeholder="Ask the agent something"
                className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-indigo-500 focus:outline-none disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />
              <Button
                tone="primary"
                onClick={() => void submit(input)}
                disabled={isProcessing || input.trim() === ""}
              >
                Send
              </Button>
              {cancellable ? (
                <Button
                  tone="danger"
                  onClick={() => controller.current?.abort()}
                  disabled={!isProcessing}
                >
                  Cancel
                </Button>
              ) : null}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  disabled={isProcessing}
                  onClick={() => void submit(suggestion)}
                  className="rounded-full border border-neutral-200 px-3 py-1 text-xs text-neutral-600 transition hover:border-indigo-400 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-indigo-600 dark:hover:text-indigo-300"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
              The model is scripted rather than live, so it answers the prompts
              above. Every other layer is the library itself.
            </p>
          </div>
        </div>

        <div className="border-t border-neutral-200 p-4 md:border-l md:border-t-0 dark:border-neutral-800">
          <PanelTitle>State</PanelTitle>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Stat label="Cart" value={cartItems} highlight />
            <Stat label="Page" value={state.currentPage} />
          </div>

          <ul className="mt-3 flex flex-col gap-2">
            {(Object.keys(state) as (keyof ShopState)[]).map((key) => {
              const readable = canAccess.includes(key);
              return (
                <li
                  key={key}
                  className="rounded-md border border-neutral-200 px-2.5 py-1.5 dark:border-neutral-800"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-neutral-700 dark:text-neutral-300">
                      {key}
                    </span>
                    {readable ? (
                      <Badge tone="info">readable</Badge>
                    ) : (
                      <Badge tone="denied">unreachable</Badge>
                    )}
                  </div>
                  <div
                    className={`mt-1 truncate font-mono text-[11px] ${
                      readable
                        ? "text-neutral-500 dark:text-neutral-400"
                        : "text-neutral-400 line-through dark:text-neutral-600"
                    }`}
                  >
                    {format(state[key])}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="border-t border-neutral-200 p-4 dark:border-neutral-800">
        <PanelTitle>Tool activity</PanelTitle>
        {toolCalls.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Nothing yet. Internal <code className="font-mono">__readState</code>{" "}
            calls never appear here.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {toolCalls.map((call, index) => (
              <li
                key={index}
                className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={call.status}>{call.status}</Badge>
                  <span className="font-mono text-xs text-neutral-800 dark:text-neutral-200">
                    {call.toolName}
                  </span>
                  <span className="min-w-0 truncate font-mono text-xs text-neutral-500 dark:text-neutral-400">
                    {format(call.args)}
                  </span>
                </div>
                <div className="mt-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                  {format(call.result)}
                </div>
              </li>
            ))}
          </ul>
        )}

        {showEvents ? (
          <div className="mt-5">
            <PanelTitle>Events</PanelTitle>
            {events.length === 0 ? (
              <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                Nothing yet. <code className="font-mono">onEvent</code> reports
                every turn, state read and tool call as the loop runs, including
                the <code className="font-mono">__readState</code> traffic the
                list above leaves out.
              </p>
            ) : (
              <ul className="mt-3 flex max-h-52 flex-col gap-1 overflow-y-auto">
                {events.map((event, index) => (
                  <li
                    key={index}
                    className="flex flex-wrap items-baseline gap-2 rounded-md border border-neutral-200 px-2.5 py-1.5 dark:border-neutral-800"
                  >
                    <span className="font-mono text-[11px] text-neutral-800 dark:text-neutral-200">
                      {event.type}
                    </span>
                    <span className="min-w-0 text-xs text-neutral-500 dark:text-neutral-400">
                      {describeEvent(event)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {showUsage ? (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:max-w-sm">
            <Stat
              label="Prompt tokens"
              value={lastResponse?.usage?.promptTokens ?? 0}
            />
            <Stat
              label="Completion tokens"
              value={lastResponse?.usage?.completionTokens ?? 0}
            />
          </div>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            <span className="font-mono font-semibold">
              {error.code ?? "ERROR"}
            </span>{" "}
            {error.message}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function PanelTitle({ children }: { children: string }) {
  return (
    <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
      {children}
    </div>
  );
}

function format(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value ?? null);
}

/**
 * One line per AgentEvent. A state_read reports the keys asked for and the keys
 * allowed, never the values, which stay in the message list the model sees.
 */
function describeEvent(event: AgentEvent): string {
  switch (event.type) {
    case "turn_start":
      return `turn ${event.turn} of ${event.maxTurns}`;
    case "state_read": {
      const blocked = event.requested.filter((key) => !event.keys.includes(key));
      const returned = event.keys.length > 0 ? event.keys.join(", ") : "nothing";
      const line = `asked for ${event.requested.join(", ")}, got ${returned}`;
      return blocked.length > 0
        ? `${line} (${blocked.join(", ")} not permitted)`
        : line;
    }
    case "tool_start":
      return `${event.toolName} ${format(event.args)}`;
    case "tool_end":
      return `${event.toolName} ${event.status}`;
  }
}
