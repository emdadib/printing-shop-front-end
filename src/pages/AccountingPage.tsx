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
  TablePagination
} from '@mui/material';
import {
  Add as AddIcon,
  AccountBalance as AccountIcon,
  People as PeopleIcon,
  Business as BusinessIcon,
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
  date: string;
  createdAt: string;
}



interface LedgerData {
  transactions: Transaction[];
  balance: number;
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

// Validation schemas
const transactionSchema = yup.object({
  type: yup.string().required('Transaction type is required'),
  amount: yup.number().positive('Amount must be positive').required('Amount is required'),
  description: yup.string().required('Description is required'),
  reference: yup.string().optional(),
  date: yup.date().required('Date is required')
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

  useEffect(() => {
    fetchCustomers();
    fetchSuppliers();
    fetchSummary();
  }, []);

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
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Company Balance
              </Typography>
              <Chip
                label={formatCurrency(typeof companyLedger.balance === 'number' ? companyLedger.balance : parseFloat(companyLedger.balance) || 0)}
                color={getBalanceColor(companyLedger.balance) as any}
                size="medium"
              />
            </CardContent>
          </Card>

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
                    <TableCell>{transaction.referenceType || 'General'}</TableCell>
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
        </Tabs>
      </Paper>

      <Box sx={{ mt: 3 }}>
        {activeTab === 0 && renderCustomerLedger()}
        {activeTab === 1 && renderSupplierLedger()}
        {activeTab === 2 && renderCompanyLedger()}
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
    </Box>
  );
};

export default AccountingPage;
