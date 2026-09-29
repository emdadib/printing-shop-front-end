import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import ExpenseTotalsBar from './ExpenseTotalsBar';

const formatCurrency = (amount: number) => `Tk ${amount.toFixed(2)}`;

describe('ExpenseTotalsBar', () => {
  it('always shows the grand total, even when it is zero with no categories', () => {
    render(
      <ExpenseTotalsBar
        total={0}
        categoryTotals={[]}
        startDate="2026-09-01"
        endDate="2026-09-18"
        formatCurrency={formatCurrency}
      />
    );

    expect(screen.getByText('Total Expenses')).toBeInTheDocument();
    expect(screen.getByTestId('expense-total-amount')).toHaveTextContent('Tk 0.00');
    expect(screen.getByText('No category totals for this period')).toBeInTheDocument();
  });

  it('shows the filtered date range next to the total', () => {
    render(
      <ExpenseTotalsBar
        total={1250}
        categoryTotals={[]}
        startDate="2026-09-01"
        endDate="2026-09-18"
        formatCurrency={formatCurrency}
      />
    );

    expect(screen.getByText('2026-09-01 to 2026-09-18')).toBeInTheDocument();
    expect(screen.getByTestId('expense-total-amount')).toHaveTextContent('Tk 1250.00');
  });

  it('renders one chip per category total, largest first, with amount and share', () => {
    render(
      <ExpenseTotalsBar
        total={10000}
        categoryTotals={[
          { category: 'Utilities', amount: 2000, percentage: 20 },
          { category: 'Rent', amount: 5000, percentage: 50 },
          { category: 'Uncategorized', amount: 3000, percentage: 30 },
        ]}
        startDate="2026-09-01"
        endDate="2026-09-18"
        formatCurrency={formatCurrency}
      />
    );

    const chips = within(screen.getByTestId('expense-category-totals')).getAllByText(/: Tk /);
    expect(chips.map((chip) => chip.textContent)).toEqual([
      'Rent: Tk 5000.00 (50%)',
      'Uncategorized: Tk 3000.00 (30%)',
      'Utilities: Tk 2000.00 (20%)',
    ]);
  });

  it('omits the share when a percentage is not provided', () => {
    render(
      <ExpenseTotalsBar
        total={700}
        categoryTotals={[{ category: 'Stationery', amount: 700 }]}
        startDate=""
        endDate=""
        formatCurrency={formatCurrency}
      />
    );

    expect(screen.getByText('Stationery: Tk 700.00')).toBeInTheDocument();
    expect(screen.getByText('All time')).toBeInTheDocument();
  });
});
