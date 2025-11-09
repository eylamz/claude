import { render, screen } from '@/test/utils/render';

function Hello() {
  return <div>Hello Test</div>;
}

describe('example', () => {
  it('renders text', () => {
    render(<Hello />);
    expect(screen.getByText('Hello Test')).toBeInTheDocument();
  });
});



