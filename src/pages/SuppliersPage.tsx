import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Card,
  CardContent,
  Chip,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DeleteForever as DeleteForeverIcon,
  Search as SearchIcon,
  Business as BusinessIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Language as WebsiteIcon,
  AccountBalance as AccountBalanceIcon
} from '@mui/icons-material';
import { Tooltip } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { apiService } from '@/services/api';
import { useNavigate } from 'react-router-dom';

interface Supplier {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  taxId: string;
  contactPerson: string;
  contactPhone: string;
  website: string;
  paymentTerms: string;
  creditLimit: number | null;
  isActive: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
  products: any[];
  purchaseOrders: any[];
}

interface SupplierStats {
  totalSuppliers: number;
  activeSuppliers: number;
  suppliersWithProducts: number;
}

const supplierSchema = yup.object({
  name: yup.string().required('Name is required'),
  company: yup.string().nullable().optional(),
  email: yup.string().email('Invalid email').nullable().optional(),
  phone: yup.string().required('Phone is required'),
  address: yup.string().nullable().optional(),
  city: yup.string().nullable().optional(),
  state: yup.string().nullable().optional(),
  zipCode: yup.string().nullable().optional(),
  country: yup.string().nullable().optional(),
  taxId: yup.string().nullable().optional(),
  contactPerson: yup.string().nullable().optional(),
  contactPhone: yup.string().nullable().optional(),
  website: yup.string().test('is-url', 'Invalid website URL', function(value) {
    if (!value || value === null || value.trim() === '') return true; // Allow empty values and null
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }).nullable().optional(),
  paymentTerms: yup.string().nullable().optional(),
  creditLimit: yup.number().nullable().optional(),
  isActive: yup.boolean().optional(),
  notes: yup.string().nullable().optional()
});

const openingBalanceSchema = yup.object({
  amount: yup.number().required('Amount is required').positive('Amount must be positive'),
  date: yup.date().required('Date is required'),
  notes: yup.string()
});

const defaultValues = {
  name: '',
  company: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  country: '',
  taxId: '',
  contactPerson: '',
  contactPhone: '',
  website: '',
  paymentTerms: '',
  creditLimit: null,
  isActive: true,
  notes: ''
};

const SuppliersPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stats, setStats] = useState<SupplierStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });
  const [permanentDeleteDialog, setPermanentDeleteDialog] = useState<{
    open: boolean;
    supplier: Supplier | null;
  }>({ open: false, supplier: null });
  const [openingBalanceDialogOpen, setOpeningBalanceDialogOpen] = useState(false);
  const [selectedSupplierForBalance, setSelectedSupplierForBalance] = useState<Supplier | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({
    resolver: yupResolver(supplierSchema),
    defaultValues
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
      date: new Date().toISOString().split('T')[0],
      notes: ''
    }
  });

  const navigate = useNavigate();

  const fetchSuppliers = async (includeInactive = false) => {
    try {
      setLoading(true);
      const url = includeInactive ? '/suppliers?includeInactive=true' : '/suppliers';
      const response = await apiService.get(url);
      console.log('Suppliers API response:', response);
      
      // Handle both wrapped and direct response formats
      let suppliersData = [];
      if (response && typeof response === 'object') {
        if (response.success && Array.isArray(response.data)) {
          suppliersData = response.data;
        } else if (Array.isArray(response)) {
          suppliersData = response;
        } else if (response.data && Array.isArray(response.data)) {
          suppliersData = response.data;
        }
      }
      
      setSuppliers(suppliersData);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      showSnackbar('Failed to fetch suppliers', 'error');
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiService.get('/suppliers/stats');
      console.log('Stats API response:', response);
      
      // Handle both wrapped and direct response formats
      let statsData = null;
      if (response && typeof response === 'object') {
        if (response.success && response.data) {
          statsData = response.data;
        } else if (response.totalSuppliers !== undefined) {
          statsData = response;
        } else if (response.data && response.data.totalSuppliers !== undefined) {
          statsData = response.data;
        }
      }
      
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching supplier stats:', error);
      setStats(null);
    }
  };

  useEffect(() => {
    fetchSuppliers(filterStatus === 'all');
    fetchStats();
  }, [filterStatus]);

  const handleOpenDialog = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      reset({
        name: supplier.name,
        company: supplier.company,
        email: supplier.email,
        phone: supplier.phone,
        address: supplier.address,
        city: supplier.city,
        state: supplier.state,
        zipCode: supplier.zipCode,
        country: supplier.country,
        taxId: supplier.taxId,
        contactPerson: supplier.contactPerson,
        contactPhone: supplier.contactPhone,
        website: supplier.website,
        paymentTerms: supplier.paymentTerms,
        creditLimit: supplier.creditLimit,
        isActive: supplier.isActive,
        notes: supplier.notes
      });
    } else {
      setEditingSupplier(null);
      reset(defaultValues);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingSupplier(null);
    reset(defaultValues);
  };

  const onSubmit = async (data: any) => {
    try {
      // Helper function to convert empty strings to null
      const toNullIfEmpty = (value: any): any => {
        if (typeof value === 'string' && value.trim() === '') {
          return null;
        }
        return value;
      };

      // Convert string values to proper types and empty strings to null
      const submitData = {
        name: data.name?.trim() || '',
        company: toNullIfEmpty(data.company),
        email: toNullIfEmpty(data.email),
        phone: data.phone?.trim() || '',
        address: toNullIfEmpty(data.address),
        city: toNullIfEmpty(data.city),
        state: toNullIfEmpty(data.state),
        zipCode: toNullIfEmpty(data.zipCode),
        country: toNullIfEmpty(data.country),
        taxId: toNullIfEmpty(data.taxId),
        contactPerson: toNullIfEmpty(data.contactPerson),
        contactPhone: toNullIfEmpty(data.contactPhone),
        website: toNullIfEmpty(data.website),
        paymentTerms: toNullIfEmpty(data.paymentTerms),
        creditLimit: data.creditLimit || null,
        isActive: data.isActive === 'true' || data.isActive === true,
        notes: toNullIfEmpty(data.notes)
      };
      
      if (editingSupplier) {
        const response = await apiService.put(`/suppliers/${editingSupplier.id}`, submitData);
        if (response && (response.success !== false)) {
          showSnackbar('Supplier updated successfully', 'success');
        } else {
          showSnackbar('Failed to update supplier', 'error');
          return;
        }
      } else {
        const response = await apiService.post('/suppliers', submitData);
        if (response && (response.success !== false)) {
          showSnackbar('Supplier created successfully', 'success');
        } else {
          showSnackbar('Failed to create supplier', 'error');
          return;
        }
      }
      handleCloseDialog();
      fetchSuppliers();
      fetchStats();
    } catch (error: any) {
      console.error('Error saving supplier:', error);
      const errorMessage = error?.response?.data?.error || error?.response?.data?.message || 'Failed to save supplier';
      showSnackbar(errorMessage, 'error');
    }
  };

  const handleDelete = async (supplier: Supplier) => {
    if (window.confirm(`Are you sure you want to deactivate ${supplier.name}? This will make the supplier inactive but keep the data.`)) {
      try {
        console.log('Attempting to deactivate supplier:', supplier.id);
        console.log('API URL:', `/suppliers/${supplier.id}`);
        
        const response = await apiService.delete(`/suppliers/${supplier.id}`);
        console.log('Delete response:', response);
        console.log('Response type:', typeof response);
        console.log('Response success:', response?.success);
        
        if (response && response.success === true) {
          showSnackbar('Supplier deactivated successfully', 'success');
          fetchSuppliers(filterStatus === 'all');
          fetchStats();
        } else if (response && response.success === false) {
          const errorMessage = response.error || 'Failed to deactivate supplier';
          showSnackbar(errorMessage, 'error');
        } else {
          console.log('Unexpected response format:', response);
          showSnackbar('Failed to deactivate supplier - unexpected response', 'error');
        }
      } catch (error: any) {
        console.error('Error deactivating supplier:', error);
        console.error('Error details:', {
          message: error?.message,
          status: error?.response?.status,
          data: error?.response?.data,
          config: error?.config
        });
        const errorMessage = error?.response?.data?.error || error?.message || 'Failed to deactivate supplier';
        showSnackbar(errorMessage, 'error');
      }
    }
  };

  const handlePermanentDelete = async (supplier: Supplier) => {
    try {
      console.log('Attempting to permanently delete supplier:', supplier.id);
      console.log('API URL:', `/suppliers/${supplier.id}/permanent`);
      
      const response = await apiService.delete(`/suppliers/${supplier.id}/permanent`);
      console.log('Permanent delete response:', response);
      
      if (response && response.success === true) {
        showSnackbar('Supplier permanently deleted successfully', 'success');
        fetchSuppliers(filterStatus === 'all');
        fetchStats();
      } else if (response && response.success === false) {
        const errorMessage = response.error || 'Failed to permanently delete supplier';
        showSnackbar(errorMessage, 'error');
      } else {
        console.log('Unexpected response format:', response);
        showSnackbar('Failed to permanently delete supplier - unexpected response', 'error');
      }
      } catch (error: any) {
        console.error('Error permanently deleting supplier:', error);
        console.error('Error details:', {
          message: error?.message,
          status: error?.response?.status,
          data: error?.response?.data,
          config: error?.config
        });
        const errorMessage = error?.response?.data?.error || error?.message || 'Failed to permanently delete supplier';
        showSnackbar(errorMessage, 'error');
      } finally {
      setPermanentDeleteDialog({ open: false, supplier: null });
    }
  };

  const handleCreatePurchaseOrder = (supplier: Supplier) => {
    console.log('Navigating to purchase orders with supplier:', supplier.id, supplier.name);
    navigate('/purchase-orders', { 
      state: { selectedSupplierId: supplier.id } 
    });
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpenBalanceDialog = (supplier: Supplier) => {
    setSelectedSupplierForBalance(supplier);
    resetBalance({
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setOpeningBalanceDialogOpen(true);
  };

  const handleCloseBalanceDialog = () => {
    setOpeningBalanceDialogOpen(false);
    setSelectedSupplierForBalance(null);
    resetBalance();
  };

  const onSubmitOpeningBalance = async (data: any) => {
    if (!selectedSupplierForBalance) return;

    try {
      // Supplier always owes store (receivable) - always DEBIT
      await apiService.post('/accounting/suppliers/transactions', {
        supplierId: selectedSupplierForBalance.id,
        type: 'DEBIT',
        amount: data.amount,
        description: 'Opening Balance - Supplier owes store',
        reference: 'OPENING_BALANCE',
        referenceType: 'ADJUSTMENT',
        date: data.date,
        notes: data.notes || undefined
      });

      showSnackbar('Opening balance added successfully', 'success');
      handleCloseBalanceDialog();
      fetchSuppliers(filterStatus === 'all');
    } catch (err: any) {
      const errorMessage = err?.response?.data?.error || 'Failed to add opening balance';
      showSnackbar(errorMessage, 'error');
      console.error('Opening balance error:', err);
    }
  };

  const filteredSuppliers = (suppliers || []).filter(supplier => {
    const matchesSearch = (supplier.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (supplier.company || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (supplier.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filtering is now handled by the API call, so we only filter by search term
    return matchesSearch;
  });

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Supplier Management
      </Typography>

      {/* Statistics Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Suppliers
                </Typography>
                <Typography variant="h4">
                  {stats.totalSuppliers}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Active Suppliers
                </Typography>
                <Typography variant="h4">
                  {stats.activeSuppliers}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  With Products
                </Typography>
                <Typography variant="h4">
                  {stats.suppliersWithProducts}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Search and Filter */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              placeholder="Search suppliers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                label="Status"
              >
                <MenuItem value="active">Active Only</MenuItem>
                <MenuItem value="all">All (Including Inactive)</MenuItem>
                <MenuItem value="inactive">Inactive Only</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              fullWidth
            >
              Add Supplier
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Suppliers Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Company</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Products</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography>Loading suppliers...</Typography>
                </TableCell>
              </TableRow>
            ) : filteredSuppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography>No suppliers found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredSuppliers.map((supplier) => (
              <TableRow key={supplier.id}>
                <TableCell>
                  <Box>
                    <Typography variant="subtitle2">{supplier.name || 'N/A'}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {supplier.contactPerson || 'No contact person'}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2">{supplier.company || 'N/A'}</Typography>
                    {supplier.website && supplier.website.trim() && (
                      <Typography variant="caption" color="textSecondary">
                        <WebsiteIcon sx={{ fontSize: 12, mr: 0.5 }} />
                        {supplier.website}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                      <EmailIcon sx={{ fontSize: 16, mr: 0.5 }} />
                      {supplier.email || 'N/A'}
                    </Typography>
                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                      <PhoneIcon sx={{ fontSize: 16, mr: 0.5 }} />
                      {supplier.phone || 'N/A'}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {supplier.city || 'N/A'}, {supplier.state || 'N/A'}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {supplier.country || 'N/A'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={`${(supplier.products || []).length} products`}
                    size="small"
                    color={(supplier.products || []).length > 0 ? 'primary' : 'default'}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={supplier.isActive ? 'Active' : 'Inactive'}
                    color={supplier.isActive ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Tooltip title="Add Opening Balance">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenBalanceDialog(supplier)}
                      color="primary"
                    >
                      <AccountBalanceIcon />
                    </IconButton>
                  </Tooltip>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(supplier)}
                  >
                    <EditIcon />
                  </IconButton>
                  <Tooltip title="Deactivate supplier">
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(supplier)}
                      color="warning"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Permanently delete supplier">
                    <IconButton
                      size="small"
                      onClick={() => setPermanentDeleteDialog({ open: true, supplier })}
                      color="error"
                    >
                      <DeleteForeverIcon />
                    </IconButton>
                  </Tooltip>
                  <IconButton
                    size="small"
                    onClick={() => handleCreatePurchaseOrder(supplier)}
                    color="primary"
                  >
                    <BusinessIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Fields marked with * are required
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Name *"
                      fullWidth
                      required
                      error={!!errors.name}
                      helperText={errors.name?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="company"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Company"
                      fullWidth
                      error={!!errors.company}
                      helperText={errors.company?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Email"
                      type="email"
                      fullWidth
                      error={!!errors.email}
                      helperText={errors.email?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Phone *"
                      fullWidth
                      required
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
                      label="Address"
                      fullWidth
                      error={!!errors.address}
                      helperText={errors.address?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Controller
                  name="city"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="City"
                      fullWidth
                      error={!!errors.city}
                      helperText={errors.city?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Controller
                  name="state"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="State"
                      fullWidth
                      error={!!errors.state}
                      helperText={errors.state?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Controller
                  name="zipCode"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="ZIP Code"
                      fullWidth
                      error={!!errors.zipCode}
                      helperText={errors.zipCode?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="country"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Country"
                      fullWidth
                      error={!!errors.country}
                      helperText={errors.country?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="taxId"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Tax ID"
                      fullWidth
                      error={!!errors.taxId}
                      helperText={errors.taxId?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="contactPerson"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Contact Person"
                      fullWidth
                      error={!!errors.contactPerson}
                      helperText={errors.contactPerson?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="contactPhone"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Contact Phone"
                      fullWidth
                      error={!!errors.contactPhone}
                      helperText={errors.contactPhone?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="website"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Website"
                      fullWidth
                      error={!!errors.website}
                      helperText={errors.website?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="paymentTerms"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Payment Terms"
                      fullWidth
                      error={!!errors.paymentTerms}
                      helperText={errors.paymentTerms?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="creditLimit"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Credit Limit"
                      type="number"
                      fullWidth
                      error={!!errors.creditLimit}
                      helperText={errors.creditLimit?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="isActive"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Status</InputLabel>
                      <Select
                        {...field}
                        label="Status"
                        error={!!errors.isActive}
                      >
                        <MenuItem value="true">Active</MenuItem>
                        <MenuItem value="false">Inactive</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="notes"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Notes"
                      multiline
                      rows={3}
                      fullWidth
                      error={!!errors.notes}
                      helperText={errors.notes?.message}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingSupplier ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Permanent Delete Confirmation Dialog */}
      <Dialog 
        open={permanentDeleteDialog.open} 
        onClose={() => setPermanentDeleteDialog({ open: false, supplier: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: 'error.main' }}>
          ⚠️ Permanent Delete Confirmation
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            <strong>This action cannot be undone!</strong>
          </Alert>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you absolutely sure you want to permanently delete the supplier:
          </Typography>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
            {permanentDeleteDialog.supplier?.name}
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            This will permanently remove all supplier data from the database, including:
          </Typography>
          <ul style={{ marginLeft: '20px', marginBottom: '16px' }}>
            <li>Supplier profile and contact information</li>
            <li>All associated purchase orders</li>
            <li>All associated products</li>
            <li>All historical data and records</li>
          </ul>
          <Alert severity="warning">
            <strong>Note:</strong> This action will fail if the supplier has associated products or purchase orders. 
            You must remove all dependencies first.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setPermanentDeleteDialog({ open: false, supplier: null })}
            color="primary"
          >
            Cancel
          </Button>
          <Button 
            onClick={() => permanentDeleteDialog.supplier && handlePermanentDelete(permanentDeleteDialog.supplier)}
            color="error"
            variant="contained"
            startIcon={<DeleteForeverIcon />}
          >
            Delete Permanently
          </Button>
        </DialogActions>
      </Dialog>

      {/* Opening Balance Dialog */}
      <Dialog open={openingBalanceDialogOpen} onClose={handleCloseBalanceDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Add Opening Balance - {selectedSupplierForBalance?.name}
        </DialogTitle>
          <form onSubmit={handleBalanceSubmit(onSubmitOpeningBalance)}>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Opening Balance:</strong> Amount the supplier owes to the store (Receivable)
              </Typography>
            </Alert>
            <Grid container spacing={2}>
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
  );
};

export default SuppliersPage;
