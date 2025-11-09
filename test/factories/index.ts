// Simple factories for common entities used in tests

export function productFactory(overrides: Partial<any> = {}) {
  return {
    id: 'prod_' + Math.random().toString(36).slice(2, 8),
    slug: 'product-' + Math.random().toString(36).slice(2, 6),
    name: 'Test Product',
    price: 99.99,
    images: [{ url: '/test.jpg' }],
    totalStock: 5,
    ...overrides,
  };
}

export function userFactory(overrides: Partial<any> = {}) {
  return {
    id: 'user_' + Math.random().toString(36).slice(2, 8),
    name: 'Test User',
    email: 'test@example.com',
    ...overrides,
  };
}



