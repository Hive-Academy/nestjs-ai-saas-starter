import { RateLimiterService } from '../rate-limiter.service';

describe('RateLimiterService', () => {
  let svc: RateLimiterService;
  beforeEach(() => {
    svc = new RateLimiterService();
    svc.configure({
      tokensPerInterval: 2,
      intervalMs: 50,
      burst: 2,
      enabled: true,
    });
  });

  it('allows within burst then denies', () => {
    const k = 'k1';
    expect(svc.allow(k).allowed).toBe(true);
    expect(svc.allow(k).allowed).toBe(true);
    const third = svc.allow(k);
    expect(third.allowed).toBe(false);
  });

  it('refills after interval', async () => {
    const k = 'k2';
    svc.allow(k); // 1
    svc.allow(k); // 2
    expect(svc.allow(k).allowed).toBe(false);
    await new Promise((r) => setTimeout(r, 60));
    expect(svc.allow(k).allowed).toBe(true);
  });
});
