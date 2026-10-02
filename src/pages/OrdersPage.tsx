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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  InputAdornment,
  Divider,
  List,
  ListItem,
  ListItemText,
  Menu,
  Tooltip,
  Chip,
  Snackbar,
  TablePagination,
} from '@mui/material';
import {
  Add,
  Delete,
  Search,
  Visibility,
  MoreVert,
  Payment,
  Print,
  CheckCircle,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiService } from '@/services/api';
import { useSettings } from '@/hooks/useSettings';
import OrderReceipt from '@/components/OrderReceipt';
import { getOrderCreatorName, OrderCreator } from '@/utils/orderCreator';

interface Order {
  id: string;
  orderNumber: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    isWalkIn?: boolean;
  };
  status: string;
  type: string;
  subtotal: number | string; // Can be Decimal from database
  discountAmount?: number | string; // Can be Decimal from database
  total: number | string; // Can be Decimal from database
  createdAt: string;
  /** Employee who created the order (safe subset returned by the API). */
  user?: OrderCreator | null;
  items?: OrderItem[];
  notes?: string;
  dueDate?: string;
  completedAt?: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  basePrice: number;
  baseCostPrice: number;
  hasWarranty: boolean;
  warrantyPeriod: number;
  warrantyPeriodType: string;
  category: {
    id: string;
    name: string;
  };
}

interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  discount: number;
  taxAmount: number;
  total: number | string; // Can be Decimal from database
  notes: string;
  specifications: any;
  serialNumbers?: string; // Comma-separated serial numbers
  warrantyStartDate?: string;
  warrantyEndDate?: string;
  product?: Product;
}

const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { formatCurrency, getSettingValue } = useSettings();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({ open: false, message: '', severity: 'success' });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalOrders, setTotalOrders] = useState(0);
  
  // New state for order management
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedOrderForMenu, setSelectedOrderForMenu] = useState<Order | null>(null);
  
  // Status menu state
  const [statusMenuAnchorEl, setStatusMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedOrderForStatus, setSelectedOrderForStatus] = useState<Order | null>(null);
  
  // Payment state
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Order | null>(null);
  const [orderDueAmount, setOrderDueAmount] = useState(0);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  
  // Due amounts state
  const [orderDueAmounts, setOrderDueAmounts] = useState<{[key: string]: number}>({});
  
  // Print receipt state
  const [openReceiptDialog, setOpenReceiptDialog] = useState(false);
  const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState<Order | null>(null);

  // Reset to page 0 when search term changes (before fetching)
  useEffect(() => {
    if (searchTerm) {
      setPage(0);
    }
  }, [searchTerm]);

  useEffect(() => {
    fetchOrders();
  }, [page, rowsPerPage, statusFilter, startDate, endDate, searchTerm]);

  // If navigated with ?orderId=..., open that order details directly
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const orderId = params.get('orderId');
    if (!orderId) return;

    (async () => {
      try {
        const response = await apiService.get(`/orders/${orderId}`);
        const order = response?.data || response;
        if (response?.success && order?.id) {
          handleOpenDetailsDialog(order);
        }
      } catch (e) {
        console.error('Failed to open order by id:', orderId, e);
      }
    })();
  }, [location.search]);

  // Fetch due amount for a specific order
  const fetchDueAmountForOrder = async (orderId: string): Promise<number> => {
    try {
      const response = await apiService.get(`/payments/order/${orderId}/due`);
      const dueAmount = response.data?.dueAmount || response.dueAmount || 0;
      
      // Update the due amount for this specific order
      setOrderDueAmounts(prev => ({
        ...prev,
        [orderId]: dueAmount
      }));
      
      return dueAmount;
    } catch (err) {
      console.error('Error fetching due amount for order', orderId, ':', err);
      // If API call fails, set due amount to 0 (assume fully paid or unknown)
      setOrderDueAmounts(prev => ({
        ...prev,
        [orderId]: 0
      }));
      return 0;
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      // If search is active, fetch all orders for client-side filtering
      // Otherwise, use server-side pagination
      if (searchTerm) {
        // Fetch a large number of orders for client-side search and pagination
        params.append('page', '1');
        params.append('limit', '1000'); // Large limit to get all orders for search
      } else {
        // Use server-side pagination when no search
        params.append('page', (page + 1).toString()); // Backend uses 1-based pagination
        params.append('limit', rowsPerPage.toString());
      }
      
      // Add status filter if not 'all'
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      // Add date range filters if provided
      if (startDate) {
        params.append('startDate', startDate);
      }
      if (endDate) {
        params.append('endDate', endDate);
      }
      
      const response = await apiService.get(`/orders?${params.toString()}`);
      
      if (response.success && Array.isArray(response.data)) {
        setOrders(response.data);
        // Update total count from pagination info
        if (response.pagination) {
          if (searchTerm) {
            // When searching, we'll set total based on filtered results after filtering
            // For now, use the total from server as a fallback
            setTotalOrders(response.pagination.total);
          } else {
            // Use server pagination total when not searching
            setTotalOrders(response.pagination.total);
          }
        } else {
          // Fallback if no pagination info
          setTotalOrders(response.data.length);
        }
      } else if (Array.isArray(response)) {
        setOrders(response);
        setTotalOrders(response.length);
      } else {
        setOrders([]);
        setTotalOrders(0);
      }
    } catch (err) {
      setError('Failed to load orders');
      console.error('Orders fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleOpenDetailsDialog = async (order: Order) => {
    setSelectedOrder(order);
    setOpenDetailsDialog(true);
    
    // Fetch the latest due amount for this specific order
    fetchDueAmountForOrder(order.id);
  };

  const handleCloseDetailsDialog = () => {
    setOpenDetailsDialog(false);
    setSelectedOrder(null);
    
    // Refresh due amount for the selected order when closing the dialog in case a payment was made
    if (selectedOrder) {
      setTimeout(() => {
        fetchDueAmountForOrder(selectedOrder.id);
      }, 500);
    }
  };


  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, order: Order) => {
    setAnchorEl(event.currentTarget);
    setSelectedOrderForMenu(order);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedOrderForMenu(null);
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to delete this order?')) return;

    try {
      await apiService.delete(`/orders/${orderId}`);
      fetchOrders();
      handleMenuClose();
    } catch (err) {
      setError('Failed to delete order');
      console.error('Delete order error:', err);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await apiService.patch(`/orders/${orderId}/status`, { status: newStatus });
      if (response && response.success) {
        fetchOrders();
        setError(null);
        showSnackbar(`Order status updated to ${newStatus.replace('_', ' ')}`, 'success');
        // Close status menu if open
        setStatusMenuAnchorEl(null);
        setSelectedOrderForStatus(null);
      } else {
        setError('Failed to update order status');
        showSnackbar('Failed to update order status', 'error');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      setError('Failed to update order status');
      showSnackbar('Failed to update order status', 'error');
    }
  };

  const handleStatusMenuOpen = (event: React.MouseEvent<HTMLElement>, order: Order) => {
    event.stopPropagation();
    setStatusMenuAnchorEl(event.currentTarget);
    setSelectedOrderForStatus(order);
  };

  const handleStatusMenuClose = () => {
    setStatusMenuAnchorEl(null);
    setSelectedOrderForStatus(null);
  };

  const handleStatusSelect = (status: string) => {
    if (selectedOrderForStatus) {
      handleUpdateOrderStatus(selectedOrderForStatus.id, status);
    }
    handleStatusMenuClose();
  };

  const getStatusLabel = (status: string) => {
    return status.replace('_', ' ');
  };

  const getAllStatuses = () => {
    return ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'READY', 'COMPLETED', 'CANCELLED'];
  };

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case 'PENDING': return 'CONFIRMED';
      case 'CONFIRMED': return 'IN_PROGRESS';
      case 'IN_PROGRESS': return 'READY';
      case 'READY': return 'COMPLETED';
      default: return null;
    }
  };

  // Payment functions
  const handleOpenPaymentDialog = async (order: Order) => {
    try {
      console.log('Opening payment dialog for order:', order.id);
      const dueAmount = await fetchDueAmountForOrder(order.id);
      setOrderDueAmount(dueAmount);
      setPaymentAmount(dueAmount);
      setSelectedOrderForPayment(order);
      setOpenPaymentDialog(true);
    } catch (err) {
      setError('Failed to get order due amount');
      console.error('Get due amount error:', err);
      // Fallback to order total
      const fallbackAmount = Number(order.total) || 0;
      setOrderDueAmount(fallbackAmount);
      setPaymentAmount(fallbackAmount);
      setSelectedOrderForPayment(order);
      setOpenPaymentDialog(true);
    }
  };

  const handleClosePaymentDialog = () => {
    setOpenPaymentDialog(false);
    setSelectedOrderForPayment(null);
    setOrderDueAmount(0);
    setPaymentAmount(0);
    setPaymentMethod('CASH');
  };

  // Receipt functions
  const handleOpenReceiptDialog = (order: Order) => {
    // Validate customer has a proper name
    const customer = order.customer;
    const isWalkingCustomer = customer?.isWalkIn === true;
    const hasNoName = !customer?.firstName || 
                      customer.firstName.trim() === '' || 
                      customer.firstName.toLowerCase() === 'walk-in' ||
                      (customer.firstName === 'Walk-in' && customer.lastName === 'Customer');
    
    if (isWalkingCustomer || hasNoName) {
      setError('Cannot print receipt: Customer must have a valid name. Walking customers or customers without names are not allowed for receipt printing.');
      return;
    }
    
    setSelectedOrderForReceipt(order);
    setOpenReceiptDialog(true);
  };

  const handleCloseReceiptDialog = () => {
    setOpenReceiptDialog(false);
    setSelectedOrderForReceipt(null);
  };

  const handleSubmitPayment = async () => {
    if (!selectedOrderForPayment || paymentAmount <= 0) return;

    try {
      const paymentData = {
        customerId: selectedOrderForPayment.customer.id,
        orderId: selectedOrderForPayment.id,
        amount: paymentAmount,
        paymentMethod,
        notes: `Payment for order ${selectedOrderForPayment.orderNumber}`
      };

      console.log('Submitting payment with data:', paymentData);
      const paymentResponse = await apiService.post('/payments', paymentData);
      console.log('Payment submission response:', paymentResponse);
      handleClosePaymentDialog();
      fetchOrders();
      // Refresh due amount for this specific order after payment
      setTimeout(() => {
        fetchDueAmountForOrder(selectedOrderForPayment.id);
      }, 1000);
      setError(null);
    } catch (err) {
      setError('Failed to process payment');
      console.error('Payment error:', err);
    }
  };

  // Client-side search filtering (server handles pagination, status, and date range)
  const filteredOrders = (orders || []).filter(order => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      order.orderNumber.toLowerCase().includes(searchLower) ||
      `${order.customer?.firstName || 'Unknown'} ${order.customer?.lastName || 'Customer'}`.toLowerCase().includes(searchLower) ||
      (order.customer?.email || '').toLowerCase().includes(searchLower) ||
      getOrderCreatorName(order.user, '').toLowerCase().includes(searchLower);
    
    return matchesSearch;
  });

  // Update totalOrders when searching (based on filtered results)
  useEffect(() => {
    if (searchTerm && filteredOrders.length !== totalOrders) {
      setTotalOrders(filteredOrders.length);
    }
  }, [searchTerm, filteredOrders.length]);

  // For pagination: if search is active, use client-side pagination on filtered results
  // Otherwise, server handles pagination (orders are already paginated)
  const paginatedOrders = searchTerm 
    ? filteredOrders.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    : orders; // Use orders directly when no search (server already paginated)

  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Orders</Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            color="error"
            startIcon={<Payment />}
            onClick={() => navigate('/orders/due-amount')}
          >
            Due Amount
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/pos')}
          >
            New Order
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Search and Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                size="small"
                fullWidth
                placeholder="Search orders..."
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
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl size="small" fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(0); // Reset to first page when filter changes
                  }}
                  label="Status"
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="PENDING">Pending</MenuItem>
                  <MenuItem value="CONFIRMED">Confirmed</MenuItem>
                  <MenuItem value="COMPLETED">Completed</MenuItem>
                  <MenuItem value="CANCELLED">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2.5}>
              <TextField
                size="small"
                fullWidth
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(0); // Reset to first page when filter changes
                }}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2.5}>
              <TextField
                size="small"
                fullWidth
                label="End Date"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(0); // Reset to first page when filter changes
                }}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                  setStatusFilter('all');
                  setSearchTerm('');
                  setPage(0);
                }}
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Order #</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Total</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Created By</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No orders found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedOrders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="subtitle2">{order.orderNumber}</Typography>
                    {(() => {
                      const dueAmount = orderDueAmounts[order.id];
                      // Show flag if order has due amount
                      if (dueAmount !== undefined && dueAmount > 0) {
                        return (
                          <Tooltip title={`Due Amount: ${formatCurrency(dueAmount)}`}>
                            <Chip 
                              label="Due" 
                              size="small" 
                              color="error"
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                          </Tooltip>
                        );
                      }
                      return null;
                    })()}
                  </Box>
                </TableCell>
                                 <TableCell>
                   <Typography variant="subtitle2">
                     {order.customer?.firstName || 'N/A'} {order.customer?.lastName || ''}
                   </Typography>
                   <Typography variant="body2" color="text.secondary">
                     {order.customer?.email || 'No email'}
                   </Typography>
                 </TableCell>
                 <TableCell>{order.type}</TableCell>
                <TableCell>
                  <Chip 
                    label={getStatusLabel(order.status)} 
                    color={
                      order.status === 'COMPLETED' ? 'success' :
                      order.status === 'PENDING' ? 'warning' :
                      order.status === 'CANCELLED' ? 'error' :
                      order.status === 'IN_PROGRESS' ? 'info' :
                      order.status === 'READY' ? 'primary' :
                      'default'
                    }
                    size="small"
                    onClick={(e) => handleStatusMenuOpen(e, order)}
                    style={{ cursor: 'pointer' }}
                    title="Click to change status"
                  />
                </TableCell>
                <TableCell>{formatCurrency(Number(order.total) || 0)}</TableCell>
                <TableCell>
                  {new Date(order.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>{getOrderCreatorName(order.user)}</TableCell>
                 <TableCell>
                  <Tooltip title="View Details">
                    <IconButton 
                      size="small" 
                      onClick={() => handleOpenDetailsDialog(order)}
                    >
                      <Visibility />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Quick Status: Next Step">
                    <IconButton 
                      size="small" 
                      onClick={() => {
                        const nextStatus = getNextStatus(order.status);
                        if (nextStatus) {
                          handleUpdateOrderStatus(order.id, nextStatus);
                        }
                      }}
                      disabled={!getNextStatus(order.status)}
                      color="primary"
                    >
                      <CheckCircle />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="More Actions">
                    <IconButton 
                      size="small" 
                      onClick={(e) => handleMenuOpen(e, order)}
                    >
                      <MoreVert />
                    </IconButton>
                  </Tooltip>
                  {/* Only show Process Payment button if there's still an amount due */}
                  {(() => {
                    const dueAmount = orderDueAmounts[order.id];
                    return dueAmount !== undefined && dueAmount > 0;
                  })() && (
                    <Tooltip title="Process Payment">
                      <IconButton 
                        size="small" 
                        onClick={() => handleOpenPaymentDialog(order)}
                      >
                        <Payment />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={searchTerm ? filteredOrders.length : totalOrders}
          page={page}
          onPageChange={(_, newPage) => {
            setPage(newPage);
          }}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </TableContainer>

      {/* Order Summary */}
      <Box mt={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Order Summary</Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary">
                    {filteredOrders.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Orders
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="success.main">
                    {formatCurrency(filteredOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0))}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Order Value
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="error.main">
                    {formatCurrency(filteredOrders.reduce((sum, order) => {
                      const dueAmount = orderDueAmounts[order.id];
                      // Only include if due amount exists and is greater than 0
                      return sum + (dueAmount !== undefined && dueAmount > 0 ? dueAmount : 0);
                    }, 0))}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Due Amount
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="success.main">
                    {formatCurrency(filteredOrders.reduce((sum, order) => {
                      const total = Number(order.total) || 0;
                      const dueAmount = orderDueAmounts[order.id] ?? total;
                      return sum + (total - dueAmount);
                    }, 0))}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Collected
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>

      {/* Order Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => selectedOrderForMenu && handleOpenReceiptDialog(selectedOrderForMenu)}>
          <Print sx={{ mr: 1 }} />
          Print Receipt
        </MenuItem>
        <MenuItem onClick={() => selectedOrderForMenu && handleDeleteOrder(selectedOrderForMenu.id)}>
          <Delete sx={{ mr: 1 }} />
          Delete Order
        </MenuItem>
      </Menu>

      {/* Status Change Menu */}
      <Menu
        anchorEl={statusMenuAnchorEl}
        open={Boolean(statusMenuAnchorEl)}
        onClose={handleStatusMenuClose}
      >
        <MenuItem disabled>
          <Typography variant="subtitle2" fontWeight="bold">
            Change Status
          </Typography>
        </MenuItem>
        <MenuItem disabled>
          <Typography variant="caption" color="text.secondary">
            Current: {selectedOrderForStatus?.status ? getStatusLabel(selectedOrderForStatus.status) : ''}
          </Typography>
        </MenuItem>
        <Divider />
        {getAllStatuses().map((status) => (
          <MenuItem
            key={status}
            onClick={() => handleStatusSelect(status)}
            selected={selectedOrderForStatus?.status === status}
            disabled={selectedOrderForStatus?.status === status}
          >
            <Chip
              label={getStatusLabel(status)}
              size="small"
              color={
                status === 'COMPLETED' ? 'success' :
                status === 'PENDING' ? 'warning' :
                status === 'CANCELLED' ? 'error' :
                status === 'IN_PROGRESS' ? 'info' :
                status === 'READY' ? 'primary' :
                'default'
              }
              sx={{ mr: 1 }}
            />
            {getStatusLabel(status)}
          </MenuItem>
        ))}
      </Menu>

      {/* Order Details Dialog */}
      <Dialog open={openDetailsDialog} onClose={handleCloseDetailsDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          Order Details - {selectedOrder?.orderNumber}
        </DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Customer Information</Typography>
                <Typography><strong>Name:</strong> {selectedOrder.customer?.firstName} {selectedOrder.customer?.lastName}</Typography>
                {selectedOrder.customer?.isWalkIn ? (
                  <Typography><strong>Type:</strong> 🚶 Walk-in Customer</Typography>
                ) : (
                  <Typography><strong>Email:</strong> {selectedOrder.customer?.email}</Typography>
                )}
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Order Information</Typography>
                <Typography><strong>Type:</strong> {selectedOrder.type}</Typography>
                <Typography><strong>Subtotal:</strong> {formatCurrency(Number(selectedOrder.subtotal) || 0)}</Typography>
                {selectedOrder.discountAmount && Number(selectedOrder.discountAmount) > 0 && (
                  <Typography color="success.main">
                    <strong>Discount:</strong> -{formatCurrency(Number(selectedOrder.discountAmount) || 0)}
                  </Typography>
                )}
                <Typography><strong>Total:</strong> {formatCurrency(Number(selectedOrder.total) || 0)}</Typography>
                {(() => {
                  const dueAmount = orderDueAmounts[selectedOrder.id];
                  if (dueAmount !== undefined && dueAmount > 0) {
                    return (
                      <Typography 
                        variant="body1" 
                        color="error"
                        fontWeight="bold"
                      >
                        <strong>Due Amount:</strong> {formatCurrency(dueAmount)}
                      </Typography>
                    );
                  }
                  return (
                    <Typography 
                      variant="body1" 
                      color="success.main"
                    >
                      <strong>Due Amount:</strong> {dueAmount === 0 ? 'Paid' : '-'}
                    </Typography>
                  );
                })()}
                <Typography><strong>Created:</strong> {new Date(selectedOrder.createdAt).toLocaleString()}</Typography>
                <Typography><strong>Created by:</strong> {getOrderCreatorName(selectedOrder.user)}</Typography>
                
                {/* Status Update Section */}
                <Box mt={2}>
                  <Typography variant="h6" gutterBottom>Update Status</Typography>
                  <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
                    {getAllStatuses().map((status) => (
                      <Chip
                        key={status}
                        label={getStatusLabel(status)}
                        color={
                          status === selectedOrder.status ? 'primary' :
                          status === 'COMPLETED' ? 'success' :
                          status === 'PENDING' ? 'warning' :
                          status === 'CANCELLED' ? 'error' :
                          status === 'IN_PROGRESS' ? 'info' :
                          status === 'READY' ? 'primary' :
                          'default'
                        }
                        variant={status === selectedOrder.status ? 'filled' : 'outlined'}
                        onClick={() => handleUpdateOrderStatus(selectedOrder.id, status)}
                        style={{ cursor: 'pointer' }}
                        size="medium"
                      />
                    ))}
                  </Box>
                  {getNextStatus(selectedOrder.status) && (
                    <Box mt={1}>
                      <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        startIcon={<CheckCircle />}
                        onClick={() => {
                          const nextStatus = getNextStatus(selectedOrder.status);
                          if (nextStatus) {
                            handleUpdateOrderStatus(selectedOrder.id, nextStatus);
                          }
                        }}
                      >
                        Quick: Move to {getStatusLabel(getNextStatus(selectedOrder.status) || '')}
                      </Button>
                    </Box>
                  )}
                </Box>
              </Grid>
              {selectedOrder.notes && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Notes</Typography>
                  <Typography>{selectedOrder.notes}</Typography>
                </Grid>
              )}
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Order Items</Typography>
                  <List>
                    {selectedOrder.items.map((item, index) => (
                      <ListItem key={index} divider>
                        <ListItemText
                          primary={item.product?.name || 'Unknown Product'}
                          secondary={
                            <Box>
                              <Typography variant="body2">
                                Quantity: {item.quantity} | Unit Price: {formatCurrency(item.unitPrice)}
                              </Typography>
                              {item.discount && item.discount > 0 && (
                                <Typography variant="body2" color="success.main">
                                  Item Discount: -{formatCurrency(Number(item.discount) || 0)}
                                </Typography>
                              )}
                              <Typography variant="body2" fontWeight="bold">
                                Total: {formatCurrency(Number(item.total) || 0)}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetailsDialog}>Close</Button>
          {/* Only show Pay Order button if there's still an amount due */}
          {(() => {
            if (!selectedOrder) return false;
            const dueAmount = orderDueAmounts[selectedOrder.id];
            return dueAmount !== undefined && dueAmount > 0;
          })() && (
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => {
                handleCloseDetailsDialog();
                if (selectedOrder) {
                  handleOpenPaymentDialog(selectedOrder);
                }
              }}
            >
              Pay Order
            </Button>
          )}
          <Button 
            variant="outlined" 
            color="primary"
            onClick={() => {
              handleCloseDetailsDialog();
              if (selectedOrder) {
                handleOpenReceiptDialog(selectedOrder);
              }
            }}
          >
            Print Receipt
          </Button>
        </DialogActions>
      </Dialog>


      {/* Payment Dialog */}
      <Dialog open={openPaymentDialog} onClose={handleClosePaymentDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Process Payment - {selectedOrderForPayment?.orderNumber}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>Payment Details</Typography>
              <Typography><strong>Customer:</strong> {selectedOrderForPayment?.customer?.firstName} {selectedOrderForPayment?.customer?.lastName} {selectedOrderForPayment?.customer?.isWalkIn ? '🚶' : ''}</Typography>
              <Typography><strong>Order Total:</strong> {formatCurrency(Number(selectedOrderForPayment?.total) || 0)}</Typography>
              <Typography><strong>Due Amount:</strong> {formatCurrency(orderDueAmount)}</Typography>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Payment Amount"
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                inputProps={{ min: 0, max: orderDueAmount, step: 0.01 }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">{getSettingValue('CURRENCY', 'USD')}</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  label="Payment Method"
                >
                  <MenuItem value="CASH">Cash</MenuItem>
                  <MenuItem value="CARD">Card</MenuItem>
                  <MenuItem value="BANK_TRANSFER">Bank Transfer</MenuItem>
                  <MenuItem value="CHECK">Check</MenuItem>
                  <MenuItem value="DIGITAL_WALLET">Digital Wallet</MenuItem>
                  <MenuItem value="BKASH">bKash</MenuItem>
                  <MenuItem value="OTHER">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePaymentDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmitPayment} 
            variant="contained" 
            disabled={paymentAmount <= 0 || paymentAmount > orderDueAmount}
          >
            Process Payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={openReceiptDialog} onClose={handleCloseReceiptDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          Print Receipt - {selectedOrderForReceipt?.orderNumber}
        </DialogTitle>
        <DialogContent>
          {selectedOrderForReceipt && (
            <OrderReceipt 
              order={selectedOrderForReceipt}
              dueAmount={orderDueAmounts[selectedOrderForReceipt.id]}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseReceiptDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for success/error notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default OrdersPage;  