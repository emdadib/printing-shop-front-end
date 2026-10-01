import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import POSOrderPage from './POSOrderPage';
import { apiService } from '@/services/api';

vi.mock('@/services/api', () => ({
  apiService: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({
    settings: [],
    loading: false,
    error: null,
    getSettingValue: (_key: string, defaultValue = '') => defaultValue,
    formatCurrency: (amount: number) => `Tk ${amount.toFixed(2)}`,
  }),
}));

const customers = [
  { id: 'c1', firstName: 'Rahim', lastName: 'Uddin', email: null, phone: '01711000000' },
  { id: 'c2', firstName: 'Karim', lastName: 'Ahmed', email: 'karim@example.com', phone: null },
];

const renderPage = () =>
  render(
    <MemoryRouter>
      <POSOrderPage />
    </MemoryRouter>
  );

describe('POSOrderPage customer search', () => {
  beforeEach(() => {
    vi.mocked(apiService.get).mockImplementation(async (url: string) => {
      if (url.startsWith('/customers')) {
        return { success: true, data: customers };
      }
      return { success: true, data: [] };
    });
  });

  it('keeps the typed text and lists matching customers instead of snapping back to walk-in', async () => {
    const user = userEvent.setup();
    renderPage();

    const input = screen.getByRole('combobox', { name: 'Customer' });
    expect(input).toHaveValue('🚶 Walk-in Customer');

    await user.clear(input);
    await user.type(input, 'rah');

    expect(input).toHaveValue('rah');
    expect(await screen.findByRole('option', { name: /Rahim Uddin/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Walk-in Customer/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Karim Ahmed/ })).not.toBeInTheDocument();
  });

  it('offers to add the typed name when no registered customer matches', async () => {
    const user = userEvent.setup();
    renderPage();

    const input = screen.getByRole('combobox', { name: 'Customer' });
    await user.clear(input);
    await user.type(input, 'Nobody');

    expect(input).toHaveValue('Nobody');
    expect(
      await screen.findByRole('option', { name: /Add "Nobody" as new customer/ })
    ).toBeInTheDocument();
  });

  it('still lists the walk-in option when the search box is empty', async () => {
    const user = userEvent.setup();
    renderPage();

    const input = screen.getByRole('combobox', { name: 'Customer' });
    await user.clear(input);
    await user.click(input);

    expect(await screen.findByRole('option', { name: /Walk-in Customer/ })).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: /Rahim Uddin/ })).toBeInTheDocument();
  });
});
