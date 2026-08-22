"use client";

import { AgentDemo } from "@/components/AgentDemo";
import { Callout, Prose, NextLinks, Section } from "@/components/doc";
import { ExampleShell } from "@/components/ExampleShell";
import type { ShopState } from "@/lib/demo";
import { callTool, say } from "@/lib/scriptedAdapter";
import type { Plan } from "@/lib/scriptedAdapter";
import { examples, guides } from "@/lib/site";

const CAN_ACCESS = ["cart", "products"];
const CAN_EXECUTE = ["addToCart"];

const SUGGESTIONS = [
  "Add the canvas backpack",
  "Clear my cart",
  "What card do I have on file?",
];

function cartClause(cart: ShopState["cart"]): string {
  if (cart.length === 0) return "the cart is empty";
  const items = cart.map((line) => `${line.qty} x ${line.name}`).join(", ");
  return `the cart holds ${items}`;
}

const plan: Plan = (userMessage, state) => {
  const text = userMessage.toLowerCase();

  // Asking for a key that was never advertised. The loop drops it and answers
  // from what survived the filter.
  if (text.includes("card")) {
    return [
      callTool("__readState", { keys: ["paymentMethod", "cart"] }),
      say(
        `I asked for paymentMethod and cart, and only cart came back, so I have no card details to give you. All I can tell you is that ${cartClause(
          state.cart
        )}.`
      ),
    ];
  }

  if (text.includes("clear") || text.includes("empty")) {
    return [
      callTool("clearCart", {}),
      say(
        `I tried to run clearCart and the app refused it: the name is not in canExecute. Nothing was removed, and ${cartClause(
          state.cart
        )} exactly as before.`
      ),
    ];
  }

  if (text.includes("backpack") || text.includes("add")) {
    return [
      callTool("__readState", { keys: ["products"] }, { id: "call_read_products" }),
      callTool(
        "addToCart",
        { productId: "backpack-canvas-03" },
        { id: "call_add_to_cart" }
      ),
      say(`That one I am allowed to run, so ${cartClause(state.cart)} now.`),
    ];
  }

  return [];
};

const source = `<AIAgentProvider
  model={model}
  state={() => store.getState()}
  // All three tools are registered. Only one of them is reachable.
  tools={[navigateTo, addToCart, clearCart]}
  permissions={{
    canAccess: ["cart", "products"],
    canExecute: ["addToCart"],
  }}
>
  <App />
</AIAgentProvider>

// Layer one, before the request: the manifest lists cart and products only,
// and the tool list sent to the model contains addToCart only.
//
// Layer two, after the response:
//   clearCart              -> status "denied", result
//                             'Tool "clearCart" is not permitted'
//   __readState({ keys: ["paymentMethod", "cart"] })
//                          -> requested keys are intersected with canAccess,
//                             so the model receives { "cart": [...] } and
//                             paymentMethod is dropped without comment
`;

const next = [...guides, ...examples].filter((entry) =>
  ["/permissions", "/pull-based-state", "/examples/validation"].includes(entry.href)
);

export default function PermissionsExample() {
  return (
    <>
      <ExampleShell
        title="Permission denial"
        lead="The model asks for a tool and a state key it was never offered. Both requests are refused a second time, after it has already made them."
        source={source}
        notes={
          <Section title="Two layers, and why the second one exists">
            <Prose>
              <p>
                Visibility is the first layer. <code>canExecute</code> filters
                the tool list before the request goes out, and{" "}
                <code>canAccess</code> decides which keys appear in the
                manifest. On this page the model is shown one tool and two
                keys.
              </p>
              <p>
                Enforcement is the second layer, and it runs on the way back.
                Names are re-checked against <code>canExecute</code> before
                anything executes, and <code>__readState</code> requests are
                re-filtered against <code>canAccess</code>. The scripted model
                here names <code>clearCart</code> regardless, the way a
                hallucinating model or an injected instruction hidden in state
                text would. The handler never runs, and the tool log shows{" "}
                <code>denied</code>.
              </p>
              <p>
                The payment prompt takes the same route through the state side.
                The model requests two keys, the loop intersects them with{" "}
                <code>canAccess</code>, and only <code>cart</code> comes back.
                No error is raised for the dropped key: the model simply never
                receives it and has to answer from what it has.
              </p>
              <p>
                The backpack prompt is the control. <code>addToCart</code> is
                on the list, so it is advertised, executed, and reported as{" "}
                <code>success</code> like any other tool.
              </p>
            </Prose>

            <Callout tone="warn" title="This is the injection backstop">
              <p>
                State values often carry user-generated text, and once that text
                is in the conversation it can try to give the model
                instructions. The worst an injected instruction can achieve is a
                call to a tool you already allowlisted, and a{" "}
                <code>confirm: true</code> tool still needs a human yes.
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
        />
      </ExampleShell>

      <NextLinks entries={next} />
    </>
  );
}
