import { NextRequest } from 'next/server';
import * as handler from '@/app/api/cart/route';

const mockLimiter = { isAllowed: jest.fn().mockResolvedValue({ allowed: false, resetTime: Date.now() + 60000, remaining: 0 }) };
const mockManager = {
  getCart: jest.fn(),
  addToCart: jest.fn(),
  updateQuantity: jest.fn(),
  removeFromCart: jest.fn(),
  clearCart: jest.fn(),
};

jest.mock('@/lib/redis', () => ({
  getRateLimiter: () => mockLimiter,
  getCartManager: () => mockManager,
}));

describe('/api/cart', () => {
  it('rate limits requests', async () => {
    const req = new NextRequest('http://localhost/api/cart?userId=u1');
    const res = await handler.GET(req as any);
    expect(res.status).toBe(429);
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('0');
  });

  it('validates required identifiers', async () => {
    mockLimiter.isAllowed.mockResolvedValueOnce({ allowed: true, resetTime: Date.now(), remaining: 10 });
    const req = new NextRequest('http://localhost/api/cart');
    const res = await handler.GET(req as any);
    expect(res.status).toBe(400);
  });
});



