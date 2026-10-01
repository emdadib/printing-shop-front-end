import React, { useState, useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { apiService } from '../services/api';
import { useSettings } from '../hooks/useSettings';
import ExpenseCategoryTotals, { ExpenseCategoryTotal } from '../components/ExpenseCategoryTotals';

// Types
interface Expense {
  id: string;
  amount: number;
  description?: string;
  reference?: string;
  expenseCategoryId?: string;
  expenseCategory?: {
    id: string;
    name: string;
  };
  date: string;
}

interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
}

interface ExpenseSummary {
  totalExpenses: number;
  categoryBreakdown: ExpenseCategoryTotal[];
}

// Validation schemas. The server always records an expense as an EXPENSES/DEBIT
// transaction, so the form only collects what the user actually decides.
const expenseSchema = yup.object({
  date: yup.string().required('Date is required'),
  amount: yup
    .number()
    .typeError('Amount is required')
    .positive('Amount must be greater than 0')
    .required('Amount is required'),
  expenseCategoryId: yup.string().optional(),
  description: yup.string().optional(),
  reference: yup.string().optional()
});

const categorySchema = yup.object({
  name: yup.string().required('Name is required'),
  description: yup.string().optional()
});

type ExpenseFormValues = yup.InferType<typeof expenseSchema>;
type CategoryFormValues = yup.InferType<typeof categorySchema>;

// Local calendar date as YYYY-MM-DD for <input type="date"> (toISOString would shift the day in UTC+ zones).
const toDateInput = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const ExpensePage: React.FC = () => {
  const { formatCurrency } = useSettings();
  const [activeTab, setActiveTab] = useState(0);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openExpenseDialog, setOpenExpenseDialog] = useState(false);
  const [openCategoryDialog, setOpenCategoryDialog] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [dateFilter, setDateFilter] = useState<{ start: string; end: string }>(() => {
    const now = new Date();
    return {
      start: toDateInput(new Date(now.getFullYear(), now.getMonth(), 1)),
      end: toDateInput(now)
    };
  });

  const {
    control: expenseControl,
    handleSubmit: handleExpenseSubmit,
    reset: resetExpense,
    formState: { errors: expenseErrors }
  } = useForm<ExpenseFormValues>({
    resolver: yupResolver(expenseSchema),
    defaultValues: {
      date: toDateInput(new Date()),
      amount: undefined,
      expenseCategoryId: '',
      description: '',
      reference: ''
    }
  });

  const {
    control: categoryControl,
    handleSubmit: handleCategorySubmit,
    reset: resetCategory,
    formState: { errors: categoryErrors }
  } = useForm<CategoryFormValues>({
    resolver: yupResolver(categorySchema),
    defaultValues: {
      name: '',
      description: ''
    }
  });

  // Fetch data
  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const response = await apiService.get(
        `/accounting/expenses?startDate=${dateFilter.start}&endDate=${dateFilter.end}&page=${page + 1}&limit=${rowsPerPage}`
      );
      const payload = response?.success && response.data ? response.data : response;
      const list: Expense[] = Array.isArray(payload) ? payload : payload?.transactions || [];
      setExpenses(list);
      // Server-side total for the current filter so pagination spans every page
      setTotalCount(Number(payload?.pagination?.total ?? list.length));
    } catch (error) {
      console.error('Error fetching expenses:', error);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await apiService.get('/accounting/expense-categories');
      if (response.success && response.data) {
        setCategories(response.data);
      } else if (Array.isArray(response)) {
        setCategories(response);
      } else {
        setCategories([]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await apiService.get(
        `/accounting/expense-summary?startDate=${dateFilter.start}&endDate=${dateFilter.end}`
      );
      if (response.success && response.data) {
        setSummary(response.data);
      } else {
        setSummary(response);
      }
    } catch (error) {
      console.error('Error fetching expense summary:', error);
    }
  };

  useEffect(() => {
    fetchExpenses();
    fetchCategories();
    fetchSummary();
  }, [page, rowsPerPage, dateFilter]);

  // Handlers
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleDateFilterChange = (field: 'start' | 'end', value: string) => {
    setDateFilter((prev) => ({ ...prev, [field]: value }));
    setPage(0);
  };

  const handleOpenExpenseDialog = (expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense);
      resetExpense({
        date: expense.date.split('T')[0],
        amount: Number(expense.amount),
        expenseCategoryId: expense.expenseCategoryId || '',
        description: expense.description || '',
        reference: expense.reference || ''
      });
    } else {
      setEditingExpense(null);
      resetExpense({
        date: toDateInput(new Date()),
        amount: undefined,
        expenseCategoryId: '',
        description: '',
        reference: ''
      });
    }
    setOpenExpenseDialog(true);
  };

  const handleCloseExpenseDialog = () => {
    setOpenExpenseDialog(false);
    setEditingExpense(null);
  };

  const handleOpenCategoryDialog = (category?: ExpenseCategory) => {
    if (category) {
      setEditingCategory(category);
      resetCategory({
        name: category.name,
        description: category.description || ''
      });
    } else {
      setEditingCategory(null);
      resetCategory({ name: '', description: '' });
    }
    setOpenCategoryDialog(true);
  };

  const handleCloseCategoryDialog = () => {
    setOpenCategoryDialog(false);
    setEditingCategory(null);
  };

  const onSubmitExpense = async (data: ExpenseFormValues) => {
    try {
      if (editingExpense) {
        await apiService.put(`/accounting/expenses/${editingExpense.id}`, data);
      } else {
        await apiService.post('/accounting/expenses', data);
      }
      handleCloseExpenseDialog();
      fetchExpenses();
      fetchSummary();
    } catch (error) {
      console.error('Error saving expense:', error);
      setError('Failed to save expense');
    }
  };

  const onSubmitCategory = async (data: CategoryFormValues) => {
    try {
      if (editingCategory) {
        await apiService.put(`/accounting/expense-categories/${editingCategory.id}`, data);
      } else {
        await apiService.post('/accounting/expense-categories', data);
      }
      handleCloseCategoryDialog();
      fetchCategories();
      fetchSummary();
    } catch (error) {
      console.error('Error saving category:', error);
      setError('Failed to save category');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (window.confirm('Delete this expense?')) {
      try {
        await apiService.delete(`/accounting/expenses/${id}`);
        fetchExpenses();
        fetchSummary();
      } catch (error) {
        console.error('Error deleting expense:', error);
        setError('Failed to delete expense');
      }
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (window.confirm('Delete this category?')) {
      try {
        await apiService.delete(`/accounting/expense-categories/${id}`);
        fetchCategories();
        fetchSummary();
      } catch (error) {
        console.error('Error deleting category:', error);
        setError('Failed to delete category');
      }
    }
  };

  // One row per category (zero when it has no expenses in the period), plus any
  // breakdown entry that matches no category, e.g. "Uncategorized".
  const buildCategoryRows = (): ExpenseCategoryTotal[] => {
    const breakdown = summary?.categoryBreakdown ?? [];
    const matched = new Set<ExpenseCategoryTotal>();
    const rows: ExpenseCategoryTotal[] = categories.map((category) => {
      const entry = breakdown.find((item) =>
        item.categoryId !== undefined ? item.categoryId === category.id : item.category === category.name
      );
      if (entry) matched.add(entry);
      return {
        categoryId: category.id,
        category: category.name,
        amount: entry?.amount ?? 0,
        count: entry?.count ?? 0
      };
    });
    breakdown
      .filter((item) => !matched.has(item))
      .forEach((item) => rows.push({ ...item, categoryId: null }));
    return rows;
  };

  const renderExpenseTable = () => (
    <>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Category</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : expenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography color="text.secondary">No expenses in this period</Typography>
                </TableCell>
              </TableRow>
            ) : (
              expenses.map((expense) => (
                <TableRow key={expense.id} hover>
                  <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                  <TableCell>{expense.description || '-'}</TableCell>
                  <TableCell>{expense.expenseCategory?.name || 'Uncategorized'}</TableCell>
                  <TableCell align="right">{formatCurrency(Number(expense.amount))}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title="Edit">
                      <IconButton size="small" aria-label="Edit expense" onClick={() => handleOpenExpenseDialog(expense)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" aria-label="Delete expense" onClick={() => handleDeleteExpense(expense.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 25, 50]}
        component="div"
        count={totalCount}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
      />
    </>
  );

  const renderCategoryTable = () => (
    <ExpenseCategoryTotals
      rows={buildCategoryRows()}
      total={summary?.totalExpenses ?? 0}
      formatCurrency={formatCurrency}
      emptyMessage="No categories yet"
      onEdit={(categoryId) => {
        const category = categories.find((c) => c.id === categoryId);
        if (category) handleOpenCategoryDialog(category);
      }}
      onDelete={handleDeleteCategory}
    />
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Title and the primary action for the active tab */}
      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={2}>
        <Typography variant="h5">Expenses</Typography>
        {activeTab === 0 ? (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenExpenseDialog()}>
            Add Expense
          </Button>
        ) : (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenCategoryDialog()}>
            Add Category
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Period filter and the total for that period; both tabs follow it */}
      <Box display="flex" alignItems="center" flexWrap="wrap" gap={2} mb={2}>
        <TextField
          label="From"
          type="date"
          size="small"
          value={dateFilter.start}
          onChange={(e) => handleDateFilterChange('start', e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="To"
          type="date"
          size="small"
          value={dateFilter.end}
          onChange={(e) => handleDateFilterChange('end', e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <Typography sx={{ ml: { sm: 'auto' } }}>
          Total: <strong>{formatCurrency(summary?.totalExpenses ?? 0)}</strong>
        </Typography>
      </Box>

      <Paper>
        <Tabs value={activeTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Expenses" />
          <Tab label="Categories" />
        </Tabs>
        {activeTab === 0 ? renderExpenseTable() : renderCategoryTable()}
      </Paper>

      {/* Expense Dialog */}
      <Dialog open={openExpenseDialog} onClose={handleCloseExpenseDialog} maxWidth="xs" fullWidth>
        <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
        <form onSubmit={handleExpenseSubmit(onSubmitExpense)} noValidate>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="date"
                  control={expenseControl}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Date"
                      type="date"
                      required
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      error={!!expenseErrors.date}
                      helperText={expenseErrors.date?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="amount"
                  control={expenseControl}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      value={field.value ?? ''}
                      label="Amount"
                      type="number"
                      required
                      fullWidth
                      inputProps={{ min: 0, step: '0.01', inputMode: 'decimal' }}
                      error={!!expenseErrors.amount}
                      helperText={expenseErrors.amount?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="expenseCategoryId"
                  control={expenseControl}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel id="expense-category-label">Category</InputLabel>
                      <Select {...field} value={field.value ?? ''} labelId="expense-category-label" label="Category">
                        <MenuItem value="">Uncategorized</MenuItem>
                        {categories.map((category) => (
                          <MenuItem key={category.id} value={category.id}>
                            {category.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="description"
                  control={expenseControl}
                  render={({ field }) => <TextField {...field} label="Description" fullWidth />}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="reference"
                  control={expenseControl}
                  render={({ field }) => <TextField {...field} label="Reference (optional)" fullWidth />}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseExpenseDialog}>Cancel</Button>
            <Button type="submit" variant="contained">
              Save
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={openCategoryDialog} onClose={handleCloseCategoryDialog} maxWidth="xs" fullWidth>
        <DialogTitle>{editingCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
        <form onSubmit={handleCategorySubmit(onSubmitCategory)} noValidate>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Controller
                  name="name"
                  control={categoryControl}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Name"
                      required
                      fullWidth
                      error={!!categoryErrors.name}
                      helperText={categoryErrors.name?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="description"
                  control={categoryControl}
                  render={({ field }) => (
                    <TextField {...field} label="Description (optional)" fullWidth multiline rows={2} />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseCategoryDialog}>Cancel</Button>
            <Button type="submit" variant="contained">
              Save
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default ExpensePage;
