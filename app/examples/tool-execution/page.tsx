"use client";

import { AgentDemo } from "@/components/AgentDemo";
import { Callout, Prose, NextLinks, Section } from "@/components/doc";
import { ExampleShell } from "@/components/ExampleShell";
import type { ShopState } from "@/lib/demo";
import { callTool, say } from "@/lib/scriptedAdapter";
import type { Plan } from "@/lib/scriptedAdapter";
import { examples, guides } from "@/lib/site";

const CAN_ACCESS = ["user", "cart", "products", "currentPage"];
const CAN_EXECUTE = ["navigateTo", "addToCart", "clearCart"];

const SUGGESTIONS = [
  "Add the blue sneakers to my cart",
  "Add the wireless headphones too",
  "Take me to checkout",
];

/** What the phrasing in a prompt maps to, once the catalogue has been read. */
const PRODUCT_PHRASES = [
  { phrase: "sneaker", productId: "sneakers-blue-01" },
  { phrase: "headphone", productId: "headphones-wireless-02" },
  { phrase: "backpack", productId: "backpack-canvas-03" },
];

function cartSentence(cart: ShopState["cart"]): string {
  const items = cart.map((line) => `${line.qty} x ${line.name}`).join(", ");
  return `Done. Your cart now holds ${items || "nothing"}.`;
}

const plan: Plan = (userMessage, state) => {
  const text = userMessage.toLowerCase();

  if (text.includes("checkout")) {
    return [
      callTool("navigateTo", { path: "/checkout" }),
      say(`You are on ${state.currentPage} now. Shout if you want to go back.`),
    ];
  }

  const wanted = PRODUCT_PHRASES.find((entry) => text.includes(entry.phrase));
  if (wanted) {
    return [
      callTool("__readState", { keys: ["products"] }, { id: "call_read_products" }),
      callTool(
        "addToCart",
        { productId: wanted.productId },
        { id: "call_add_to_cart" }
      ),
      say(cartSentence(state.cart)),
    ];
  }

  return [];
};

const source = `import { registerTool } from "react-observer-agent";

export const tools = [
  registerTool(
    "addToCart",
    // The handler is ordinary app code. The library calls it, nothing more.
    (args: { productId: string }) => store.addToCart(args.productId),
    {
      description: "Add one unit of a product to the cart by its id",
      parameters: {
        type: "object",
        properties: {
          productId: {
            type: "string",
            description: "The id of the product, from the products state key",
          },
        },
        required: ["productId"],
      },
    }
  ),
];

// Asked "Add the blue sneakers to my cart", the model takes three turns:
//   1. __readState({ keys: ["products"] })   -> ids, names and prices come back
//   2. addToCart({ productId: "sneakers-blue-01" })
//        -> the handler runs, the store updates, and the return value
//           "Added Blue sneakers to the cart" is fed back as the tool result
//   3. text only, written against the cart as it now stands
`;

const next = [...guides, ...examples].filter((entry) =>
  ["/getting-started", "/examples/confirmation", "/examples/validation"].includes(
    entry.href
  )
);

export default function ToolExecutionExample() {
  return (
    <>
      <ExampleShell
        title="Running a tool"
        lead="The agent looks up a product id, calls addToCart, and the cart count next to it goes up. The handler is your code and it really ran."
        source={source}
        notes={
          <Section title="What happened">
            <Prose>
              <p>
                The model does not know product ids, so the first turn reads the{" "}
                <code>products</code> key. The second turn calls{" "}
                <code>addToCart</code> with an id taken from that result. The
                loop checked the name against <code>canExecute</code>, validated
                the arguments against the tool schema, and only then ran the
                handler.
              </p>
              <p>
                Whatever the handler returns is serialized and fed back to the
                model as the tool result, which is why{" "}
                <code>registerTool</code> handlers should return something
                worth reading rather than <code>undefined</code>. Here it
                returns <code>Added Blue sneakers to the cart</code>, and you
                can see it in the tool log with status <code>success</code>.
              </p>
              <p>
                The cart badge and the state panel update because the store
                changed underneath the agent, not because the library pushed
                anything into the UI. The agent has no view layer of its own.
              </p>
            </Prose>

            <Callout tone="note" title="Statuses">
              <p>
                A tool without <code>confirm: true</code> reports{" "}
                <code>success</code>. The same tool with confirmation reports{" "}
                <code>confirmed</code> once approved. Both mean the handler ran.
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
