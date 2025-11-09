import * as handler from '@/app/api/admin/dashboard/route';

const getServerSession = jest.fn();

jest.mock('next-auth', () => ({ getServerSession }));
jest.mock('@/lib/db/mongodb', () => ({ __esModule: true, default: jest.fn() }));

const User = { findById: jest.fn() } as any;
const Product = { find: jest.fn().mockResolvedValue([]) } as any;

jest.mock('@/lib/models/User', () => ({ __esModule: true, default: User }));
jest.mock('@/lib/models/Product', () => ({ __esModule: true, default: Product }));

describe('GET /api/admin/dashboard', () => {
  it('requires auth', async () => {
    getServerSession.mockResolvedValueOnce(null);
    const res = await handler.GET();
    expect(res.status).toBe(401);
  });

  it('requires admin role', async () => {
    getServerSession.mockResolvedValueOnce({ user: { id: 'u1' } });
    User.findById.mockResolvedValueOnce({ role: 'user' });
    const res = await handler.GET();
    expect(res.status).toBe(403);
  });
});


