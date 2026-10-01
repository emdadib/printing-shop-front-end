import React from 'react';
import {
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';

/** One row of the category-wise expense breakdown returned by /accounting/expense-summary. */
export interface ExpenseCategoryTotal {
  /** Null/undefined for expenses recorded without a category. */
  categoryId?: string | null;
  category: string;
  amount: number;
  /** Number of expense entries in the category for the filtered period. */
  count?: number;
  /** Share of the grand total, already rounded to a whole percent. */
  percentage?: number;
}

interface ExpenseCategoryTotalsProps {
  rows: ExpenseCategoryTotal[];
  /** Grand total for the period, shown in the footer row. */
  total: number;
  formatCurrency: (amount: number) => string;
  emptyMessage?: string;
  /** When either handler is given, rows that have a category id get edit/delete buttons. */
  onEdit?: (categoryId: string) => void;
  onDelete?: (categoryId: string) => void;
}

const footerCellSx = { fontWeight: 'bold', color: 'text.primary', fontSize: '0.875rem' };

/**
 * Plain table of category totals, largest first, with a Total row at the bottom.
 */
const ExpenseCategoryTotals: React.FC<ExpenseCategoryTotalsProps> = ({
  rows,
  total,
  formatCurrency,
  emptyMessage = 'No categories',
  onEdit,
  onDelete,
}) => {
  const sorted = [...rows].sort((a, b) => b.amount - a.amount);
  const hasActions = Boolean(onEdit || onDelete);
  const totalCount = sorted.reduce((sum, row) => sum + (row.count ?? 0), 0);
  const columnCount = hasActions ? 4 : 3;

  return (
    <TableContainer>
      <Table aria-label="Category totals">
        <TableHead>
          <TableRow>
            <TableCell>Category</TableCell>
            <TableCell align="right">Entries</TableCell>
            <TableCell align="right">Total</TableCell>
            {hasActions && <TableCell align="right" />}
          </TableRow>
        </TableHead>
        <TableBody data-testid="expense-category-rows">
          {sorted.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columnCount} align="center">
                <Typography color="text.secondary">{emptyMessage}</Typography>
              </TableCell>
            </TableRow>
          ) : (
            sorted.map((row, index) => {
              const categoryId = row.categoryId;
              return (
                <TableRow key={categoryId ?? `${row.category}-${index}`} hover>
                  <TableCell>{row.category}</TableCell>
                  <TableCell align="right">{row.count ?? 0}</TableCell>
                  <TableCell align="right">{formatCurrency(row.amount)}</TableCell>
                  {hasActions && (
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      {categoryId && onEdit && (
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            aria-label={`Edit ${row.category}`}
                            onClick={() => onEdit(categoryId)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {categoryId && onDelete && (
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            aria-label={`Delete ${row.category}`}
                            onClick={() => onDelete(categoryId)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })
          )}
        </TableBody>
        {sorted.length > 0 && (
          <TableFooter>
            <TableRow data-testid="expense-category-total-row">
              <TableCell sx={footerCellSx}>Total</TableCell>
              <TableCell align="right" sx={footerCellSx}>
                {totalCount}
              </TableCell>
              <TableCell align="right" sx={footerCellSx}>
                {formatCurrency(total)}
              </TableCell>
              {hasActions && <TableCell />}
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </TableContainer>
  );
};

export default ExpenseCategoryTotals;
