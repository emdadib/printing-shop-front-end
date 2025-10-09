import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  TablePagination,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  // TrendingUp as TrendingUpIcon, // Unused import
  TrendingDown as TrendingDownIcon,
  Category as CategoryIcon,
  Receipt as ReceiptIcon,
  AttachMoney as MoneyIcon,
  DateRange as DateRangeIcon
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { apiService } from '../services/api';
import { useSettings } from '../hooks/useSettings';

// Types
interface Expense {
  id: string;
  accountType: string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  description: string;
  reference?: string;
  expenseCategoryId?: string;
  expenseCategory?: {
    id: string;
    name: string;
    description?: string;
  };
  date: string;
  createdAt: string;
}

interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

interface ExpenseSummary {
  totalExpenses: number;
  monthlyExpenses: number;
  categoryBreakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    amount: number;
  }>;
  topExpenses: Array<{
    description: string;
    amount: number;
    category: string;
    date: string;
  }>;
}

// Validation schemas
const expenseSchema = yup.object({
  accountType: yup.string().required('Account type is required'),
  type: yup.string().required('Transaction type is required'),
  amount: yup.number().positive('Amount must be positive').required('Amount is required'),
  description: yup.string().required('Description is required'),
  reference: yup.string().optional(),
  expenseCategoryId: yup.string().optional(),
  date: yup.string().required('Date is required')
});

const categorySchema = yup.object({
  name: yup.string().required('Category name is required'),
  description: yup.string().optional()
});

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
  const [dateFilter, setDateFilter] = useState<{ start: string; end: string }>({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const {
    control: expenseControl,
    handleSubmit: handleExpenseSubmit,
    reset: resetExpense,
    formState: { errors: expenseErrors }
  } = useForm({
    resolver: yupResolver(expenseSchema),
    defaultValues: {
      accountType: 'EXPENSES',
      type: 'DEBIT',
      amount: 0,
      description: '',
      reference: '',
      expenseCategoryId: '',
      date: new Date().toISOString().split('T')[0]
    }
  });

  const {
    control: categoryControl,
    handleSubmit: handleCategorySubmit,
    reset: resetCategory,
    formState: { errors: categoryErrors }
  } = useForm({
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
      const response = await apiService.get(`/accounting/expenses?startDate=${dateFilter.start}&endDate=${dateFilter.end}&page=${page + 1}&limit=${rowsPerPage}`);
      if (response.success && response.data) {
        setExpenses(response.data.transactions || []);
      } else if (response.transactions) {
        setExpenses(response.transactions || []);
      } else if (Array.isArray(response)) {
        setExpenses(response);
      } else {
        setExpenses([]);
      }
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
      const response = await apiService.get(`/accounting/expense-summary?startDate=${dateFilter.start}&endDate=${dateFilter.end}`);
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
    setPage(0);
  };

  const handleOpenExpenseDialog = (expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense);
      resetExpense({
        accountType: expense.accountType,
        type: expense.type,
        amount: expense.amount,
        description: expense.description,
        reference: expense.reference || '',
        expenseCategoryId: expense.expenseCategoryId || '',
        date: expense.date.split('T')[0]
      });
    } else {
      setEditingExpense(null);
      resetExpense();
    }
    setOpenExpenseDialog(true);
  };

  const handleCloseExpenseDialog = () => {
    setOpenExpenseDialog(false);
    setEditingExpense(null);
    resetExpense();
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
      resetCategory();
    }
    setOpenCategoryDialog(true);
  };

  const handleCloseCategoryDialog = () => {
    setOpenCategoryDialog(false);
    setEditingCategory(null);
    resetCategory();
  };

  const onSubmitExpense = async (data: any) => {
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

  const onSubmitCategory = async (data: any) => {
    try {
      if (editingCategory) {
        await apiService.put(`/accounting/expense-categories/${editingCategory.id}`, data);
      } else {
        await apiService.post('/accounting/expense-categories', data);
      }
      handleCloseCategoryDialog();
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      setError('Failed to save category');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
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
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await apiService.delete(`/accounting/expense-categories/${id}`);
        fetchCategories();
      } catch (error) {
        console.error('Error deleting category:', error);
        setError('Failed to delete category');
      }
    }
  };

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return 'Uncategorized';
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Unknown';
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  const renderExpenseSummary = () => (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="text.secondary" gutterBottom>
                  Total Expenses
                </Typography>
                <Typography variant="h4" color="error.main">
                  {formatCurrency(summary?.totalExpenses || 0)}
                </Typography>
              </Box>
              <TrendingDownIcon color="error" sx={{ fontSize: 40 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="text.secondary" gutterBottom>
                  This Month
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {formatCurrency(summary?.monthlyExpenses || 0)}
                </Typography>
              </Box>
              <DateRangeIcon color="warning" sx={{ fontSize: 40 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="text.secondary" gutterBottom>
                  Categories
                </Typography>
                <Typography variant="h4" color="primary.main">
                  {categories.length}
                </Typography>
              </Box>
              <CategoryIcon color="primary" sx={{ fontSize: 40 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="text.secondary" gutterBottom>
                  Avg. Daily
                </Typography>
                <Typography variant="h4" color="info.main">
                  {formatCurrency((summary?.totalExpenses || 0) / 30)}
                </Typography>
              </Box>
              <MoneyIcon color="info" sx={{ fontSize: 40 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderExpenseCharts = () => (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Expense Categories
            </Typography>
            {summary?.categoryBreakdown && summary.categoryBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={summary.categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name} ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {summary.categoryBreakdown.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value) => [formatCurrency(Number(value)), 'Amount']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                <Typography color="text.secondary">No expense data available</Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Monthly Trend
            </Typography>
            {summary?.monthlyTrend && summary.monthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={summary.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <RechartsTooltip formatter={(value) => [formatCurrency(Number(value)), 'Expenses']} />
                  <Line type="monotone" dataKey="amount" stroke="#ff6b6b" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                <Typography color="text.secondary">No trend data available</Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderExpenseList = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Expense Transactions</Typography>
        <Box display="flex" gap={2}>
          <TextField
            label="Start Date"
            type="date"
            value={dateFilter.start}
            onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
          <TextField
            label="End Date"
            type="date"
            value={dateFilter.end}
            onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenExpenseDialog()}
          >
            Add Expense
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Reference</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : expenses.length > 0 ? (
              expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                  <TableCell>{expense.description}</TableCell>
                  <TableCell>
                    <Chip
                      label={getCategoryName(expense.expenseCategoryId)}
                      size="small"
                      color="secondary"
                    />
                  </TableCell>
                  <TableCell>{expense.reference || '-'}</TableCell>
                  <TableCell align="right">
                    <Typography color="error.main" fontWeight="bold">
                      {formatCurrency(expense.amount)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenExpenseDialog(expense)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteExpense(expense.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary">No expenses found</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50]}
          component="div"
          count={expenses.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </TableContainer>
    </Box>
  );

  const renderCategoryManagement = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Expense Categories</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenCategoryDialog()}
        >
          Add Category
        </Button>
      </Box>

      <Grid container spacing={2}>
        {categories.map((category) => (
          <Grid item xs={12} sm={6} md={4} key={category.id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      {category.name}
                    </Typography>
                    <Typography color="text.secondary" variant="body2">
                      {category.description || 'No description'}
                    </Typography>
                  </Box>
                  <Box>
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenCategoryDialog(category)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteCategory(category.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Expense Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      {renderExpenseSummary()}

      {/* Charts */}
      {renderExpenseCharts()}

      {/* Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab icon={<ReceiptIcon />} label="Expenses" />
          <Tab icon={<CategoryIcon />} label="Categories" />
        </Tabs>
      </Paper>

      <Box sx={{ mt: 3 }}>
        {activeTab === 0 && renderExpenseList()}
        {activeTab === 1 && renderCategoryManagement()}
      </Box>

      {/* Expense Dialog */}
      <Dialog open={openExpenseDialog} onClose={handleCloseExpenseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingExpense ? 'Edit Expense' : 'Add New Expense'}
        </DialogTitle>
        <form onSubmit={handleExpenseSubmit(onSubmitExpense)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="type"
                  control={expenseControl}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!expenseErrors.type}>
                      <InputLabel>Transaction Type *</InputLabel>
                      <Select {...field} label="Transaction Type *">
                        <MenuItem value="DEBIT">Expense (Debit)</MenuItem>
                        <MenuItem value="CREDIT">Refund (Credit)</MenuItem>
                      </Select>
                    </FormControl>
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
                      label="Amount *"
                      type="number"
                      fullWidth
                      error={!!expenseErrors.amount}
                      helperText={expenseErrors.amount?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="description"
                  control={expenseControl}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Description *"
                      fullWidth
                      error={!!expenseErrors.description}
                      helperText={expenseErrors.description?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="expenseCategoryId"
                  control={expenseControl}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Category</InputLabel>
                      <Select {...field} label="Category">
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
              <Grid item xs={12} sm={6}>
                <Controller
                  name="reference"
                  control={expenseControl}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Reference"
                      fullWidth
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="date"
                  control={expenseControl}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Date *"
                      type="date"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      error={!!expenseErrors.date}
                      helperText={expenseErrors.date?.message}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseExpenseDialog}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingExpense ? 'Update' : 'Add'} Expense
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={openCategoryDialog} onClose={handleCloseCategoryDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingCategory ? 'Edit Category' : 'Add New Category'}
        </DialogTitle>
        <form onSubmit={handleCategorySubmit(onSubmitCategory)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Controller
                  name="name"
                  control={categoryControl}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Category Name *"
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
                    <TextField
                      {...field}
                      label="Description"
                      fullWidth
                      multiline
                      rows={3}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseCategoryDialog}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingCategory ? 'Update' : 'Add'} Category
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default ExpensePage;
