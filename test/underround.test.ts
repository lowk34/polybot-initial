import { describe, it, expect } from 'vitest';
import { evaluateUnderround } from '../src/strategies/underroundArb.js';
import { OrderBook } from '../src/types.js';

function ob(yes: number, no: number): OrderBook {
  return {
    marketId: 'm1',
    bestAsk: { YES: { price: yes, size: 100 }, NO: { price: no, size: 100 } },
    bestBid: { YES: { price: Math.max(0.01, yes - 0.02), size: 100 }, NO: { price: Math.max(0.01, no - 0.02), size: 100 } },
    ts: Date.now(),
  };
}

describe('underround decision', () => {
  it('requires net edge above threshold', () => {
    // With cfg defaults (fee 2%, edge 1%), sum ask must be below 0.97
    const d1 = evaluateUnderround(ob(0.5, 0.5));
    expect(d1.shouldTrade).toBe(false);
  });
});
