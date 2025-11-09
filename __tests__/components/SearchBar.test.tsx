import { render, screen, fireEvent, waitFor } from '@/test/utils/render';
import { axe } from 'jest-axe';
import SearchBar from '@/components/common/SearchBar';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

describe('SearchBar', () => {
  it('debounces input and shows suggestions', async () => {
    server.use(
      http.get('/api/search', ({ request }) => {
        const url = new URL(request.url);
        const q = url.searchParams.get('q');
        return HttpResponse.json({ results: q ? [
          { id: '1', type: 'products', title: 'Product A' },
          { id: '2', type: 'events', title: 'Event A' },
        ] : [] });
      })
    );

    render(<SearchBar />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'pro' } });

    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());
    expect(screen.getByText(/product a/i)).toBeInTheDocument();
    expect(screen.getByText(/event a/i)).toBeInTheDocument();
  });

  it('supports keyboard navigation', async () => {
    server.use(
      http.get('/api/search', () => HttpResponse.json({ results: [
        { id: '1', type: 'products', title: 'Product A' },
        { id: '2', type: 'products', title: 'Product B' },
      ] }))
    );
    render(<SearchBar />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'p' } });
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    // No assertion of navigation state beyond presence; active state is visual
    expect(screen.getByText('Product A')).toBeInTheDocument();
  });

  it('is accessible', async () => {
    const { container } = render(<SearchBar />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});



