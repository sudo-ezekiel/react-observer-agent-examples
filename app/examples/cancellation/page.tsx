"use client";

import { AgentDemo } from "@/components/AgentDemo";
import { CodeBlock } from "@/components/CodeBlock";
import { Callout, Prose, NextLinks, Section } from "@/components/doc";
import { ExampleShell } from "@/components/ExampleShell";
import { callTool, say } from "@/lib/scriptedAdapter";
import type { Plan } from "@/lib/scriptedAdapter";
import { examples, guides } from "@/lib/site";

const CAN_ACCESS = ["user", "cart", "products", "currentPage"];
const CAN_EXECUTE = ["navigateTo", "addToCart", "clearCart"];

const SUGGESTIONS = ["Give me a rundown of my session"];

const WAIT_SUGGESTIONS = ["Clear my cart", "Add the headphones"];

/**
 * Deliberately wasteful: one key per turn, at 550ms a turn, so there is time to
 * reach for Cancel. A real model reading four keys would ask for them together.
 */
const plan: Plan = (userMessage, state) => {
  const text = userMessage.toLowerCase();

  if (!text.includes("rundown") && !text.includes("session")) return [];

  return [
    callTool("__readState", { keys: ["user"] }, { id: "call_read_user" }),
    callTool("__readState", { keys: ["cart"] }, { id: "call_read_cart" }),
    callTool("__readState", { keys: ["products"] }, { id: "call_read_products" }),
    callTool("__readState", { keys: ["currentPage"] }, { id: "call_read_page" }),
    say(
      `${state.user.name}, ${state.user.tier} tier, currently on ${
        state.currentPage
      }, with ${state.cart.length} line${
        state.cart.length === 1 ? "" : "s"
      } in the cart and ${state.products.length} products in the catalogue.`
    ),
  ];
};

/**
 * Two waits that belong to consumer code rather than to model latency: a
 * confirmation nobody has answered, and a handler that is genuinely mid-flight.
 * Both closing lines report only what the tool returned, so neither turn needs
 * a state read the plan does not make.
 */
const waitPlan: Plan = (userMessage) => {
  const text = userMessage.toLowerCase();

  if (text.includes("clear")) {
    return [
      callTool("clearCart", {}, { id: "call_clear" }),
      say("Cleared. Your cart is empty."),
    ];
  }

  if (text.includes("headphones")) {
    return [
      callTool(
        "addToCart",
        { productId: "headphones-wireless-02" },
        { id: "call_add_headphones" }
      ),
      say("Added the wireless headphones."),
    ];
  }

  return [];
};

const source = `const controller = new AbortController();

// Resolves. It does not throw, and it does not reject.
const response = await send("Give me a rundown of my session", {
  signal: controller.signal,
});

if (response.error?.code === "ABORTED") {
  // Your cancel, so onError was never called. Nothing here is an app failure.
}

// Elsewhere, on a button:
controller.abort();
`;

const waitSource = `// A handler that forwards the signal stops when the interaction is cancelled.
registerTool(
  "addToCart",
  async (args: { productId: string }, context?: ToolContext) => {
    await fetch("/api/cart", {
      method: "POST",
      body: JSON.stringify(args),
      signal: context?.signal,
    });
    return "Added to the cart";
  },
  { description: "Add one unit of a product to the cart by its id" }
);

// A confirmation card that closes itself when the cancel lands under it.
onConfirm: (call) =>
  new Promise((resolve) => {
    const onAbort = () => {
      setPending(null);
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
  }),
`;

const next = [...guides, ...examples].filter((entry) =>
  ["/send-behavior", "/adapters", "/examples/chat"].includes(entry.href)
);

export default function CancellationExample() {
  return (
    <>
      <ExampleShell
        title="Cancellation"
        lead="This script reads one state key per turn, which gives you a few seconds to press Cancel. Let it finish once, then interrupt it."
        source={source}
        notes={
          <Section title="What a cancel does">
            <Prose>
              <p>
                <code>send()</code> takes an <code>AbortSignal</code> and
                resolves with an <code>AgentResponse</code> carrying{" "}
                <code>error.code: &quot;ABORTED&quot;</code>. It does not reject,
                so no <code>try</code> block is needed to keep the UI alive, and{" "}
                <code>onError</code> is deliberately not called: a cancel is a
                decision the caller made, not a failure the app has to report.
              </p>
              <p>
                The loop checks the signal before each turn and again before each
                tool call, so a cancel that lands between two calls stops the next
                one from starting. It also forwards the signal to the adapter,
                which passes it to <code>fetch</code>, so a real request is
                dropped in flight rather than waited out. A cancel that lands
                while something is already waiting is the demo further down.
              </p>
              <p>
                The interrupted turn is thrown away rather than kept for replay.
                A cancel can land between an assistant message requesting a tool
                and the result answering it, and both OpenAI and Anthropic
                reject a transcript in that shape, so the next{" "}
                <code>send()</code> continues from the last clean state. The
                bubble left in the transcript above has no text and a red{" "}
                <code>ABORTED</code> line under it: that line is{" "}
                <code>ConversationEntry.error</code>, which every assistant entry
                carries, so the reason stays attached to the turn it belongs to
                instead of being overwritten by the next successful send.
              </p>
              <p>
                Token usage is still reported for the turns that completed
                before the cancel, which is worth having, since those turns were
                paid for.
              </p>
            </Prose>

            <Callout tone="note" title="Running out of turns is a different failure">
              <p>
                The second demo below runs the same script with{" "}
                <code>maxTurns: 2</code>. The model is still calling tools when
                the budget runs out, so the loop gives up and returns{" "}
                <code>error.code: &quot;MAX_TURNS&quot;</code> with an empty
                message and whatever tool calls it accumulated. That one does
                reach <code>onError</code>. The default budget is 5 turns, and
                the demo above raises it to 6 because the script spends 5.
              </p>
            </Callout>
          </Section>
        }
      >
        <AgentDemo
          plan={plan}
          suggestions={SUGGESTIONS}
          canAccess={CAN_ACCESS}
          canExecute={CAN_EXECUTE}
          cancellable
          showUsage
          maxTurns={6}
        />
      </ExampleShell>

      <section className="mt-12">
        <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
          The same script on a budget of two
        </h2>
        <p className="mt-3 text-neutral-600 dark:text-neutral-400">
          Send the prompt and let it run. It never gets to answer.
        </p>
        <div className="mt-4">
          <AgentDemo
            plan={plan}
            suggestions={SUGGESTIONS}
            canAccess={CAN_ACCESS}
            canExecute={CAN_EXECUTE}
            showUsage
            maxTurns={2}
          />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
          Cancelling a wait that belongs to your code
        </h2>
        <p className="mt-3 text-neutral-600 dark:text-neutral-400">
          The demo above only ever interrupts model latency. These two prompts
          stop somewhere your own code is holding the loop open.{" "}
          <strong className="font-semibold text-neutral-800 dark:text-neutral-200">
            Clear my cart
          </strong>{" "}
          opens the amber approval card: press Cancel instead of answering it.{" "}
          <strong className="font-semibold text-neutral-800 dark:text-neutral-200">
            Add the headphones
          </strong>{" "}
          runs a handler that takes 1.8 seconds: press Cancel while it is
          running.
        </p>
        <div className="mt-4">
          <AgentDemo
            plan={waitPlan}
            suggestions={WAIT_SUGGESTIONS}
            canAccess={CAN_ACCESS}
            canExecute={CAN_EXECUTE}
            cancellable
            confirmMode="inline"
            addToCartDelayMs={1800}
          />
        </div>
      </section>

      <Section title="What the abort ends">
        <Prose>
          <p>
            Both prompts end the same way: the tool row reads{" "}
            <code>cancelled</code> with the result{" "}
            <code>Tool execution cancelled: interaction aborted</code>, and{" "}
            <code>send()</code> resolves <code>ABORTED</code>. Denying the
            approval card is a different row, with the result{" "}
            <code>Tool execution cancelled by user</code>, because a denial is an
            answer and a cancel is the absence of one.
          </p>
          <p>
            The loop races the signal against the three awaits that can hang:{" "}
            <code>onConfirm</code>, the tool handler, and the adapter call.
            Before that race existed, an approval prompt that never answered left{" "}
            <code>send()</code> pending forever, along with every call queued
            behind it, and <code>isProcessing</code> never came back down. A
            confirmation UI that unmounts with its provider is exactly that case.
          </p>
          <p>
            The card dismissing itself is this page&apos;s code, not the
            library&apos;s. <code>onConfirm</code> receives a{" "}
            <code>PendingToolCall</code> carrying the interaction&apos;s{" "}
            <code>signal</code>, and the demo listens to it. Without that
            listener the interaction would still resolve <code>ABORTED</code>,
            and the Allow and Deny buttons would sit there answering a question
            the loop stopped asking.
          </p>
        </Prose>

        <CodeBlock code={waitSource} lang="tsx" />

        <Callout tone="warn" title="An abort ends the wait, not the work">
          <p>
            The race means a handler that ignores <code>context.signal</code>{" "}
            stops blocking the interaction the moment you cancel. It does not
            stop running. It finishes in the background and its result is thrown
            away, so a write it was halfway through still lands. Forward the
            signal into whatever the handler is waiting on if you need the work
            itself to stop, the way <code>addToCart</code> does here.
          </p>
        </Callout>

        <Prose>
          <p>
            The same applies to an unmount. The provider aborts in-flight and
            queued interactions when it goes away, which runs every one of these
            paths: the confirmation signal fires, handlers see an aborted{" "}
            <code>context.signal</code>, <code>onError</code> stays quiet, and
            each <code>send()</code> still settles.
          </p>
        </Prose>
      </Section>

      <NextLinks entries={next} />
    </>
  );
}
