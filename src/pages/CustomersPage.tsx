import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  InputAdornment,
  Avatar,
  Tooltip,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Search,
  Email,
  Phone,
  LocationOn,
  ShoppingCart,
  Star,
  AccountBalance
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Helmet } from 'react-helmet-async';
import { apiService } from '@/services/api';

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  address?: string;
  loyaltyPoints: number;
  totalOrders: number;
  totalSpent: number;
  createdAt: string;
  updatedAt: string;
}

const customerSchema = yup.object({
  firstName: yup.string().required('First name is required'),
  lastName: yup.string().required('Last name is required'),
  email: yup.string().optional().test('email', 'Please provide a valid email', (value) => {
    if (!value || value.trim() === '') return true; // Allow empty values
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); // Validate email format if provided
  }),
  phone: yup.string().required('Phone number is required'),
  address: yup.string()
});

const openingBalanceSchema = yup.object({
  amount: yup.number().required('Amount is required').positive('Amount must be positive'),
  direction: yup.string().oneOf(['CUSTOMER_OWES_STORE', 'STORE_OWES_CUSTOMER']).required('Balance type is required'),
  date: yup.string().required('Date is required'),
  notes: yup.string()
});

const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [openingBalanceDialogOpen, setOpeningBalanceDialogOpen] = useState(false);
  const [selectedCustomerForBalance, setSelectedCustomerForBalance] = useState<Customer | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({
    resolver: yupResolver(customerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: ''
    }
  });

  const {
    control: balanceControl,
    handleSubmit: handleBalanceSubmit,
    reset: resetBalance,
    formState: { errors: balanceErrors }
  } = useForm({
    resolver: yupResolver(openingBalanceSchema),
    defaultValues: {
      amount: 0,
      direction: 'CUSTOMER_OWES_STORE',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    }
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/customers');
      if (response.success && Array.isArray(response.data)) {
        setCustomers(response.data);
      } else if (Array.isArray(response)) {
        setCustomers(response);
      } else {
        setCustomers([]);
      }
    } catch (err) {
      setError('Failed to load customers');
      console.error('Customers fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      reset({
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email ?? '',
        phone: customer.phone ?? '',
        address: customer.address || ''
      });
    } else {
      setEditingCustomer(null);
      reset({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingCustomer(null);
    reset();
  };

  const handleDeleteClick = (customer: Customer) => {
    setCustomerToDelete(customer);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!customerToDelete) return;

    try {
      await apiService.delete(`/customers/${customerToDelete.id}`);
      fetchCustomers();
      setDeleteDialogOpen(false);
      setCustomerToDelete(null);
    } catch (err) {
      setError('Failed to delete customer');
      console.error('Delete customer error:', err);
    }
  };

  const onSubmit = async (data: any) => {
    try {
      // Helper function to convert empty strings to null for optional fields
      const toNullIfEmpty = (value: any): any => {
        if (typeof value === 'string' && value.trim() === '') {
          return null;
        }
        return value;
      };

      // Prepare submit data - convert empty email to null
      const submitData = {
        firstName: data.firstName?.trim() || '',
        lastName: data.lastName?.trim() || '',
        email: toNullIfEmpty(data.email),
        phone: data.phone?.trim() || '',
        address: data.address?.trim() || null
      };

      if (editingCustomer) {
        await apiService.put(`/customers/${editingCustomer.id}`, submitData);
      } else {
        await apiService.post('/customers', submitData);
      }
      fetchCustomers();
      handleCloseDialog();
    } catch (err) {
      setError(editingCustomer ? 'Failed to update customer' : 'Failed to create customer');
      console.error('Customer save error:', err);
    }
  };

  const getLoyaltyLevel = (points: number) => {
    if (points >= 1000) return { level: 'Gold', color: 'warning' as const };
    if (points >= 500) return { level: 'Silver', color: 'default' as const };
    return { level: 'Bronze', color: 'primary' as const };
  };

  const handleOpenBalanceDialog = (customer: Customer) => {
    setSelectedCustomerForBalance(customer);
    resetBalance({
      amount: 0,
      direction: 'CUSTOMER_OWES_STORE',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setOpeningBalanceDialogOpen(true);
  };

  const handleCloseBalanceDialog = () => {
    setOpeningBalanceDialogOpen(false);
    setSelectedCustomerForBalance(null);
    resetBalance();
  };

  const onSubmitOpeningBalance = async (data: any) => {
    if (!selectedCustomerForBalance) return;

    try {
      const direction = data.direction as 'CUSTOMER_OWES_STORE' | 'STORE_OWES_CUSTOMER';
      // Customer ledger semantics:
      // - Customer owes store => DEBIT (increases receivable)
      // - Store owes customer / customer credit => CREDIT (reduces receivable; can go negative)
      const type = direction === 'CUSTOMER_OWES_STORE' ? 'DEBIT' : 'CREDIT';
      const description =
        direction === 'CUSTOMER_OWES_STORE'
          ? 'Opening Balance - Customer owes store'
          : 'Opening Balance - Store owes customer';

      await apiService.post('/accounting/customers/transactions', {
        customerId: selectedCustomerForBalance.id,
        type,
        amount: data.amount,
        description,
        reference: 'OPENING_BALANCE',
        referenceType: 'ADJUSTMENT',
        date: data.date,
        notes: data.notes || undefined
      });

      showSnackbar('Opening balance added successfully', 'success');
      handleCloseBalanceDialog();
      fetchCustomers();
    } catch (err: any) {
      const errorMessage = err?.response?.data?.error || 'Failed to add opening balance';
      showSnackbar(errorMessage, 'error');
      console.error('Opening balance error:', err);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const q = searchTerm.trim().toLowerCase();
  const filteredCustomers = customers.filter((customer) => {
    if (!q) return true;
    const email = customer.email ?? '';
    const phone = customer.phone ?? '';
    return (
      customer.firstName.toLowerCase().includes(q) ||
      customer.lastName.toLowerCase().includes(q) ||
      email.toLowerCase().includes(q) ||
      phone.includes(searchTerm.trim())
    );
  });

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Helmet>
        <title>Customers - PrintShop Management</title>
      </Helmet>
      <Box p={3}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">Customers</Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Add Customer
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Search */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <TextField
              fullWidth
              placeholder="Search customers by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </CardContent>
        </Card>

        {/* Customers Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Customer</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Loyalty</TableCell>
                <TableCell>Orders</TableCell>
                <TableCell>Total Spent</TableCell>
                <TableCell>Joined</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCustomers.map((customer) => {
                const loyaltyLevel = getLoyaltyLevel(customer.loyaltyPoints);
                return (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                          {customer.firstName.charAt(0)}{customer.lastName.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2">
                            {customer.firstName} {customer.lastName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            ID: {customer.id.slice(0, 8)}...
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Box display="flex" alignItems="center" mb={0.5}>
                          <Email sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2">{customer.email ?? '—'}</Typography>
                        </Box>
                        <Box display="flex" alignItems="center">
                          <Phone sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2">{customer.phone ?? '—'}</Typography>
                        </Box>
                        {customer.address && (
                          <Box display="flex" alignItems="center" mt={0.5}>
                            <LocationOn sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                              {customer.address}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Chip
                          label={loyaltyLevel.level}
                          color={loyaltyLevel.color}
                          size="small"
                          icon={<Star />}
                        />
                        <Typography variant="body2" color="text.secondary" mt={0.5}>
                          {customer.loyaltyPoints} points
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <ShoppingCart sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography variant="body2">
                          {customer.totalOrders || 0} orders
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        ${(customer.totalSpent || 0).toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(customer.createdAt).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Add Opening Balance">
                        <IconButton 
                          size="small" 
                          onClick={() => handleOpenBalanceDialog(customer)}
                          color="primary"
                        >
                          <AccountBalance />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Customer">
                        <IconButton size="small" onClick={() => handleOpenDialog(customer)}>
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Customer">
                        <IconButton 
                          size="small" 
                          onClick={() => handleDeleteClick(customer)}
                          color="error"
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Create/Edit Customer Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
          </DialogTitle>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="firstName"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="First Name"
                        error={!!errors.firstName}
                        helperText={errors.firstName?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="lastName"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Last Name"
                        error={!!errors.lastName}
                        helperText={errors.lastName?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="email"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Email (Optional)"
                        type="email"
                        error={!!errors.email}
                        helperText={errors.email?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="phone"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Phone Number"
                        error={!!errors.phone}
                        helperText={errors.phone?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="address"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Address"
                        multiline
                        rows={2}
                        error={!!errors.address}
                        helperText={errors.address?.message}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>Cancel</Button>
              <Button type="submit" variant="contained">
                {editingCustomer ? 'Update' : 'Create'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Delete Customer</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete{' '}
              <strong>
                {customerToDelete?.firstName} {customerToDelete?.lastName}
              </strong>
              ? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDeleteConfirm} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Opening Balance Dialog */}
        <Dialog open={openingBalanceDialogOpen} onClose={handleCloseBalanceDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            Add Opening Balance - {selectedCustomerForBalance?.firstName} {selectedCustomerForBalance?.lastName}
          </DialogTitle>
          <form onSubmit={handleBalanceSubmit(onSubmitOpeningBalance)}>
            <DialogContent>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Opening Balance:</strong> Choose whether the customer owes the store (Receivable) or the store owes the customer (Customer credit).
                </Typography>
              </Alert>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Controller
                    name="direction"
                    control={balanceControl}
                    render={({ field }) => (
                      <FormControl fullWidth error={!!balanceErrors.direction}>
                        <InputLabel>Balance Type *</InputLabel>
                        <Select {...field} label="Balance Type *">
                          <MenuItem value="CUSTOMER_OWES_STORE">Customer owes store (Receivable)</MenuItem>
                          <MenuItem value="STORE_OWES_CUSTOMER">Store owes customer (Customer credit)</MenuItem>
                        </Select>
                        {balanceErrors.direction?.message ? (
                          <FormHelperText>{String(balanceErrors.direction?.message)}</FormHelperText>
                        ) : null}
                      </FormControl>
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="amount"
                    control={balanceControl}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Amount *"
                        type="number"
                        inputProps={{ step: '0.01', min: '0' }}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">$</InputAdornment>
                        }}
                        error={!!balanceErrors.amount}
                        helperText={balanceErrors.amount?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="date"
                    control={balanceControl}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Date *"
                        type="date"
                        InputLabelProps={{ shrink: true }}
                        error={!!balanceErrors.date}
                        helperText={balanceErrors.date?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="notes"
                    control={balanceControl}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Notes"
                        multiline
                        rows={3}
                        error={!!balanceErrors.notes}
                        helperText={balanceErrors.notes?.message}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseBalanceDialog}>Cancel</Button>
              <Button type="submit" variant="contained">
                Add Opening Balance
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </>
  );
};

export default CustomersPage; 