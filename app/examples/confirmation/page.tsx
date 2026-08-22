"use client";

import { AgentDemo } from "@/components/AgentDemo";
import { Callout, Prose, NextLinks, Section, Table } from "@/components/doc";
import { ExampleShell } from "@/components/ExampleShell";
import type { ShopState } from "@/lib/demo";
import { callTool, say } from "@/lib/scriptedAdapter";
import type { Plan } from "@/lib/scriptedAdapter";
import { examples, guides } from "@/lib/site";

const CAN_ACCESS = ["user", "cart", "products", "currentPage"];
const CAN_EXECUTE = ["navigateTo", "addToCart", "clearCart"];

const SUGGESTIONS = ["Add a few things, then clear it", "Clear my cart"];

function outcomeSentence(cart: ShopState["cart"]): string {
  if (cart.length === 0) {
    return "The cart is empty now.";
  }

  const items = cart.map((line) => `${line.qty} x ${line.name}`).join(", ");
  return `You turned that down, so the cart is untouched: ${items}.`;
}

const plan: Plan = (userMessage, state) => {
  const text = userMessage.toLowerCase();

  // Clearing an empty cart proves nothing, so this branch fills it first.
  if (text.includes("then clear")) {
    return [
      callTool(
        "addToCart",
        { productId: "sneakers-blue-01" },
        { id: "call_add_sneakers" }
      ),
      callTool(
        "addToCart",
        { productId: "headphones-wireless-02" },
        { id: "call_add_headphones" }
      ),
      callTool("clearCart", {}, { id: "call_clear" }),
      say(outcomeSentence(state.cart)),
    ];
  }

  if (text.includes("clear") || text.includes("empty")) {
    return [
      callTool("clearCart", {}, { id: "call_clear" }),
      say(outcomeSentence(state.cart)),
    ];
  }

  return [];
};

const source = `import { registerTool } from "react-observer-agent";

// confirm: true is the rule of thumb for anything irreversible or
// user-visible. Deletions, purchases, navigation away from unsaved work.
const clearCart = registerTool("clearCart", () => store.clearCart(), {
  description: "Remove every item from the cart",
  confirm: true,
});

<AIAgentProvider
  model={model}
  state={() => store.getState()}
  tools={[clearCart, addToCart, navigateTo]}
  permissions={{ canAccess, canExecute }}
  options={{
    // The library never renders a dialog. It awaits a boolean, and the shape
    // of the question is entirely yours: modal, toast, inline card, anything.
    onConfirm: (call) =>
      new Promise((resolve) => setPending({ call, resolve })),
  }}
>
  <App />
</AIAgentProvider>
`;

const next = [...guides, ...examples].filter((entry) =>
  ["/permissions", "/examples/permissions", "/examples/tool-execution"].includes(
    entry.href
  )
);

export default function ConfirmationExample() {
  return (
    <>
      <ExampleShell
        title="Confirmation"
        lead="clearCart is registered with confirm: true, so the loop stops and waits for a human before the handler runs. Send the first prompt and allow it, then reset and send it again and deny it."
        source={source}
        notes={
          <Section title="Both outcomes">
            <Prose>
              <p>
                The first prompt adds two products and then asks to clear the
                cart, so there is something real to destroy. Only the{" "}
                <code>clearCart</code> turn pauses:{" "}
                <code>addToCart</code> is registered without{" "}
                <code>confirm</code>, so it runs straight through.
              </p>
              <p>
                While the amber card is open the loop is genuinely suspended on
                the promise your <code>onConfirm</code> returned. Nothing else
                proceeds, no further tool in that turn starts, and the model is
                not consulted again until the promise settles.
              </p>
            </Prose>

            <Table
              head={["Your answer", "Status", "What the model is told"]}
              rows={[
                [
                  <span key="a">Allow</span>,
                  <code key="b">confirmed</code>,
                  <span key="c">
                    the handler ran, and its return value comes back as the tool
                    result
                  </span>,
                ],
                [
                  <span key="d">Deny</span>,
                  <code key="e">cancelled</code>,
                  <code key="f">
                    {`{ status: "cancelled", reason: "User denied" }`}
                  </code>,
                ],
                [
                  <span key="g">No onConfirm handler at all</span>,
                  <code key="h">cancelled</code>,
                  <span key="i">
                    the same shape, with reason{" "}
                    <code>No confirmation handler</code>
                  </span>,
                ],
              ]}
            />

            <Prose>
              <p>
                That last row is the point worth keeping: a{" "}
                <code>confirm: true</code> tool with no handler wired up is
                skipped, not executed. Confirmation is never silently bypassed.
              </p>
              <p>
                Denying is not an error. The model gets a plain result saying
                the user declined and writes its closing line from there, which
                is why the answer changes depending on what you clicked.
              </p>
            </Prose>

            <Callout tone="note" title="Order of checks">
              <p>
                Argument validation runs before confirmation, so a malformed
                call is rejected without anyone being asked to approve it. The
                permission check runs before both.
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
          confirmMode="inline"
        />
      </ExampleShell>

      <NextLinks entries={next} />
    </>
  );
}
