import { render, screen, fireEvent, waitFor } from '@/test/utils/render';
import { axe } from 'jest-axe';
import CartDrawer from '@/components/cart/CartDrawer';

const toggleCart = jest.fn();
const updateQuantity = jest.fn().mockResolvedValue(true);
const removeItem = jest.fn().mockResolvedValue(true);

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/stores/cartStore', () => ({
  __esModule: true,
  useCartStore: () => ({ toggleCart, updateQuantity, removeItem }),
  useCartItems: () => ([{
    id: 'ci1',
    productId: 'p1',
    productName: 'Prod A',
    productSlug: 'prod-a',
    variantId: 'v1',
    sku: 'SKU1',
    color: '#000000',
    size: 'M',
    price: 20,
    quantity: 2,
    maxStock: 5,
    imageUrl: '/a.jpg',
  }]),
  useCartIsOpen: () => true,
  useCartTotals: () => ({ subtotal: 40, discount: 0, tax: 3.2, total: 43.2, itemCount: 2 }),
  useCartIsLoading: () => false,
  useCartError: () => null,
}));

describe('CartDrawer', () => {
  it('shows items and totals', async () => {
    render(<CartDrawer />);
    expect(screen.getByText(/shopping cart/i)).toBeInTheDocument();
    expect(screen.getByText('Prod A')).toBeInTheDocument();
    expect(screen.getByText(/subtotal/i)).toBeInTheDocument();
  });

  it('updates quantity', async () => {
    render(<CartDrawer />);
    const inc = screen.getByRole('button', { name: /increase quantity/i });
    fireEvent.click(inc);
    await waitFor(() => expect(updateQuantity).toHaveBeenCalled());
  });

  it('removes items', async () => {
    render(<CartDrawer />);
    const removeBtn = screen.getByRole('button', { name: /remove item/i });
    fireEvent.click(removeBtn);
    await waitFor(() => expect(removeItem).toHaveBeenCalled());
  });

  it('is accessible', async () => {
    const { container } = render(<CartDrawer />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});



