import { useState } from 'react';
import {
  AIAgentProvider,
  claudeAdapter,
  openAIAdapter,
  type AgentError,
} from 'react-observer-agent';
import { useAppStore } from './store';
import { tools } from './tools';
import { ChatPanel } from './ChatPanel';

// Set VITE_PROVIDER=claude to run the same example against the Anthropic API.
const provider = import.meta.env.VITE_PROVIDER === 'claude' ? 'claude' : 'openai';

// Both point at the dev server's /api proxy, which holds the key. See
// vite.config.ts, and section 3.4 of the spec for the production pattern.
const model =
  provider === 'claude'
    ? claudeAdapter({ baseURL: '/api/anthropic' })
    : openAIAdapter({ baseURL: '/api/openai' });

// Resolved inside the agent loop, outside React rendering, so this reads the
// store through its vanilla API rather than calling the hook.
const getAppState = () => useAppStore.getState();

export default function App() {
  const [lastError, setLastError] = useState<AgentError | null>(null);

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1>react-observer-agent: basic example</h1>
      <p>
        Current page: <strong>{useAppStore((s) => s.currentPage)}</strong> | Cart
        items: <strong>{useAppStore((s) => s.cart.length)}</strong> | Provider:{' '}
        <strong>{provider}</strong>
      </p>

      {lastError && (
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 12,
            marginBottom: 16,
            padding: '10px 14px',
            borderRadius: 8,
            border: '1px solid #f0b4b4',
            background: '#fdecec',
            color: '#8a1f1f',
            fontSize: 14,
          }}
        >
          <span style={{ flex: 1 }}>
            <strong>{lastError.code ?? 'Error'}</strong>
            {lastError.status ? ` (HTTP ${lastError.status})` : ''}:{' '}
            {lastError.message}
          </span>
          <button
            type="button"
            onClick={() => setLastError(null)}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'inherit',
              cursor: 'pointer',
              fontSize: 13,
              textDecoration: 'underline',
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      <AIAgentProvider
        model={model}
        state={getAppState}
        tools={tools}
        permissions={{
          canAccess: ['user', 'currentPage', 'cart', 'products'],
          canExecute: ['navigateTo', 'addToCart', 'checkStock', 'clearCart'],
          stateDescriptions: {
            user: 'Current logged-in user profile (name, email)',
            currentPage: 'The page the user is currently viewing',
            cart: 'Shopping cart items and quantities',
            products: 'Available product catalog with IDs, names, and prices',
          },
        }}
        options={{
          debug: true,
          systemPrompt:
            'You are a helpful shopping assistant. You can navigate the app, add products to the cart, check stock, and clear the cart. Use readState to check available products before answering questions.',
          // The failed turn is also in history with its error attached, which
          // ChatPanel renders in place. This is the app-level copy, where a real
          // app would log or report. A cancel never arrives here.
          onError: (error) => setLastError(error),
          onConfirm: async (pending) => {
            return window.confirm(
              `Allow "${pending.toolName}" with args ${JSON.stringify(pending.args)}?`,
            );
          },
        }}
      >
        <ChatPanel />
      </AIAgentProvider>
    </div>
  );
}
