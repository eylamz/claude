import { render, screen, fireEvent } from '@/test/utils/render';
import { axe } from 'jest-axe';
import VariantSelector from '@/components/shop/VariantSelector';

const variants = [
  { id: '1', color: 'Red', colorHex: '#f00', size: 'M', stock: 3, sku: 'R-M' },
  { id: '2', color: 'Red', colorHex: '#f00', size: 'L', stock: 0, sku: 'R-L' },
  { id: '3', color: 'Blue', colorHex: '#00f', size: 'M', stock: 10, sku: 'B-M' },
];

describe('VariantSelector', () => {
  it('selects color and updates sizes availability', () => {
    const onChange = jest.fn();
    render(
      <VariantSelector
        variants={variants as any}
        onVariantChange={onChange}
        selectedColor={null}
        selectedSize={null}
      />
    );
    const redBtn = screen.getByRole('button', { name: /select red color/i });
    fireEvent.click(redBtn);
    const sizeM = screen.getByRole('button', { name: /select size m/i });
    const sizeL = screen.getByRole('button', { name: /select size l/i });
    expect(sizeM).not.toHaveAttribute('aria-disabled', 'true');
    expect(sizeL).toHaveAttribute('aria-disabled', 'true');
  });

  it('shows stock updates on size selection', () => {
    const onChange = jest.fn();
    render(
      <VariantSelector
        variants={variants as any}
        onVariantChange={onChange}
        selectedColor={'Blue'}
        selectedSize={'M'}
      />
    );
    expect(screen.getByText(/in stock/i)).toBeInTheDocument();
  });

  it('is accessible', async () => {
    const { container } = render(
      <VariantSelector
        variants={variants as any}
        onVariantChange={() => {}}
        selectedColor={null}
        selectedSize={null}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});



