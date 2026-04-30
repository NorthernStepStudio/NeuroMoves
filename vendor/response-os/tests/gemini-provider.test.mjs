import assert from 'node:assert/strict';
import test from 'node:test';

import { GeminiProvider } from '../dist/index.js';

test('GeminiProvider requires a non-empty API key', () => {
  assert.throws(() => new GeminiProvider(''), /non-empty API key/i);
});

test('GeminiProvider maps successful response payload to AgentResult', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        candidates: [
          {
            finishReason: 'STOP',
            content: {
              parts: [{ text: 'Hello from Gemini' }],
            },
          },
        ],
        usageMetadata: {
          promptTokenCount: 12,
          candidatesTokenCount: 5,
          totalTokenCount: 17,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  try {
    const provider = new GeminiProvider({
      apiKey: 'test-key',
      apiBaseUrl: 'https://example.invalid',
      timeoutMs: 3000,
    });

    const result = await provider.generate({
      messages: [{ role: 'user', content: 'hi' }],
      budget: {
        maxSteps: 5,
        maxTotalTokens: 1000,
        currentSteps: 0,
        currentTokens: 0,
      },
    });

    assert.equal(result.content, 'Hello from Gemini');
    assert.equal(result.finishReason, 'stop');
    assert.deepEqual(result.usage, {
      promptTokens: 12,
      completionTokens: 5,
      totalTokens: 17,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('GeminiProvider throws on non-2xx response', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('Unauthorized', { status: 401 });

  try {
    const provider = new GeminiProvider({
      apiKey: 'test-key',
      apiBaseUrl: 'https://example.invalid',
      timeoutMs: 3000,
    });

    await assert.rejects(
      () =>
        provider.generate({
          messages: [{ role: 'user', content: 'hi' }],
          budget: {
            maxSteps: 5,
            maxTotalTokens: 1000,
            currentSteps: 0,
            currentTokens: 0,
          },
        }),
      /Gemini request failed \(401\)/i
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
