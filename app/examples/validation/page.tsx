"use client";

import { AgentDemo } from "@/components/AgentDemo";
import { CodeBlock } from "@/components/CodeBlock";
import { Callout, Prose, NextLinks, Section } from "@/components/doc";
import { ExampleShell } from "@/components/ExampleShell";
import type { ShopState } from "@/lib/demo";
import { callTool, say } from "@/lib/scriptedAdapter";
import type { Plan } from "@/lib/scriptedAdapter";
import { examples, guides } from "@/lib/site";

const CAN_ACCESS = ["cart", "products"];
const CAN_EXECUTE = ["addToCart"];

const SUGGESTIONS = ["Add something to my cart", "Buy the third product"];

function cartSummary(cart: ShopState["cart"]): string {
  if (cart.length === 0) return "nothing";
  return cart.map((line) => `${line.qty} x ${line.name}`).join(", ");
}

const plan: Plan = (userMessage, state) => {
  const text = userMessage.toLowerCase();

  // A missing required property. The name the model invented is close enough
  // to look right and wrong enough to fail the schema.
  if (text.includes("something")) {
    return [
      callTool(
        "addToCart",
        { product: "blue sneakers" },
        { id: "call_add_bad_args" }
      ),
      callTool(
        "addToCart",
        { productId: "sneakers-blue-01" },
        { id: "call_add_good_args" }
      ),
      say(
        `Sorry, I sent the wrong field the first time. Fixed: your cart holds ${cartSummary(
          state.cart
        )}.`
      ),
    ];
  }

  // A type mismatch: the position in the list, where an id belongs.
  if (text.includes("third")) {
    return [
      callTool("addToCart", { productId: 3 }, { id: "call_add_bad_type" }),
      callTool("__readState", { keys: ["products"] }, { id: "call_read_products" }),
      callTool(
        "addToCart",
        { productId: "backpack-canvas-03" },
        { id: "call_add_good_type" }
      ),
      say(
        `The third product is the Canvas backpack, and productId wants the id rather than the position. Your cart holds ${cartSummary(
          state.cart
        )}.`
      ),
    ];
  }

  return [];
};

const source = `registerTool("addToCart", (args: { productId: string }) => store.addToCart(args.productId), {
  description: "Add one unit of a product to the cart by its id",
  // Enforced at runtime, not just advertised to the model.
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
});

// Turn 1: addToCart({ product: "blue sneakers" })
//   -> status "error", handler not called, and the model receives
//      { error: 'Invalid arguments for tool "addToCart": productId is required' }
//
// Turn 2: addToCart({ productId: "sneakers-blue-01" })
//   -> status "success", the handler runs
`;

const schemaSource = `import { z } from "zod";
import { registerTool } from "react-observer-agent";

const AddToCart = z.object({
  productId: z.string(),
  qty: z.number().int().positive("must be at least 1").default(1),
});

// No type argument and no annotation on args. Its type comes from the schema
// output, so qty is a number in here even though the model may leave it out.
registerTool("addToCart", (args) => store.addToCart(args.productId, args.qty), {
  description: "Add units of a product to the cart by its id",
  // Still written by hand. This is what the model reads, and the library does
  // not derive it from the validator.
  parameters: {
    type: "object",
    properties: {
      productId: { type: "string" },
      qty: { type: "integer", minimum: 1 },
    },
    required: ["productId"],
  },
  schema: AddToCart,
});

// addToCart({ productId: "backpack-canvas-03" })
//   -> the handler receives { productId: "backpack-canvas-03", qty: 1 }
//
// addToCart({ productId: "backpack-canvas-03", qty: 0 })
//   -> status "error", handler not called, and the model receives
//      { error: 'Invalid arguments for tool "addToCart": qty: must be at least 1' }
`;

const next = [...guides, ...examples].filter((entry) =>
  ["/permissions", "/examples/permissions", "/examples/confirmation"].includes(
    entry.href
  )
);

export default function ValidationExample() {
  return (
    <>
      <ExampleShell
        title="Argument validation"
        lead="The model sends arguments that do not match the parameters schema. The call is rejected, the reason goes back to the model, and it tries again."
        source={source}
        notes={
          <>
            <Section title="What happened">
              <Prose>
                <p>
                  Read the tool log from the top. The first row is{" "}
                  <code>error</code> and the second is <code>success</code>, both
                  for <code>addToCart</code>, in one interaction. The handler was
                  called exactly once, for the second row. A rejected call never
                  reaches your code, so it cannot half-apply a change.
                </p>
                <p>
                  The error text is not just logged. It is serialized back into
                  the conversation as the tool result, which is the whole reason
                  the model can correct itself on the next turn: it is told what
                  was wrong with the arguments in the same words you see above.
                </p>
                <p>
                  The second prompt fails differently, on{" "}
                  <code>{`productId should be string, got integer`}</code>. Same
                  path, different rule.
                </p>
              </Prose>

              <Callout tone="warn" title="Validation is a subset, on purpose">
                <p>
                  The checker covers <code>type</code>, <code>properties</code>,{" "}
                  <code>required</code>, <code>items</code> and{" "}
                  <code>enum</code>, and ignores every other keyword rather than
                  refusing to run. A richer schema still validates on the parts
                  the library understands, which also means keywords it skips
                  let values through. Treat <code>args</code> inside a handler
                  as untrusted input, or hand the tool a real validator through{" "}
                  <code>schema</code>, which replaces this subset entirely.
                </p>
              </Callout>

              <Prose>
                <p>
                  Validation sits between the permission check and confirmation.
                  A tool that is not allowlisted never gets here, and a{" "}
                  <code>confirm: true</code> tool is validated before anyone is
                  asked to approve it.
                </p>
              </Prose>
            </Section>

            <Section title="Bringing your own validator">
              <Prose>
                <p>
                  <code>registerTool</code> takes a <code>schema</code> option
                  holding any{" "}
                  <a
                    href="https://standardschema.dev"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Standard Schema
                  </a>{" "}
                  validator: Zod 3.24+, Valibot 1+, ArkType 2+. The library
                  carries its own copy of that interface, so it stays dependency
                  free and does not care which one you bring. This site ships no
                  validator, so the block below is code to copy rather than a
                  demo you can press.
                </p>
              </Prose>

              <CodeBlock code={schemaSource} lang="ts" />

              <Prose>
                <p>
                  With a <code>schema</code> present the built-in check does not
                  run at all, so every keyword the subset skips becomes the
                  validator&apos;s business. The <code>minimum: 1</code> above is
                  enforced by Zod and ignored by <code>parameters</code>.
                </p>
                <p>
                  The handler receives what the validator returned rather than
                  what the model sent, so defaults and transforms have already
                  applied by the time your code runs. That same value is what
                  reaches <code>toolCalls</code>, <code>onToolCall</code>, the{" "}
                  <code>tool_end</code> event and the <code>onConfirm</code>{" "}
                  prompt, which means an approval card shows the arguments that
                  will actually run.
                </p>
                <p>
                  <code>parameters</code> still supplies the JSON Schema the
                  model reads. The library does not derive one from the
                  validator, so keeping the two descriptions in step is your job.
                </p>
                <p>
                  A rejected call takes the same path as any other. The
                  validator&apos;s issues are joined into the message the model
                  is told, each one prefixed with its path, so a nested field
                  arrives as <code>address.postcode</code> followed by whatever
                  the validator said about it.
                </p>
              </Prose>

              <Callout tone="note" title="Let the schema supply the type">
                <p>
                  <code>registerTool&lt;T&gt;(name, handler, {"{ schema }"})</code>{" "}
                  is a compile error at the <code>schema</code> property, whether
                  or not the two agree. An explicit type argument turns inference
                  off, which would leave two unchecked sources of truth for the
                  argument type. Drop it. Annotating the handler parameter is
                  still allowed, as long as the annotation matches the schema
                  output.
                </p>
              </Callout>
            </Section>
          </>
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
