import { registerTool, type ToolContext } from 'react-observer-agent';
import { useAppStore } from './store';

export const navigateTo = registerTool(
  'navigateTo',
  async (args: { page: string }) => {
    useAppStore.getState().navigateTo(args.page);
    return `Navigated to ${args.page}`;
  },
  {
    description: 'Navigate to a different page in the app',
    parameters: {
      type: 'object',
      properties: {
        page: {
          type: 'string',
          enum: ['home', 'products', 'cart', 'profile'],
          description: 'The page to navigate to',
        },
      },
      required: ['page'],
    },
  },
);

export const addToCart = registerTool(
  'addToCart',
  async (args: { productId: string }) => {
    useAppStore.getState().addToCart(args.productId);
    const product = useAppStore.getState().products.find((p) => p.id === args.productId);
    return product ? `Added "${product.name}" to cart` : `Product ${args.productId} not found`;
  },
  {
    description: 'Add a product to the shopping cart by product ID',
    parameters: {
      type: 'object',
      properties: {
        productId: {
          type: 'string',
          description: 'The ID of the product to add (e.g. "p1", "p2", "p3")',
        },
      },
      required: ['productId'],
    },
  },
);

/** Stock counts live in an inventory service in a real app. This stands in. */
const STOCK_BY_PRODUCT_ID: Record<string, number> = { p1: 12, p2: 0, p3: 5 };

/** Long enough that the Stop button can land while the lookup is in flight. */
const STOCK_LOOKUP_MS = 2500;

/**
 * The round trip a real inventory service would make. A fetch would take the
 * signal straight through as `fetch(url, { signal })`; a timer has to wire it up
 * by hand, but the contract is the same one: when the interaction is cancelled
 * the work stops here rather than finishing into a result nobody reads.
 */
function lookupStock(productId: string, signal?: AbortSignal): Promise<number> {
  return new Promise((resolve, reject) => {
    const cancel = () =>
      reject(new DOMException('Stock lookup cancelled', 'AbortError'));

    if (signal?.aborted) {
      cancel();
      return;
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve(STOCK_BY_PRODUCT_ID[productId] ?? 0);
    }, STOCK_LOOKUP_MS);

    const onAbort = () => {
      clearTimeout(timer);
      cancel();
    };

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export const checkStock = registerTool(
  'checkStock',
  async (args: { productId: string }, context?: ToolContext) => {
    const product = useAppStore.getState().products.find((p) => p.id === args.productId);
    if (!product) return `Product ${args.productId} not found`;

    // Handlers written against 0.2.0 took one argument, so the context is
    // declared optional and read defensively.
    const units = await lookupStock(product.id, context?.signal);
    return units > 0
      ? `${product.name}: ${units} in stock`
      : `${product.name} is out of stock`;
  },
  {
    description: 'Check how many units of a product are in stock, by product ID',
    parameters: {
      type: 'object',
      properties: {
        productId: {
          type: 'string',
          description: 'The ID of the product to check (e.g. "p1", "p2", "p3")',
        },
      },
      required: ['productId'],
    },
  },
);

export const clearCart = registerTool(
  'clearCart',
  async () => {
    useAppStore.getState().clearCart();
    return 'Cart cleared';
  },
  {
    description: 'Remove all items from the shopping cart',
    confirm: true,
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
);

export const tools = [navigateTo, addToCart, checkStock, clearCart];
