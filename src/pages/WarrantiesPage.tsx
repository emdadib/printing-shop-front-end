import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Tooltip,
  Snackbar
} from '@mui/material';
import {
  Add,
  Edit,
  Visibility,
  Search,
  FilterList
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useSettings } from '../hooks/useSettings';
import { apiService } from '../services/api';

interface Warranty {
  id: string;
  warrantyNumber: string;
  issueDescription: string;
  status: string;
  priority: string;
  reportedDate: string;
  resolvedDate?: string;
  resolution?: string;
  refundAmount?: number;
  notes?: string;
  product: {
    id: string;
    name: string;
    sku: string;
  };
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  order: {
    id: string;
    orderNumber: string;
    createdAt: string;
  };
  createdByUser: {
    id: string;
    firstName: string;
    lastName: string;
  };
  assignedToUser?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

const warrantySchema = yup.object({
  productId: yup.string().required('Product is required'),
  orderId: yup.string().required('Order is required'),
  customerId: yup.string().required('Customer is required'),
  issueDescription: yup.string().required('Issue description is required'),
  priority: yup.string().required('Priority is required'),
  notes: yup.string(),
  status: yup.string(),
  resolution: yup.string(),
  refundAmount: yup.number().min(0)
});

const WarrantiesPage: React.FC = () => {
  const { formatCurrency } = useSettings();
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingWarranty, setEditingWarranty] = useState<Warranty | null>(null);
  const [selectedWarranty, setSelectedWarranty] = useState<Warranty | null>(null);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({ open: false, message: '', severity: 'success' });
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({
    resolver: yupResolver(warrantySchema),
    defaultValues: {
      productId: '',
      orderId: '',
      customerId: '',
      issueDescription: '',
      priority: 'MEDIUM',
      notes: '',
      status: 'OPEN',
      resolution: '',
      refundAmount: 0
    }
  });

  useEffect(() => {
    fetchWarranties();
    fetchProducts();
    fetchCustomers();
    fetchOrders();
  }, []);

  const fetchWarranties = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/warranties');
      if (response.success && Array.isArray(response.data)) {
        setWarranties(response.data);
      } else if (Array.isArray(response)) {
        setWarranties(response);
      } else {
        setWarranties([]);
      }
    } catch (err) {
      console.error('Warranties fetch error:', err);
      setSnackbar({
        open: true,
        message: 'Failed to fetch warranties',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await apiService.get('/products');
      if (response.success && Array.isArray(response.data)) {
        setProducts(response.data.filter((p: any) => p.hasWarranty));
      } else if (Array.isArray(response)) {
        setProducts(response.filter((p: any) => p.hasWarranty));
      }
    } catch (err) {
      console.error('Products fetch error:', err);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await apiService.get('/customers');
      if (response.success && Array.isArray(response.data)) {
        setCustomers(response.data);
      } else if (Array.isArray(response)) {
        setCustomers(response);
      }
    } catch (err) {
      console.error('Customers fetch error:', err);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await apiService.get('/orders');
      if (response.success && Array.isArray(response.data)) {
        setOrders(response.data);
      } else if (Array.isArray(response)) {
        setOrders(response);
      }
    } catch (err) {
      console.error('Orders fetch error:', err);
    }
  };

  const handleOpenDialog = (warranty?: Warranty) => {
    if (warranty) {
      setEditingWarranty(warranty);
      reset({
        productId: warranty.product.id,
        orderId: warranty.order.id,
        customerId: warranty.customer.id,
        issueDescription: warranty.issueDescription,
        priority: warranty.priority,
        notes: warranty.notes || '',
        status: warranty.status,
        resolution: warranty.resolution || '',
        refundAmount: warranty.refundAmount || 0
      });
    } else {
      setEditingWarranty(null);
      reset({
        productId: '',
        orderId: '',
        customerId: '',
        issueDescription: '',
        priority: 'MEDIUM',
        notes: '',
        status: 'OPEN',
        resolution: '',
        refundAmount: 0
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingWarranty(null);
    reset();
  };

  const handleOpenDetailsDialog = (warranty: Warranty) => {
    setSelectedWarranty(warranty);
    setOpenDetailsDialog(true);
  };

  const handleCloseDetailsDialog = () => {
    setOpenDetailsDialog(false);
    setSelectedWarranty(null);
  };

  const onSubmit = async (data: any) => {
    try {
      if (editingWarranty) {
        await apiService.put(`/warranties/${editingWarranty.id}`, data);
        setSnackbar({
          open: true,
          message: 'Warranty updated successfully',
          severity: 'success'
        });
      } else {
        await apiService.post('/warranties', data);
        setSnackbar({
          open: true,
          message: 'Warranty created successfully',
          severity: 'success'
        });
      }
      handleCloseDialog();
      fetchWarranties();
    } catch (err) {
      console.error('Warranty save error:', err);
      setSnackbar({
        open: true,
        message: 'Failed to save warranty',
        severity: 'error'
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'warning';
      case 'IN_PROGRESS': return 'info';
      case 'RESOLVED': return 'success';
      case 'CLOSED': return 'default';
      case 'REJECTED': return 'error';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'default';
      case 'MEDIUM': return 'primary';
      case 'HIGH': return 'warning';
      case 'URGENT': return 'error';
      default: return 'default';
    }
  };

  const filteredWarranties = warranties.filter(warranty => {
    const matchesSearch = warranty.warrantyNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         warranty.issueDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         warranty.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         warranty.customer?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         warranty.customer?.lastName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || warranty.status === statusFilter;
    const matchesPriority = !priorityFilter || warranty.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Warranty Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          New Warranty
        </Button>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="OPEN">Open</MenuItem>
                  <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                  <MenuItem value="RESOLVED">Resolved</MenuItem>
                  <MenuItem value="CLOSED">Closed</MenuItem>
                  <MenuItem value="REJECTED">Rejected</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  label="Priority"
                >
                  <MenuItem value="">All Priorities</MenuItem>
                  <MenuItem value="LOW">Low</MenuItem>
                  <MenuItem value="MEDIUM">Medium</MenuItem>
                  <MenuItem value="HIGH">High</MenuItem>
                  <MenuItem value="URGENT">Urgent</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FilterList />}
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('');
                  setPriorityFilter('');
                }}
              >
                Clear
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Warranties Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Warranty #</TableCell>
                <TableCell>Product</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Issue</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Reported Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredWarranties.map((warranty) => (
                <TableRow key={warranty.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {warranty.warrantyNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {warranty.product.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      SKU: {warranty.product.sku}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {warranty.customer?.firstName || 'Unknown'} {warranty.customer?.lastName || 'Customer'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {warranty.customer?.email || 'No email'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                      {warranty.issueDescription}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={warranty.status.replace('_', ' ')}
                      color={getStatusColor(warranty.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={warranty.priority}
                      color={getPriorityColor(warranty.priority) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(warranty.reportedDate).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDetailsDialog(warranty)}
                      >
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(warranty)}
                      >
                        <Edit />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Warranty Form Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingWarranty ? 'Edit Warranty' : 'Create New Warranty'}
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Controller
                  name="productId"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.productId}>
                      <InputLabel>Product</InputLabel>
                      <Select {...field} label="Product">
                        {products.map((product) => (
                          <MenuItem key={product.id} value={product.id}>
                            {product.name} ({product.sku})
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.productId && (
                        <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                          {errors.productId.message}
                        </Typography>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="customerId"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.customerId}>
                      <InputLabel>Customer</InputLabel>
                      <Select {...field} label="Customer">
                        {customers.map((customer) => (
                          <MenuItem key={customer.id} value={customer.id}>
                            {customer.firstName} {customer.lastName}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.customerId && (
                        <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                          {errors.customerId.message}
                        </Typography>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="orderId"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.orderId}>
                      <InputLabel>Order</InputLabel>
                      <Select {...field} label="Order">
                        {orders.map((order) => (
                          <MenuItem key={order.id} value={order.id}>
                            {order.orderNumber} - {new Date(order.createdAt).toLocaleDateString()}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.orderId && (
                        <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                          {errors.orderId.message}
                        </Typography>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="priority"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.priority}>
                      <InputLabel>Priority</InputLabel>
                      <Select {...field} label="Priority">
                        <MenuItem value="LOW">Low</MenuItem>
                        <MenuItem value="MEDIUM">Medium</MenuItem>
                        <MenuItem value="HIGH">High</MenuItem>
                        <MenuItem value="URGENT">Urgent</MenuItem>
                      </Select>
                      {errors.priority && (
                        <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                          {errors.priority.message}
                        </Typography>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="issueDescription"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Issue Description"
                      multiline
                      rows={3}
                      error={!!errors.issueDescription}
                      helperText={errors.issueDescription?.message}
                      required
                    />
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
                      fullWidth
                      label="Notes"
                      multiline
                      rows={2}
                      error={!!errors.notes}
                      helperText={errors.notes?.message}
                    />
                  )}
                />
              </Grid>
              {editingWarranty && (
                <>
                  <Grid item xs={12} md={6}>
                    <Controller
                      name="status"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth>
                          <InputLabel>Status</InputLabel>
                          <Select {...field} label="Status">
                            <MenuItem value="OPEN">Open</MenuItem>
                            <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                            <MenuItem value="RESOLVED">Resolved</MenuItem>
                            <MenuItem value="CLOSED">Closed</MenuItem>
                            <MenuItem value="REJECTED">Rejected</MenuItem>
                          </Select>
                        </FormControl>
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Controller
                      name="refundAmount"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Refund Amount"
                          type="number"
                          inputProps={{ step: 0.01, min: 0 }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Controller
                      name="resolution"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Resolution"
                          multiline
                          rows={2}
                        />
                      )}
                    />
                  </Grid>
                </>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingWarranty ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Warranty Details Dialog */}
      <Dialog open={openDetailsDialog} onClose={handleCloseDetailsDialog} maxWidth="md" fullWidth>
        <DialogTitle>Warranty Details - {selectedWarranty?.warrantyNumber}</DialogTitle>
        <DialogContent>
          {selectedWarranty && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Product Information</Typography>
                <Typography><strong>Product:</strong> {selectedWarranty.product.name}</Typography>
                <Typography><strong>SKU:</strong> {selectedWarranty.product.sku}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Customer Information</Typography>
                <Typography><strong>Name:</strong> {selectedWarranty.customer?.firstName || 'Unknown'} {selectedWarranty.customer?.lastName || 'Customer'}</Typography>
                <Typography><strong>Email:</strong> {selectedWarranty.customer?.email || 'No email'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Warranty Details</Typography>
                <Typography><strong>Issue:</strong> {selectedWarranty.issueDescription}</Typography>
                <Typography><strong>Status:</strong> 
                  <Chip
                    label={selectedWarranty.status.replace('_', ' ')}
                    color={getStatusColor(selectedWarranty.status) as any}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </Typography>
                <Typography><strong>Priority:</strong> 
                  <Chip
                    label={selectedWarranty.priority}
                    color={getPriorityColor(selectedWarranty.priority) as any}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </Typography>
                <Typography><strong>Reported Date:</strong> {new Date(selectedWarranty.reportedDate).toLocaleString()}</Typography>
                {selectedWarranty.resolvedDate && (
                  <Typography><strong>Resolved Date:</strong> {new Date(selectedWarranty.resolvedDate).toLocaleString()}</Typography>
                )}
                {selectedWarranty.resolution && (
                  <Typography><strong>Resolution:</strong> {selectedWarranty.resolution}</Typography>
                )}
                {selectedWarranty.refundAmount && (
                  <Typography><strong>Refund Amount:</strong> {formatCurrency(selectedWarranty.refundAmount)}</Typography>
                )}
                {selectedWarranty.notes && (
                  <Typography><strong>Notes:</strong> {selectedWarranty.notes}</Typography>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetailsDialog}>Close</Button>
          {selectedWarranty && selectedWarranty.status !== 'CLOSED' && (
            <Button 
              variant="contained" 
              onClick={() => {
                handleCloseDetailsDialog();
                handleOpenDialog(selectedWarranty);
              }}
            >
              Update Status
            </Button>
          )}
        </DialogActions>
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

export default WarrantiesPage;
