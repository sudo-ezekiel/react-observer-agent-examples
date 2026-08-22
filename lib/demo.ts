"use client";

import { useMemo, useSyncExternalStore } from "react";
import { registerTool } from "react-observer-agent";
import type { AnyToolDefinition } from "react-observer-agent";

/**
 * The tiny shop every demo on this site runs against.
 *
 * Each page builds its own store instance rather than sharing one module-level
 * store, so navigating between demos never carries a half-filled cart along,
 * and a demo can be reset without touching the others.
 *
 * The store is deliberately not Zustand or Redux. The library only needs a way
 * to read current values, so a subscribe/getSnapshot pair is enough, and it
 * keeps the dependency list of this site down to the library itself.
 */

export type Product = {
  id: string;
  name: string;
  price: number;
};

export type ShopState = {
  user: { name: string; tier: string };
  cart: { id: string; name: string; qty: number }[];
  products: Product[];
  currentPage: string;
  /** Never listed in canAccess by the demos, to show what the agent cannot reach. */
  paymentMethod: { brand: string; last4: string };
};

export const PRODUCTS: Product[] = [
  { id: "sneakers-blue-01", name: "Blue sneakers", price: 74 },
  { id: "headphones-wireless-02", name: "Wireless headphones", price: 129 },
  { id: "backpack-canvas-03", name: "Canvas backpack", price: 58 },
];

function initialState(): ShopState {
  return {
    user: { name: "Ezekiel", tier: "member" },
    cart: [],
    products: PRODUCTS,
    currentPage: "/shop",
    paymentMethod: { brand: "Visa", last4: "6411" },
  };
}

export type ShopStore = {
  getState: () => ShopState;
  subscribe: (listener: () => void) => () => void;
  reset: () => void;
  addToCart: (productId: string) => string;
  clearCart: () => string;
  navigateTo: (path: string) => string;
};

export function createShopStore(): ShopStore {
  let state = initialState();
  const listeners = new Set<() => void>();

  const set = (next: ShopState) => {
    state = next;
    listeners.forEach((l) => l());
  };

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    reset() {
      set(initialState());
    },
    addToCart(productId) {
      const product = state.products.find((p) => p.id === productId);
      if (!product) return `No product with id "${productId}"`;

      const existing = state.cart.find((line) => line.id === productId);
      const cart = existing
        ? state.cart.map((line) =>
            line.id === productId ? { ...line, qty: line.qty + 1 } : line
          )
        : [...state.cart, { id: product.id, name: product.name, qty: 1 }];

      set({ ...state, cart });
      return `Added ${product.name} to the cart`;
    },
    clearCart() {
      const count = state.cart.length;
      set({ ...state, cart: [] });
      return count === 0 ? "The cart was already empty" : "Cart cleared";
    },
    navigateTo(path) {
      set({ ...state, currentPage: path });
      return `Navigated to ${path}`;
    },
  };
}

/** Subscribes a component to a store instance. */
export function useShop(store: ShopStore): ShopState {
  return useSyncExternalStore(
    store.subscribe,
    store.getState,
    store.getState // static export prerenders with the initial state
  );
}

/** A stable store instance for the lifetime of a demo page. */
export function useShopStore(): ShopStore {
  return useMemo(() => createShopStore(), []);
}

export const STATE_DESCRIPTIONS: Record<string, string> = {
  user: "The signed-in shopper's name and membership tier",
  cart: "Items currently in the cart, with quantities",
  products: "The catalogue, with ids, names and prices",
  currentPage: "The route the shopper is looking at",
};

/**
 * The tool set the demos register. `confirm` is on `clearCart` because it
 * destroys work the shopper did, which is the rule of thumb the docs give.
 */
export function createTools(store: ShopStore): AnyToolDefinition[] {
  return [
    registerTool("navigateTo", (args: { path: string }) => store.navigateTo(args.path), {
      description: "Navigate the shopper to a page in the app",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Route to navigate to" },
        },
        required: ["path"],
      },
    }),
    registerTool(
      "addToCart",
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
    registerTool("clearCart", () => store.clearCart(), {
      description: "Remove every item from the cart",
      confirm: true,
    }),
  ];
}
