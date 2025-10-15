export class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(private capacity: number, private refillPerMs: number) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  take(cost = 1): boolean {
    this.refill();
    if (this.tokens >= cost) {
      this.tokens -= cost;
      return true;
    }
    return false;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const refill = elapsed * this.refillPerMs;
    if (refill > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + refill);
      this.lastRefill = now;
    }
  }
}
