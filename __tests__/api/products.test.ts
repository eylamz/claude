import { NextRequest } from 'next/server';
import * as handler from '@/app/api/products/route';

jest.mock('@/lib/db/mongodb', () => ({ __esModule: true, default: jest.fn() }));

const mockFind = jest.fn().mockReturnValue({
  sort: () => ({ skip: () => ({ limit: () => ({ lean: () => Promise.resolve([]) }) }) }),
});
const mockCount = jest.fn().mockResolvedValue(0);

jest.mock('@/lib/models/Product', () => ({
  __esModule: true,
  default: { find: (...args: any[]) => mockFind(...args), countDocuments: (...a: any[]) => mockCount(...a) },
}));

describe('GET /api/products', () => {
  it('returns products with status 200', async () => {
    const req = new NextRequest('http://localhost/api/products?locale=en&page=1&limit=12');
    const res = await handler.GET(req as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('products');
    expect(Array.isArray(json.products)).toBe(true);
  });

  it('applies filters and sorting safely', async () => {
    const req = new NextRequest('http://localhost/api/products?category=boards&minPrice=10&maxPrice=100&sort=price-asc');
    await handler.GET(req as any);
    expect(mockFind).toHaveBeenCalled();
  });
});



