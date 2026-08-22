"use client";

import { AgentDemo } from "@/components/AgentDemo";
import { Callout, Prose, NextLinks, Section } from "@/components/doc";
import { ExampleShell } from "@/components/ExampleShell";
import { callTool, say } from "@/lib/scriptedAdapter";
import type { Plan } from "@/lib/scriptedAdapter";
import { examples, guides } from "@/lib/site";

const CAN_ACCESS = ["user", "cart", "products", "currentPage"];
const CAN_EXECUTE = ["navigateTo", "addToCart", "clearCart"];

const SUGGESTIONS = ["Give me a rundown of my session"];

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
                The loop checks the signal before each turn and again before
                each tool call, so a cancel cannot leave a handler half-run. It
                also forwards the signal to the adapter, which passes it to{" "}
                <code>fetch</code>, so a real request is dropped in flight
                rather than waited out.
              </p>
              <p>
                The interrupted turn is thrown away rather than kept for replay.
                A cancel can land between an assistant message requesting a tool
                and the result answering it, and both OpenAI and Anthropic
                reject a transcript in that shape, so the next{" "}
                <code>send()</code> continues from the last clean state. The
                empty bubble left in the transcript above is this demo showing
                you a response whose <code>message</code> is an empty string.
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

      <NextLinks entries={next} />
    </>
  );
}
