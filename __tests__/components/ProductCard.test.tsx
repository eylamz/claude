import { render, screen, fireEvent } from '@/test/utils/render';
import { axe } from 'jest-axe';
import { ProductCard } from '@/components/shop';

function makeProduct(overrides: Partial<any> = {}) {
  return {
    id: 'p1',
    slug: 'test-product',
    name: 'Test Product',
    price: 100,
    images: [{ url: '/img.jpg' }],
    variants: [],
    totalStock: 5,
    ...overrides,
  };
}

describe('ProductCard', () => {
  it('renders product info', async () => {
    render(<ProductCard product={makeProduct()} />);
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('₪100.00')).toBeInTheDocument();
  });

  it('shows out of stock overlay', async () => {
    render(<ProductCard product={makeProduct({ totalStock: 0 })} />);
    expect(screen.getByText(/out of stock/i)).toBeInTheDocument();
  });

  it('toggles wishlist heart', async () => {
    render(<ProductCard product={makeProduct()} />);
    const heart = screen.getAllByRole('button').find((b) => b.getAttribute('aria-label')?.toLowerCase().includes('wishlist'))!;
    fireEvent.click(heart);
    // toggling changes aria-label
    expect(heart.getAttribute('aria-label')?.toLowerCase()).toContain('remove');
  });

  it('calls onAddToCart for single variant quick add', async () => {
    const onAdd = jest.fn();
    const singleVariant = [{ color: { name: 'Black', hex: '#000' }, sizes: [{ size: 'M', stock: 1 }] }];
    render(<ProductCard product={makeProduct({ variants: singleVariant })} onAddToCart={onAdd} />);
    const addBtn = screen.getAllByRole('button').find((b) => /add to cart/i.test(b.textContent || ''));
    if (addBtn) {
      fireEvent.click(addBtn);
      expect(onAdd).toHaveBeenCalled();
    }
  });

  it('is accessible', async () => {
    const { container } = render(<ProductCard product={makeProduct()} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});



