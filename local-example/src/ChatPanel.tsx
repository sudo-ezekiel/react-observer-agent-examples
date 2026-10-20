import { useRef, useState, type FormEvent } from 'react';
import { useAgent, type AgentError } from 'react-observer-agent';

/** A cancel is a user decision rather than a failure, so it reads differently. */
function errorText(error: AgentError) {
  if (error.code === 'ABORTED') return 'Cancelled';
  const status = error.status ? ` (HTTP ${error.status})` : '';
  return `${error.code ?? 'Error'}${status}: ${error.message}`;
}

export function ChatPanel() {
  const { send, history, isProcessing } = useAgent();
  const [input, setInput] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const message = input.trim();
    if (!message || isProcessing) return;
    setInput('');
    const controller = new AbortController();
    abortRef.current = controller;
    void send(message, { signal: controller.signal });
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <h2>Chat</h2>

      <div
        style={{
          border: '1px solid #ccc',
          borderRadius: 8,
          padding: 16,
          height: 400,
          overflowY: 'auto',
          marginBottom: 12,
          background: '#fafafa',
        }}
      >
        {history.map((entry, i) => (
          <div
            key={i}
            style={{
              marginBottom: 8,
              textAlign: entry.role === 'user' ? 'right' : 'left',
            }}
          >
            {entry.content ? (
              <span
                style={{
                  display: 'inline-block',
                  padding: '8px 12px',
                  borderRadius: 12,
                  background: entry.role === 'user' ? '#0071e3' : '#e5e5ea',
                  color: entry.role === 'user' ? '#fff' : '#000',
                  maxWidth: '80%',
                  wordBreak: 'break-word',
                }}
              >
                {entry.content}
              </span>
            ) : null}

            {/* An interaction that failed still gets an assistant entry, with
                empty content and the error attached. Without this the turn
                renders as a blank pill. */}
            {entry.error ? (
              <div style={{ marginTop: entry.content ? 4 : 0 }}>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '8px 12px',
                    borderRadius: 12,
                    border: '1px solid #f0b4b4',
                    background: '#fdecec',
                    color: '#8a1f1f',
                    maxWidth: '80%',
                    wordBreak: 'break-word',
                    fontSize: 13,
                  }}
                >
                  {errorText(entry.error)}
                </span>
              </div>
            ) : null}
          </div>
        ))}
        {isProcessing && (
          <div style={{ color: '#999', fontStyle: 'italic' }}>Thinking…</div>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the agent something…"
          disabled={isProcessing}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid #ccc',
            fontSize: 14,
          }}
        />
        <button
          type="submit"
          disabled={isProcessing || !input.trim()}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            background: '#0071e3',
            color: '#fff',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          Send
        </button>
        <button
          type="button"
          onClick={() => abortRef.current?.abort()}
          disabled={!isProcessing}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: '1px solid #ccc',
            background: '#fff',
            color: '#333',
            cursor: isProcessing ? 'pointer' : 'default',
            fontSize: 14,
          }}
        >
          Stop
        </button>
      </form>
    </div>
  );
}
