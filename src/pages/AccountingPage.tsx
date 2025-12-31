import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
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
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  AccountBalance as AccountIcon,
  People as PeopleIcon,
  Business as BusinessIcon,
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { apiService } from '../services/api';
import { useSettings } from '../hooks/useSettings';

// Types
interface Transaction {
  id: string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  description: string;
  reference?: string;
  referenceType?: string;
  accountType?: string; // For company transactions
  date: string;
  createdAt: string;
}



interface LedgerData {
  transactions: Transaction[];
  balance: number;
  balancesByAccountType?: Record<string, number>;
  accountType?: string;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface AccountingSummary {
  customerBalances: any[];
  supplierBalances: any[];
  companyBalances: any[];
  totalReceivables: number;
  totalPayables: number;
  netPosition: number;
}

interface ProfitSummary {
  total: {
    deposits: number;
    withdrawals: number;
    netProfit: number;
    operationalProfit?: number;
    operationalLoss?: number;
    netOperationalProfit?: number;
  };
  regular: {
    deposits: number;
    withdrawals: number;
    netProfit: number;
  };
  investor: {
    deposits: number;
    withdrawals: number;
    netProfit: number;
  };
  operational?: {
    profit: number;
    loss: number;
    net: number;
  };
  transactions: Array<{
    id: string;
    type: 'DEBIT' | 'CREDIT';
    amount: number;
    description: string;
    date: string;
    reference?: string;
  }>;
}

// Validation schemas
const transactionSchema = yup.object({
  type: yup.string().required('Transaction type is required'),
  amount: yup.number().positive('Amount must be positive').required('Amount is required'),
  description: yup.string().required('Description is required'),
  reference: yup.string().optional(),
  date: yup.date().required('Date is required')
});

const profitSchema = yup.object({
  amount: yup.number().positive('Amount must be positive').required('Amount is required'),
  accountType: yup.string().oneOf(['CASH', 'BANK'], 'Account type must be CASH or BANK').required('Account type is required'),
  profitType: yup.string().oneOf(['PROFIT', 'INVESTOR_PROFIT'], 'Profit type must be PROFIT or INVESTOR_PROFIT'),
  description: yup.string().optional(),
  reference: yup.string().optional(),
  date: yup.string().required('Date is required')
});

const AccountingPage: React.FC = () => {
  const { formatCurrency } = useSettings();
  const [activeTab, setActiveTab] = useState(0);
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [customerFilter, setCustomerFilter] = useState<'all' | 'walkin' | 'regular'>('all');
  const [customerLedger, setCustomerLedger] = useState<LedgerData | null>(null);
  const [supplierLedger, setSupplierLedger] = useState<LedgerData | null>(null);
  const [companyLedger, setCompanyLedger] = useState<LedgerData | null>(null);
  const [summary, setSummary] = useState<AccountingSummary | null>(null);
  const [, setLoading] = useState(false);
  const [openTransactionDialog, setOpenTransactionDialog] = useState(false);
  const [transactionType, setTransactionType] = useState<'customer' | 'supplier' | 'company'>('customer');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Profit management state
  const [profitSummary, setProfitSummary] = useState<ProfitSummary | null>(null);
  const [openProfitDialog, setOpenProfitDialog] = useState(false);
  const [profitDialogType, setProfitDialogType] = useState<'deposit' | 'withdraw'>('deposit');
  const [openCalculateDialog, setOpenCalculateDialog] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [calculationResult, setCalculationResult] = useState<any>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({
    resolver: yupResolver(transactionSchema),
    defaultValues: {
      type: 'DEBIT',
      amount: 0,
      description: '',
      reference: '',
      date: new Date()
    }
  });

  const {
    control: profitControl,
    handleSubmit: handleProfitSubmit,
    reset: resetProfit,
    formState: { errors: profitErrors }
  } = useForm({
    resolver: yupResolver(profitSchema),
    defaultValues: {
      amount: 0,
      accountType: 'CASH',
      profitType: 'PROFIT',
      description: '',
      reference: '',
      date: new Date().toISOString().split('T')[0]
    }
  });

  // Form for profit calculation
  const calculateProfitSchema = yup.object({
    startDate: yup.string().required('Start date is required'),
    endDate: yup.string().required('End date is required').test(
      'is-after-start',
      'End date must be after start date',
      function(value) {
        const { startDate } = this.parent;
        if (!startDate || !value) return true;
        return new Date(value) >= new Date(startDate);
      }
    ),
    description: yup.string().optional()
  });

  const {
    control: calculateControl,
    handleSubmit: handleCalculateSubmit,
    reset: resetCalculate,
    formState: { errors: calculateErrors }
  } = useForm({
    resolver: yupResolver(calculateProfitSchema),
    defaultValues: {
      startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], // First day of current month
      endDate: new Date().toISOString().split('T')[0], // Today
      description: ''
    }
  });

  // Fetch data
  const fetchCustomers = async () => {
    try {
      const response = await apiService.get('/customers');
      if (response.success && Array.isArray(response.data)) {
        setCustomers(response.data);
      } else if (Array.isArray(response)) {
        setCustomers(response);
      } else {
        setCustomers([]);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await apiService.get('/suppliers');
      if (response.success && Array.isArray(response.data)) {
        setSuppliers(response.data);
      } else if (Array.isArray(response)) {
        setSuppliers(response);
      } else {
        setSuppliers([]);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      setSuppliers([]);
    }
  };

  const fetchCustomerLedger = async (customerId: string) => {
    try {
      setLoading(true);
      const response = await apiService.get(`/accounting/customers/${customerId}/ledger?page=${page + 1}&limit=${rowsPerPage}`);
      if (response.success && response.data) {
        setCustomerLedger(response.data);
      } else {
        setCustomerLedger(response);
      }
    } catch (error) {
      console.error('Error fetching customer ledger:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSupplierLedger = async (supplierId: string) => {
    try {
      setLoading(true);
      const response = await apiService.get(`/accounting/suppliers/${supplierId}/ledger?page=${page + 1}&limit=${rowsPerPage}`);
      if (response.success && response.data) {
        setSupplierLedger(response.data);
      } else {
        setSupplierLedger(response);
      }
    } catch (error) {
      console.error('Error fetching supplier ledger:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyLedger = async () => {
    try {
      setLoading(true);
      const response = await apiService.get(`/accounting/company/ledger?page=${page + 1}&limit=${rowsPerPage}`);
      if (response.success && response.data) {
        setCompanyLedger(response.data);
      } else {
        setCompanyLedger(response);
      }
    } catch (error) {
      console.error('Error fetching company ledger:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await apiService.get('/accounting/summary');
      if (response.success && response.data) {
        setSummary(response.data);
      } else {
        setSummary(response);
      }
    } catch (error) {
      console.error('Error fetching accounting summary:', error);
    }
  };

  const fetchProfitSummary = async () => {
    try {
      const response = await apiService.get('/accounting/profit/summary');
      if (response.success && response.data) {
        setProfitSummary(response.data);
      } else {
        setProfitSummary(response);
      }
    } catch (error) {
      console.error('Error fetching profit summary:', error);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchSuppliers();
    fetchSummary();
    fetchProfitSummary();
  }, []);

  useEffect(() => {
    if (activeTab === 3) {
      fetchProfitSummary();
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedCustomer) {
      fetchCustomerLedger(selectedCustomer);
    }
  }, [selectedCustomer, page, rowsPerPage]);

  useEffect(() => {
    if (selectedSupplier) {
      fetchSupplierLedger(selectedSupplier);
    }
  }, [selectedSupplier, page, rowsPerPage]);

  useEffect(() => {
    if (activeTab === 2) {
      fetchCompanyLedger();
    }
  }, [activeTab, page, rowsPerPage]);

  // Handlers
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    setPage(0);
  };

  const handleOpenTransactionDialog = (type: 'customer' | 'supplier' | 'company') => {
    setTransactionType(type);
    setOpenTransactionDialog(true);
    reset();
  };

  const handleCloseTransactionDialog = () => {
    setOpenTransactionDialog(false);
    reset();
  };

  const handleSubmitTransaction = async (data: any) => {
    try {
      const endpoint = transactionType === 'customer' 
        ? '/accounting/customers/transactions'
        : transactionType === 'supplier'
        ? '/accounting/suppliers/transactions'
        : '/accounting/company/transactions';

      const transactionData = {
        ...data,
        customerId: transactionType === 'customer' ? selectedCustomer : undefined,
        supplierId: transactionType === 'supplier' ? selectedSupplier : undefined,
        accountType: transactionType === 'company' ? 'CASH' : undefined
      };

      await apiService.post(endpoint, transactionData);
      handleCloseTransactionDialog();
      
      // Refresh data
      if (transactionType === 'customer' && selectedCustomer) {
        fetchCustomerLedger(selectedCustomer);
      } else if (transactionType === 'supplier' && selectedSupplier) {
        fetchSupplierLedger(selectedSupplier);
      } else if (transactionType === 'company') {
        fetchCompanyLedger();
      }
      fetchSummary();
    } catch (error) {
      console.error('Error adding transaction:', error);
    }
  };

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return 'success';
    if (balance < 0) return 'error';
    return 'default';
  };

  const handleOpenProfitDialog = (type: 'deposit' | 'withdraw') => {
    try {
      // Set dialog type first
      setProfitDialogType(type);
      // Reset form with default values
      resetProfit({
        amount: 0,
        accountType: 'CASH',
        profitType: 'PROFIT',
        description: '',
        reference: '',
        date: new Date().toISOString().split('T')[0]
      });
      // Then open dialog
      setOpenProfitDialog(true);
    } catch (error) {
      console.error('Error opening profit dialog:', error);
      alert('Failed to open profit dialog. Please try again.');
    }
  };

  const handleCloseProfitDialog = () => {
    setOpenProfitDialog(false);
    resetProfit();
  };

  const handleOpenCalculateDialog = () => {
    setOpenCalculateDialog(true);
    setCalculationResult(null);
    resetCalculate({
      startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      description: ''
    });
  };

  const handleCloseCalculateDialog = () => {
    setOpenCalculateDialog(false);
    setCalculationResult(null);
    resetCalculate();
  };

  const handleCalculateProfit = async (data: any) => {
    try {
      setCalculating(true);
      setCalculationResult(null);

      const response = await apiService.post('/accounting/profit/calculate', {
        startDate: data.startDate,
        endDate: data.endDate,
        description: data.description || undefined
      });

      if (response && typeof response === 'object') {
        if ('success' in response && response.success === false) {
          const errorMsg = (response as any).error || (response as any).message || 'Failed to calculate profit';
          alert(errorMsg);
          setCalculating(false);
          return;
        }

        setCalculationResult(response.data || response);
        
        // Refresh profit summary and company ledger after calculation
        if ((response as any).data?.recorded) {
          setTimeout(() => {
            fetchProfitSummary();
            fetchCompanyLedger();
            fetchSummary();
          }, 500);
        }
      }
    } catch (error: any) {
      console.error('Error calculating profit:', error);
      const errorMsg = error?.response?.data?.error || 
                      error?.response?.data?.message || 
                      error?.message || 
                      'Failed to calculate profit';
      alert(errorMsg);
    } finally {
      setCalculating(false);
    }
  };

  const handleSubmitProfit = async (data: any) => {
    try {
      // For withdrawals, validate against available equity balance
      if (profitDialogType === 'withdraw') {
        const withdrawalAmount = parseFloat(data.amount) || 0;
        const availableBalance = profitSummary?.total?.netProfit || 0;
        
        if (withdrawalAmount > availableBalance) {
          alert(`Insufficient equity balance. Available: ${formatCurrency(availableBalance)}, Requested: ${formatCurrency(withdrawalAmount)}`);
          return;
        }
      }

      const endpoint = profitDialogType === 'deposit' 
        ? '/accounting/profit/deposit'
        : '/accounting/profit/withdraw';

      // Ensure amount is a number
      const submitData = {
        ...data,
        amount: parseFloat(data.amount) || 0
      };

      // Convert date string to proper format if needed
      if (submitData.date && typeof submitData.date === 'string') {
        submitData.date = new Date(submitData.date).toISOString();
      }

      const response = await apiService.post(endpoint, submitData);
      
      // Check if response has success flag
      if (response && typeof response === 'object' && 'success' in response && (response as any).success === false) {
        const errorMsg = (response as any).error || (response as any).message || 'Failed to process profit transaction';
        alert(errorMsg);
        return;
      }

      handleCloseProfitDialog();
      fetchProfitSummary();
      fetchCompanyLedger();
      fetchSummary();
    } catch (error: any) {
      console.error('Error processing profit:', error);
      const errorMsg = error?.response?.data?.error || 
                      error?.response?.data?.message || 
                      error?.message || 
                      'Failed to process profit transaction';
      alert(errorMsg);
    }
  };

  const getFilteredCustomers = () => {
    if (customerFilter === 'all') {
      return customers;
    } else if (customerFilter === 'walkin') {
      return customers.filter(customer => customer.isWalkIn === true);
    } else if (customerFilter === 'regular') {
      return customers.filter(customer => customer.isWalkIn === false);
    }
    return customers;
  };

  const renderCustomerLedger = () => (
    <Box>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth>
            <InputLabel>Filter Customers</InputLabel>
            <Select
              value={customerFilter}
              onChange={(e) => {
                setCustomerFilter(e.target.value as 'all' | 'walkin' | 'regular');
                setSelectedCustomer(''); // Reset selection when filter changes
              }}
              label="Filter Customers"
            >
              <MenuItem value="all">All Customers</MenuItem>
              <MenuItem value="walkin">Walk-in Customers Only</MenuItem>
              <MenuItem value="regular">Regular Customers Only</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth>
            <InputLabel>Select Customer</InputLabel>
            <Select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              label="Select Customer"
              disabled={getFilteredCustomers().length === 0}
            >
              {getFilteredCustomers().map((customer) => (
                <MenuItem key={customer.id} value={customer.id}>
                  {customer.firstName} {customer.lastName}
                  {customer.isWalkIn && (
                    <Chip 
                      label="Walk-in" 
                      size="small" 
                      color="secondary" 
                      sx={{ ml: 1 }}
                    />
                  )}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenTransactionDialog('customer')}
            disabled={!selectedCustomer}
            fullWidth
          >
            Add Transaction
          </Button>
        </Grid>
      </Grid>

      {selectedCustomer && customerLedger && (
        <Box>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Customer Balance
              </Typography>
              <Chip
                label={formatCurrency(typeof customerLedger.balance === 'number' ? customerLedger.balance : parseFloat(customerLedger.balance) || 0)}
                color={getBalanceColor(customerLedger.balance) as any}
                size="medium"
              />
            </CardContent>
          </Card>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Reference</TableCell>
                  <TableCell align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customerLedger.transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Chip
                        label={transaction.type}
                        color={transaction.type === 'DEBIT' ? 'error' : 'success'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{transaction.description}</TableCell>
                    <TableCell>{transaction.reference || '-'}</TableCell>
                    <TableCell align="right">{formatCurrency(typeof transaction.amount === 'number' ? transaction.amount : parseFloat(transaction.amount) || 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[10, 25, 50]}
              component="div"
              count={customerLedger.pagination.total}
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
      )}
    </Box>
  );

  const renderSupplierLedger = () => (
    <Box>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Select Supplier</InputLabel>
            <Select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              label="Select Supplier"
            >
              {(suppliers || []).map((supplier) => (
                <MenuItem key={supplier.id} value={supplier.id}>
                  {supplier.name} - {supplier.company}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenTransactionDialog('supplier')}
            disabled={!selectedSupplier}
          >
            Add Transaction
          </Button>
        </Grid>
      </Grid>

      {selectedSupplier && supplierLedger && (
        <Box>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Supplier Balance
              </Typography>
              <Chip
                label={formatCurrency(typeof supplierLedger.balance === 'number' ? supplierLedger.balance : parseFloat(supplierLedger.balance) || 0)}
                color={getBalanceColor(supplierLedger.balance) as any}
                size="medium"
              />
            </CardContent>
          </Card>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Reference</TableCell>
                  <TableCell align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {supplierLedger.transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Chip
                        label={transaction.type}
                        color={transaction.type === 'DEBIT' ? 'error' : 'success'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{transaction.description}</TableCell>
                    <TableCell>{transaction.reference || '-'}</TableCell>
                    <TableCell align="right">{formatCurrency(typeof transaction.amount === 'number' ? transaction.amount : parseFloat(transaction.amount) || 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[10, 25, 50]}
              component="div"
              count={supplierLedger.pagination.total}
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
      )}
    </Box>
  );

  const renderProfitManagement = () => (
    <Box>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <Typography variant="h6">Profit Management</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<MoneyIcon />}
              onClick={handleOpenCalculateDialog}
            >
              Calculate Profit
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={<TrendingUpIcon />}
              onClick={() => handleOpenProfitDialog('deposit')}
            >
              Deposit Cash
            </Button>
            <Button
              variant="contained"
              color="warning"
              startIcon={<TrendingDownIcon />}
              onClick={() => handleOpenProfitDialog('withdraw')}
            >
              Withdraw Profit
            </Button>
          </Box>
        </Grid>
      </Grid>

      {profitSummary && profitSummary.total && profitSummary.regular && profitSummary.investor && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Net Profit
                </Typography>
                <Typography variant="h4" color={(profitSummary.total?.netProfit || 0) >= 0 ? 'success.main' : 'error.main'}>
                  {formatCurrency(profitSummary.total?.netProfit || 0)}
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  Operational: {formatCurrency(profitSummary.operational?.net || profitSummary.total?.netOperationalProfit || 0)}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Manual Deposits: {formatCurrency(profitSummary.total?.deposits || 0)}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Manual Withdrawals: {formatCurrency(profitSummary.total?.withdrawals || 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Regular Profit
                </Typography>
                <Typography variant="h4" color={(profitSummary.regular?.netProfit || 0) >= 0 ? 'success.main' : 'error.main'}>
                  {formatCurrency(profitSummary.regular?.netProfit || 0)}
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  Deposits: {formatCurrency(profitSummary.regular?.deposits || 0)}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Withdrawals: {formatCurrency(profitSummary.regular?.withdrawals || 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Investor Profit
                </Typography>
                <Typography variant="h4" color={(profitSummary.investor?.netProfit || 0) >= 0 ? 'success.main' : 'error.main'}>
                  {formatCurrency(profitSummary.investor?.netProfit || 0)}
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  Deposits: {formatCurrency(profitSummary.investor?.deposits || 0)}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Withdrawals: {formatCurrency(profitSummary.investor?.withdrawals || 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {profitSummary && profitSummary.transactions && profitSummary.transactions.length > 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Reference</TableCell>
                <TableCell align="right">Amount</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {profitSummary.transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Chip
                      label={transaction.type}
                      color={transaction.type === 'CREDIT' ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell>{transaction.reference || '-'}</TableCell>
                  <TableCell align="right">{formatCurrency(transaction.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {profitSummary && (!profitSummary.transactions || profitSummary.transactions.length === 0) && (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="textSecondary">
            No profit transactions yet. Start by depositing or withdrawing profit.
          </Typography>
        </Paper>
      )}

      {!profitSummary && (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="textSecondary">
            Loading profit summary...
          </Typography>
        </Paper>
      )}
    </Box>
  );

  const renderCompanyLedger = () => (
    <Box>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <Typography variant="h6">Company General Ledger</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenTransactionDialog('company')}
          >
            Add Transaction
          </Button>
        </Grid>
      </Grid>

      {companyLedger && (
        <Box>
          {/* Show balances by account type if available (when no filter is applied) */}
          {companyLedger.balancesByAccountType && !companyLedger.accountType ? (
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Cash Balance
                    </Typography>
                    <Typography variant="h6" color="success.main">
                      {formatCurrency(companyLedger.balancesByAccountType.CASH || 0)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Bank Balance
                    </Typography>
                    <Typography variant="h6" color="success.main">
                      {formatCurrency(companyLedger.balancesByAccountType.BANK || 0)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Total Sales Revenue
                    </Typography>
                    <Typography variant="h6" color="info.main">
                      {formatCurrency(companyLedger.balancesByAccountType.SALES || 0)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Total Expenses
                    </Typography>
                    <Typography variant="h6" color="error.main">
                      {formatCurrency((companyLedger.balancesByAccountType.EXPENSES || 0) + (companyLedger.balancesByAccountType.PURCHASES || 0))}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Owner's Equity
                    </Typography>
                    <Typography variant="h6" color="warning.main">
                      {formatCurrency(companyLedger.balancesByAccountType.EQUITY || 0)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Net Assets (Cash + Bank)
                    </Typography>
                    <Typography variant="h6" color={companyLedger.balance >= 0 ? 'success.main' : 'error.main'}>
                      {formatCurrency(typeof companyLedger.balance === 'number' ? companyLedger.balance : parseFloat(companyLedger.balance) || 0)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          ) : (
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {companyLedger.accountType ? `${companyLedger.accountType} Balance` : 'Company Balance'}
                </Typography>
                <Chip
                  label={formatCurrency(typeof companyLedger.balance === 'number' ? companyLedger.balance : parseFloat(companyLedger.balance) || 0)}
                  color={getBalanceColor(companyLedger.balance) as any}
                  size="medium"
                />
              </CardContent>
            </Card>
          )}

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Account Type</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Reference</TableCell>
                  <TableCell align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {companyLedger.transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                    <TableCell>{transaction.accountType || transaction.referenceType || 'General'}</TableCell>
                    <TableCell>
                      <Chip
                        label={transaction.type}
                        color={transaction.type === 'DEBIT' ? 'error' : 'success'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{transaction.description}</TableCell>
                    <TableCell>{transaction.reference || '-'}</TableCell>
                    <TableCell align="right">{formatCurrency(typeof transaction.amount === 'number' ? transaction.amount : parseFloat(transaction.amount) || 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[10, 25, 50]}
              component="div"
              count={companyLedger.pagination.total}
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
      )}
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Accounting & Finance
      </Typography>

      {/* Summary Cards */}
      {summary && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Receivables
                </Typography>
                <Typography variant="h4" color="success.main">
                  {formatCurrency(typeof summary.totalReceivables === 'number' ? summary.totalReceivables : parseFloat(summary.totalReceivables) || 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Payables
                </Typography>
                <Typography variant="h4" color="error.main">
                  {formatCurrency(typeof summary.totalPayables === 'number' ? summary.totalPayables : parseFloat(summary.totalPayables) || 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Net Position
                </Typography>
                <Typography variant="h4" color={summary.netPosition >= 0 ? 'success.main' : 'error.main'}>
                  {formatCurrency(typeof summary.netPosition === 'number' ? summary.netPosition : parseFloat(summary.netPosition) || 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Active Customers
                </Typography>
                <Typography variant="h4">
                  {summary.customerBalances.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab icon={<PeopleIcon />} label="Customer Ledger" />
          <Tab icon={<BusinessIcon />} label="Supplier Ledger" />
          <Tab icon={<AccountIcon />} label="Company Ledger" />
          <Tab icon={<MoneyIcon />} label="Profit Management" />
        </Tabs>
      </Paper>

      <Box sx={{ mt: 3 }}>
        {activeTab === 0 && renderCustomerLedger()}
        {activeTab === 1 && renderSupplierLedger()}
        {activeTab === 2 && renderCompanyLedger()}
        {activeTab === 3 && renderProfitManagement()}
      </Box>

      {/* Transaction Dialog */}
      <Dialog open={openTransactionDialog} onClose={handleCloseTransactionDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Add {transactionType.charAt(0).toUpperCase() + transactionType.slice(1)} Transaction
        </DialogTitle>
        <form onSubmit={handleSubmit(handleSubmitTransaction)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.type}>
                      <InputLabel>Transaction Type *</InputLabel>
                      <Select {...field} label="Transaction Type *">
                        <MenuItem value="DEBIT">Debit</MenuItem>
                        <MenuItem value="CREDIT">Credit</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="amount"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Amount *"
                      type="number"
                      fullWidth
                      error={!!errors.amount}
                      helperText={errors.amount?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Description *"
                      fullWidth
                      error={!!errors.description}
                      helperText={errors.description?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="reference"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Reference"
                      fullWidth
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="date"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Date *"
                      type="date"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      error={!!errors.date}
                      helperText={errors.date?.message}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseTransactionDialog}>Cancel</Button>
            <Button type="submit" variant="contained">Add Transaction</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Profit Dialog */}
      {openProfitDialog && profitDialogType && (
        <Dialog open={openProfitDialog} onClose={handleCloseProfitDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {profitDialogType === 'deposit' ? 'Deposit Profit' : 'Withdraw Profit'}
          </DialogTitle>
          <form onSubmit={handleProfitSubmit(handleSubmitProfit)}>
          <DialogContent>
            {profitDialogType === 'withdraw' && profitSummary && (
              <Box sx={{ mb: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Available Equity Balance:
                </Typography>
                <Typography variant="h6" color={(profitSummary.total?.netProfit || 0) >= 0 ? 'success.main' : 'error.main'}>
                  {formatCurrency(profitSummary.total?.netProfit || 0)}
                </Typography>
              </Box>
            )}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="amount"
                  control={profitControl}
                  render={({ field }) => {
                    const fieldValue = parseFloat(String(field.value || '')) || 0;
                    const availableBalance = profitSummary?.total?.netProfit || 0;
                    const exceedsBalance = profitDialogType === 'withdraw' && fieldValue > availableBalance;
                    
                    return (
                      <TextField
                        {...field}
                        label="Amount *"
                        type="number"
                        fullWidth
                        error={!!profitErrors.amount || exceedsBalance}
                        helperText={
                          profitErrors.amount?.message || 
                          (exceedsBalance ? `Exceeds available balance of ${formatCurrency(availableBalance)}` : '')
                        }
                        InputProps={{
                          startAdornment: <InputAdornment position="start">$</InputAdornment>
                        }}
                        onChange={(e) => field.onChange(e.target.value)}
                        value={field.value || ''}
                      />
                    );
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="accountType"
                  control={profitControl}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!profitErrors.accountType}>
                      <InputLabel>Account Type *</InputLabel>
                      <Select {...field} label="Account Type *">
                        <MenuItem value="CASH">Cash</MenuItem>
                        <MenuItem value="BANK">Bank</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="profitType"
                  control={profitControl}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Profit Type</InputLabel>
                      <Select {...field} label="Profit Type">
                        <MenuItem value="PROFIT">Regular Profit</MenuItem>
                        <MenuItem value="INVESTOR_PROFIT">Investor Profit</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="date"
                  control={profitControl}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Date *"
                      type="date"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      error={!!profitErrors.date}
                      helperText={profitErrors.date?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="description"
                  control={profitControl}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Description (Optional)"
                      fullWidth
                      multiline
                      rows={2}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="reference"
                  control={profitControl}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Reference (Optional)"
                      fullWidth
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseProfitDialog}>Cancel</Button>
            <Button 
              type="submit" 
              variant="contained"
              color={profitDialogType === 'deposit' ? 'success' : 'warning'}
            >
              {profitDialogType === 'deposit' ? 'Deposit' : 'Withdraw'}
            </Button>
          </DialogActions>
          </form>
        </Dialog>
      )}

      {/* Calculate Profit Dialog */}
      <Dialog open={openCalculateDialog} onClose={handleCloseCalculateDialog} maxWidth="md" fullWidth>
        <DialogTitle>Calculate Profit from Sales</DialogTitle>
        <form onSubmit={handleCalculateSubmit(handleCalculateProfit)}>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  This will automatically calculate profit from your sales revenue minus cost of goods sold and operating expenses, then record it to equity.
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="startDate"
                  control={calculateControl}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Start Date *"
                      type="date"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      error={!!calculateErrors.startDate}
                      helperText={calculateErrors.startDate?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="endDate"
                  control={calculateControl}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="End Date *"
                      type="date"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      error={!!calculateErrors.endDate}
                      helperText={calculateErrors.endDate?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="description"
                  control={calculateControl}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Description (Optional)"
                      fullWidth
                      multiline
                      rows={2}
                      placeholder="e.g., January 2024 Profit Calculation"
                    />
                  )}
                />
              </Grid>

              {/* Calculation Results */}
              {calculationResult && (
                <Grid item xs={12}>
                  <Card sx={{ mt: 2, bgcolor: 'background.paper' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Calculation Results
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" color="textSecondary">
                            Total Revenue
                          </Typography>
                          <Typography variant="h6" color="success.main">
                            {formatCurrency(calculationResult.calculation?.totalRevenue || 0)}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" color="textSecondary">
                            Cost of Goods Sold
                          </Typography>
                          <Typography variant="h6" color="error.main">
                            {formatCurrency(calculationResult.calculation?.totalCOGS || 0)}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" color="textSecondary">
                            Operating Expenses
                          </Typography>
                          <Typography variant="h6" color="error.main">
                            {formatCurrency(calculationResult.calculation?.totalExpenses || 0)}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" color="textSecondary">
                            Net Profit / Loss
                          </Typography>
                          <Typography 
                            variant="h6" 
                            color={(calculationResult.calculation?.netProfit || 0) >= 0 ? 'success.main' : 'error.main'}
                          >
                            {formatCurrency(calculationResult.calculation?.netProfit || 0)}
                          </Typography>
                        </Grid>
                        {calculationResult.recorded && (
                          <Grid item xs={12}>
                            <Chip
                              label="✓ Profit recorded to equity"
                              color="success"
                              size="small"
                              sx={{ mt: 1 }}
                            />
                          </Grid>
                        )}
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseCalculateDialog}>
              {calculationResult ? 'Close' : 'Cancel'}
            </Button>
            {!calculationResult && (
              <Button 
                type="submit" 
                variant="contained"
                color="primary"
                disabled={calculating}
              >
                {calculating ? 'Calculating...' : 'Calculate & Record'}
              </Button>
            )}
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default AccountingPage;
