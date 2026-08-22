"use client";

import Link from "next/link";
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
  "What's in my cart?",
  "What can I buy?",
  "Who am I signed in as?",
];

function cartSentence(cart: ShopState["cart"]): string {
  if (cart.length === 0) {
    return "Your cart is empty right now. Ask me to add something and I will look up the id first.";
  }

  const items = cart.map((line) => `${line.qty} x ${line.name}`).join(", ");
  const count = cart.reduce((total, line) => total + line.qty, 0);
  return `You have ${count} item${count === 1 ? "" : "s"} in your cart: ${items}.`;
}

const plan: Plan = (userMessage, state) => {
  const text = userMessage.toLowerCase();

  if (text.includes("cart")) {
    return [
      callTool("__readState", { keys: ["cart"] }),
      say(cartSentence(state.cart)),
    ];
  }

  if (text.includes("buy") || text.includes("product") || text.includes("sell")) {
    const catalogue = state.products
      .map((product) => `${product.name} at $${product.price}`)
      .join(", ");
    return [
      callTool("__readState", { keys: ["products"] }),
      say(`Three things are in stock: ${catalogue}.`),
    ];
  }

  if (
    text.includes("who am i") ||
    text.includes("signed in") ||
    text.includes("logged in")
  ) {
    return [
      callTool("__readState", { keys: ["user"] }),
      say(
        `You are signed in as ${state.user.name}, on the ${state.user.tier} tier.`
      ),
    ];
  }

  return [];
};

const source = `"use client";

import { AIAgentProvider } from "react-observer-agent";
import { tools } from "./tools";
import { store } from "./store";

export default function Page() {
  return (
    <AIAgentProvider
      model={model}
      // A getter, so the loop reads the live store rather than a render-time copy.
      state={() => store.getState()}
      tools={tools}
      permissions={{
        // paymentMethod is missing on purpose. It never reaches the manifest,
        // so the model has no name to ask for.
        canAccess: ["user", "cart", "products", "currentPage"],
        canExecute: ["navigateTo", "addToCart", "clearCart"],
        stateDescriptions: {
          user: "The signed-in shopper's name and membership tier",
          cart: "Items currently in the cart, with quantities",
          products: "The catalogue, with ids, names and prices",
          currentPage: "The route the shopper is looking at",
        },
      }}
    >
      <ChatPanel />
    </AIAgentProvider>
  );
}

// Asked "What's in my cart?", the model takes two turns:
//   1. __readState({ keys: ["cart"] })  -> the loop returns { cart: [...] }
//   2. text only                        -> the interaction ends
`;

const next = [...guides, ...examples].filter((entry) =>
  ["/pull-based-state", "/examples/tool-execution", "/examples/permissions"].includes(
    entry.href
  )
);

export default function ChatExample() {
  return (
    <>
      <ExampleShell
        title="Reading state"
        lead="The agent answers a question about the app by pulling one state key, not by being handed the whole store."
        source={source}
        notes={
          <Section title="What happened">
            <Prose>
              <p>
                The manifest in the system prompt listed four keys and their
                descriptions. No values. To answer the cart question the model
                called <code>__readState</code> with{" "}
                <code>{`{ keys: ["cart"] }`}</code>, and the loop intersected
                that against <code>canAccess</code>, resolved the state getter,
                and fed back <code>{`{"cart": [...]}`}</code> as a tool result.
                The second turn was text only, which is what ends an
                interaction.
              </p>
              <p>
                Nothing about that round trip shows up in the tool log above:{" "}
                <code>__readState</code> is excluded from{" "}
                <code>AgentResponse.toolCalls</code>, <code>onToolCall</code>{" "}
                and <code>history</code>. It exists only inside the message list
                the model sees.
              </p>
              <p>
                <code>paymentMethod</code> is marked unreachable in the state
                panel because it is absent from <code>canAccess</code>. The
                model was never told the key exists. The{" "}
                <Link href="/examples/permissions">permissions example</Link>{" "}
                asks for it by name anyway and watches the loop drop it.
              </p>
            </Prose>

            <Callout tone="note" title="Reads are not cached">
              <p>
                A replayed transcript holds the values read at the time. The
                manifest instruction tells the model to read again when it needs
                current values, and <code>clearHistory()</code> drops the
                transcript altogether.
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
