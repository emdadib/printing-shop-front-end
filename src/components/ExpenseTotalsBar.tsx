import React from 'react';
import { Box, Chip, Paper, Typography } from '@mui/material';

export interface ExpenseCategoryTotal {
  category: string;
  amount: number;
  percentage?: number;
}

interface ExpenseTotalsBarProps {
  /** Grand total for the current filter. Always rendered, even when zero. */
  total: number;
  /** Per-category totals for the current filter. */
  categoryTotals: ExpenseCategoryTotal[];
  startDate: string;
  endDate: string;
  formatCurrency: (amount: number) => string;
}

const formatRange = (start: string, end: string): string => {
  if (start && end) return `${start} to ${end}`;
  if (start) return `From ${start}`;
  if (end) return `Until ${end}`;
  return 'All time';
};

/**
 * Compact strip shown above the expense list: the filtered grand total on the
 * left and one chip per category total on the right (largest first).
 */
const ExpenseTotalsBar: React.FC<ExpenseTotalsBarProps> = ({
  total,
  categoryTotals,
  startDate,
  endDate,
  formatCurrency,
}) => {
  const sorted = [...categoryTotals].sort((a, b) => b.amount - a.amount);

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }} data-testid="expense-totals-bar">
      <Box display="flex" flexWrap="wrap" alignItems="center" justifyContent="space-between" gap={2}>
        <Box sx={{ minWidth: 180 }}>
          <Typography variant="body2" color="text.secondary">
            Total Expenses
          </Typography>
          <Typography variant="h5" color="error.main" fontWeight="bold" data-testid="expense-total-amount">
            {formatCurrency(total)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatRange(startDate, endDate)}
          </Typography>
        </Box>

        <Box
          display="flex"
          flexWrap="wrap"
          gap={1}
          sx={{ flex: 1, justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}
          data-testid="expense-category-totals"
        >
          {sorted.length > 0 ? (
            sorted.map((item, index) => (
              <Chip
                key={`${item.category}-${index}`}
                variant="outlined"
                color="secondary"
                label={`${item.category}: ${formatCurrency(item.amount)}${
                  typeof item.percentage === 'number' ? ` (${item.percentage}%)` : ''
                }`}
              />
            ))
          ) : (
            <Typography variant="body2" color="text.secondary">
              No category totals for this period
            </Typography>
          )}
        </Box>
      </Box>
    </Paper>
  );
};

export default ExpenseTotalsBar;
