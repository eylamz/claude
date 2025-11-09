import { NextRequest } from 'next/server';
import * as handler from '@/app/api/orders/route';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/lib/db/mongodb', () => ({ __esModule: true, default: jest.fn() }));

describe('GET /api/orders', () => {
  it('returns 401 when not authenticated', async () => {
    const req = new NextRequest('http://localhost/api/orders');
    const res = await handler.GET(req as any);
    expect(res.status).toBe(401);
  });
});



