import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import ExpenseCategoryTotals from './ExpenseCategoryTotals';

const formatCurrency = (amount: number) => `Tk ${amount.toFixed(2)}`;

const cellsOf = (row: HTMLElement) => within(row).getAllByRole('cell').map((cell) => cell.textContent);

describe('ExpenseCategoryTotals', () => {
  it('lists one row per category, largest first, with a total row', () => {
    render(
      <ExpenseCategoryTotals
        total={10000}
        rows={[
          { categoryId: 'c-util', category: 'Utilities', amount: 2000, count: 4 },
          { categoryId: 'c-rent', category: 'Rent', amount: 5000, count: 1 },
          { categoryId: null, category: 'Uncategorized', amount: 3000, count: 2 },
        ]}
        formatCurrency={formatCurrency}
      />
    );

    const bodyRows = within(screen.getByTestId('expense-category-rows')).getAllByRole('row');
    expect(bodyRows.map(cellsOf)).toEqual([
      ['Rent', '1', 'Tk 5000.00'],
      ['Uncategorized', '2', 'Tk 3000.00'],
      ['Utilities', '4', 'Tk 2000.00'],
    ]);
    expect(cellsOf(screen.getByTestId('expense-category-total-row'))).toEqual(['Total', '7', 'Tk 10000.00']);
  });

  it('shows the empty message and no total row when there are no categories', () => {
    render(
      <ExpenseCategoryTotals total={0} rows={[]} formatCurrency={formatCurrency} emptyMessage="No categories yet" />
    );

    expect(screen.getByText('No categories yet')).toBeInTheDocument();
    expect(screen.queryByTestId('expense-category-total-row')).not.toBeInTheDocument();
  });

  it('offers edit and delete only for rows with a category id when handlers are given', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <ExpenseCategoryTotals
        total={8000}
        rows={[
          { categoryId: 'c-rent', category: 'Rent', amount: 5000, count: 1 },
          { categoryId: null, category: 'Uncategorized', amount: 3000, count: 2 },
        ]}
        formatCurrency={formatCurrency}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit Rent' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete Rent' }));
    expect(onEdit).toHaveBeenCalledWith('c-rent');
    expect(onDelete).toHaveBeenCalledWith('c-rent');
    expect(screen.queryByRole('button', { name: /Uncategorized/ })).not.toBeInTheDocument();
    // The total row keeps an empty cell under the actions column.
    expect(cellsOf(screen.getByTestId('expense-category-total-row'))).toEqual(['Total', '3', 'Tk 8000.00', '']);
  });
});
