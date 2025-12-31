import React, { useState, useEffect, useMemo } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  IconButton,
  Chip,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  TablePagination,
  Alert,
  Divider,
  Tooltip,
  Snackbar,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  ShoppingCart as CartIcon,
  LocalShipping as ShippingIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Payment as PaymentIcon
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { apiService } from '../services/api';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSettings } from '../hooks/useSettings';
import { useAuth } from '../hooks/useAuth';

// Types
interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplier: {
    id: string;
    name: string;
    company: string;
  };
  status: 'DRAFT' | 'SENT' | 'CONFIRMED' | 'PARTIAL_RECEIVED' | 'RECEIVED' | 'CANCELLED';
  orderDate: string;
  expectedDelivery?: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  paidAmount?: number;
  dueAmount?: number;
  notes?: string;
  items: PurchaseOrderItem[];
}

interface PurchaseOrderItem {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    sku: string;
  };
  quantity: number;
  unitPrice: number;
  total: number;
  receivedQuantity: number;
}

interface Supplier {
  id: string;
  name: string;
  company: string;
  isActive: boolean;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  basePrice: number;
  baseCostPrice: number;
  supplierId?: string;
  type: 'PHYSICAL' | 'SERVICE' | 'DIGITAL';
  hasInventory: boolean;
}

// Validation schema
const purchaseOrderSchema = yup.object({
  supplierId: yup.string().required('Supplier is required'),
  expectedDelivery: yup.string().optional(),
  notes: yup.string().optional()
});

const paymentSchema = yup.object({
  amount: yup.number().positive('Amount must be positive').required('Amount is required'),
  paymentMethod: yup.string().required('Payment method is required'),
  notes: yup.string().optional()
});

// Product selection interface
interface SelectedProduct {
  productId: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  total: number;
}

const PurchaseOrdersPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const selectedSupplierId = location.state?.selectedSupplierId;
  const { getSettingValue, formatCurrency } = useSettings();
  const { user } = useAuth();

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({ open: false, message: '', severity: 'success' });
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState<PurchaseOrder | null>(null);
  const [showProductSelection, setShowProductSelection] = useState(false);
  const [productTypeFilter, setProductTypeFilter] = useState<string>('ALL');
  const [purchaseMode, setPurchaseMode] = useState<'FULL' | 'QUICK'>('QUICK');
  const [submitting, setSubmitting] = useState(false);

  // Form for creating purchase orders
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({
    resolver: yupResolver(purchaseOrderSchema),
    defaultValues: {
      supplierId: selectedSupplierId || '',
      expectedDelivery: undefined,
      notes: ''
    }
  });

  // Payment form
  const {
    control: paymentControl,
    handleSubmit: handlePaymentSubmit,
    reset: resetPayment,
    formState: { errors: paymentErrors }
  } = useForm({
    resolver: yupResolver(paymentSchema),
    defaultValues: {
      amount: 0,
      paymentMethod: 'CASH',
      notes: ''
    }
  });

  // Fetch data
  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/purchase-orders');
      if (response.success && Array.isArray(response.data)) {
        setPurchaseOrders(response.data);
      } else if (Array.isArray(response)) {
        setPurchaseOrders(response);
      } else {
        setPurchaseOrders([]);
      }
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      showSnackbar('Failed to fetch purchase orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      // Fetch all suppliers including inactive ones for purchase orders
      const response = await apiService.get('/suppliers?includeInactive=true');
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

  const fetchProducts = async () => {
    try {
      // Fetch all products with high limit (including inactive for reordering purposes)
      const response = await apiService.get('/products?limit=1000');
      if (response.success && Array.isArray(response.data)) {
        setProducts(response.data);
      } else if (Array.isArray(response)) {
        setProducts(response);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    }
  };

  useEffect(() => {
    fetchPurchaseOrders();
    fetchSuppliers();
    fetchProducts();
  }, []);

  // Auto-open dialog when supplier is selected from suppliers page
  useEffect(() => {
    console.log('PurchaseOrdersPage useEffect - selectedSupplierId:', selectedSupplierId, 'suppliers.length:', suppliers.length);
    if (selectedSupplierId && suppliers.length > 0) {
      console.log('Opening purchase order dialog for supplier:', selectedSupplierId);
      // Reset form with selected supplier
      reset({
        supplierId: selectedSupplierId,
        expectedDelivery: undefined,
        notes: ''
      });
      // Open the dialog
      setOpenDialog(true);
    }
  }, [selectedSupplierId, suppliers, reset]);

  // Filtered data
  const filteredPurchaseOrders = useMemo(() => {
    if (!purchaseOrders || !Array.isArray(purchaseOrders)) {
      return [];
    }

    return purchaseOrders.filter(order => {
      if (!order) return false;

      const matchesSearch =
        order.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.supplier.company.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = filterStatus === 'all' || order.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [purchaseOrders, searchTerm, filterStatus]);

  // Handlers
  const handleOpenDialog = (order?: PurchaseOrder) => {
    if (order) {
      // For editing, still use the dialog
      setEditingOrder(order);
      reset({
        supplierId: order.supplierId,
        expectedDelivery: order.expectedDelivery ? new Date(order.expectedDelivery).toISOString().split('T')[0] : undefined,
        notes: order.notes || ''
      });
      
      // Load discount amount
      setDiscountAmount(order.discountAmount || 0);
      
      // Load existing items into selectedProducts
      const existingItems: SelectedProduct[] = order.items.map(item => {
        // Find the full product details from the products list
        const fullProduct = products.find(p => p.id === item.productId);
        return {
          productId: item.productId,
          product: fullProduct || {
            id: item.product.id,
            name: item.product.name,
            sku: item.product.sku,
            basePrice: 0,
            baseCostPrice: 0,
            type: 'PHYSICAL' as const,
            hasInventory: false
          },
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total
        };
      });
      setSelectedProducts(existingItems);
      setOpenDialog(true);
    } else {
      // For new orders, navigate to POS mode
      navigate('/purchase-orders/new', { 
        state: { selectedSupplierId: selectedSupplierId || '' } 
      });
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingOrder(null);
    setSelectedProducts([]);
    setShowProductSelection(false);
    setDiscountAmount(0);
    setProcessPaymentOnCreate(false);
    reset();
  };

  const handleViewDetails = (order: PurchaseOrder) => {
    setSelectedOrderDetails(order);
    setOpenDetailsDialog(true);
  };

  const handleCloseDetailsDialog = () => {
    setOpenDetailsDialog(false);
    setSelectedOrderDetails(null);
  };

  const handleAddProduct = (product: Product) => {
    const existingProduct = selectedProducts.find(p => p.productId === product.id);
    if (existingProduct) {
      // Update quantity
      const updatedProducts = selectedProducts.map(p => {
        if (p.productId === product.id) {
          const newQuantity = p.quantity + 1;
          const unitPrice = typeof p.unitPrice === 'number' ? p.unitPrice : parseFloat(p.unitPrice) || 0;
          return { ...p, quantity: newQuantity, total: newQuantity * unitPrice };
        }
        return p;
      });
      setSelectedProducts(updatedProducts);
    } else {
      // Add new product
      const unitPrice = product.baseCostPrice || product.basePrice || 0;
      const newProduct: SelectedProduct = {
        productId: product.id,
        product,
        quantity: 1,
        unitPrice: unitPrice,
        total: unitPrice
      };
      setSelectedProducts([...selectedProducts, newProduct]);
    }
  };

  const handleUpdateProductQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setSelectedProducts(selectedProducts.filter(p => p.productId !== productId));
      return;
    }

    const updatedProducts = selectedProducts.map(p => {
      if (p.productId === productId) {
        const unitPrice = typeof p.unitPrice === 'number' ? p.unitPrice : parseFloat(p.unitPrice) || 0;
        return { ...p, quantity, total: quantity * unitPrice };
      }
      return p;
    });
    setSelectedProducts(updatedProducts);
  };

  const handleUpdateProductPrice = (productId: string, unitPrice: number) => {
    const updatedProducts = selectedProducts.map(p => {
      if (p.productId === productId) {
        const quantity = typeof p.quantity === 'number' ? p.quantity : parseInt(p.quantity) || 0;
        return { ...p, unitPrice, total: quantity * unitPrice };
      }
      return p;
    });
    setSelectedProducts(updatedProducts);
  };

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter(p => p.productId !== productId));
  };

  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [processPaymentOnCreate, setProcessPaymentOnCreate] = useState<boolean>(false);
  const [paymentMethodOnCreate, setPaymentMethodOnCreate] = useState<string>('CASH');
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<PurchaseOrder | null>(null);

  const calculateTotals = () => {
    const subtotal = selectedProducts.reduce((sum, product) => {
      const productTotal = typeof product.total === 'number' ? product.total : parseFloat(product.total) || 0;
      return sum + productTotal;
    }, 0);

    const discount = discountAmount || 0;
    const taxableAmount = Math.max(0, subtotal - discount);
    
    // Get tax rate from settings, default to 8% if not set
    const taxRate = parseFloat(getSettingValue('TAXRATE', '0.08'));
    const taxAmount = taxableAmount * taxRate;
    const total = subtotal - discount + taxAmount;

    return { subtotal, discount, taxAmount, total, taxRate };
  };

  const handleCreateOrder = async (data: any) => {
    // Prevent double submission
    if (submitting) {
      return;
    }

    try {
      if (selectedProducts.length === 0) {
        showSnackbar('Please add at least one product to the purchase order', 'warning');
        return;
      }

      setSubmitting(true);

      // Generate PO number
      const poNumber = `PO-${Date.now()}`;

      // Calculate totals
      const { subtotal, discount, taxAmount, total } = calculateTotals();

      // Convert selected products to items format
      const items = selectedProducts.map(product => ({
        productId: product.productId,
        quantity: product.quantity,
        unitPrice: product.unitPrice,
        total: product.total,
        notes: ''
      }));

      const purchaseOrderData = {
        ...data,
        poNumber,
        status: purchaseMode === 'QUICK' ? 'RECEIVED' : 'DRAFT', // Quick mode goes directly to received
        purchaseMode, // Send the purchase mode to backend
        subtotal,
        taxAmount,
        discountAmount: discount,
        total,
        items
      };

      const response = await apiService.post('/purchase-orders', purchaseOrderData);
      const createdOrder = response.data || response;
      
      // If process payment is enabled, process payment after order creation
      if (processPaymentOnCreate && createdOrder) {
        const orderId = typeof createdOrder === 'string' ? createdOrder : (createdOrder.id || createdOrder);
        
        try {
          await apiService.post('/supplier-payments/payments', {
            purchaseOrderId: orderId,
            amount: total,
            paymentMethod: paymentMethodOnCreate,
            notes: `Payment processed with purchase order creation`,
            userId: user?.id || 'cmg3r4eww0011uogxzfadd5lk'
          });
          showSnackbar('Purchase order created and payment processed successfully!', 'success');
        } catch (paymentError: any) {
          console.error('Payment processing error:', paymentError);
          showSnackbar('Purchase order created, but payment processing failed', 'warning');
        }
      } else {
        showSnackbar('Purchase order created successfully!', 'success');
      }
      
      handleCloseDialog();
      setDiscountAmount(0);
      setProcessPaymentOnCreate(false);
      fetchPurchaseOrders();
    } catch (error) {
      console.error('Error creating purchase order:', error);
      showSnackbar('Failed to create purchase order', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateOrder = async (data: any) => {
    try {
      if (!editingOrder) return;

      // Calculate totals
      const { subtotal, discount, taxAmount, total } = calculateTotals();

      // Convert selected products to items format
      const items = selectedProducts.map(product => ({
        productId: product.productId,
        quantity: product.quantity,
        unitPrice: product.unitPrice,
        total: product.total,
        notes: ''
      }));

      const updateData = {
        ...data,
        subtotal,
        taxAmount,
        discountAmount: discount,
        total,
        items
      };

      await apiService.put(`/purchase-orders/${editingOrder.id}`, updateData);
      handleCloseDialog();
      fetchPurchaseOrders();
      showSnackbar('Purchase order updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating purchase order:', error);
      showSnackbar('Failed to update purchase order', 'error');
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (window.confirm('Are you sure you want to delete this purchase order?')) {
      try {
        await apiService.delete(`/purchase-orders/${orderId}`);
        fetchPurchaseOrders();
        showSnackbar('Purchase order deleted successfully!', 'success');
      } catch (error) {
        console.error('Error deleting purchase order:', error);
        showSnackbar('Failed to delete purchase order', 'error');
      }
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const response = await apiService.patch(`/purchase-orders/${id}/status`, { status: newStatus });
      if (response && response.success) {
        showSnackbar(`Purchase order status updated to ${newStatus.replace('_', ' ')}`, 'success');
        fetchPurchaseOrders();
      } else {
        showSnackbar('Failed to update purchase order status', 'error');
      }
    } catch (error) {
      console.error('Error updating purchase order status:', error);
      showSnackbar('Failed to update purchase order status', 'error');
    }
  };

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case 'DRAFT': return 'SENT';
      case 'SENT': return 'CONFIRMED';
      case 'CONFIRMED': return 'PARTIAL_RECEIVED';
      case 'PARTIAL_RECEIVED': return 'RECEIVED';
      default: return null;
    }
  };

  const getNextStatusLabel = (currentStatus: string) => {
    switch (currentStatus) {
      case 'DRAFT': return 'Send to Supplier';
      case 'SENT': return 'Mark as Confirmed';
      case 'CONFIRMED': return 'Mark as Partially Received';
      case 'PARTIAL_RECEIVED': return 'Mark as Fully Received';
      default: return null;
    }
  };

  const canCancel = (currentStatus: string) => {
    return ['DRAFT', 'SENT', 'CONFIRMED'].includes(currentStatus);
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'default';
      case 'SENT': return 'info';
      case 'CONFIRMED': return 'warning';
      case 'PARTIAL_RECEIVED': return 'primary';
      case 'RECEIVED': return 'success';
      case 'CANCELLED': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DRAFT': return <CartIcon />;
      case 'SENT': return <ShippingIcon />;
      case 'CONFIRMED': return <CheckIcon />;
      case 'PARTIAL_RECEIVED': return <CheckIcon />;
      case 'RECEIVED': return <CheckIcon />;
      case 'CANCELLED': return <CancelIcon />;
      default: return <CartIcon />;
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  // Payment handlers
  const handleOpenPaymentDialog = (order: PurchaseOrder) => {
    setPaymentOrder(order);
    resetPayment({
      amount: parseFloat(order.dueAmount?.toString() || '0'),
      paymentMethod: 'CASH',
      notes: ''
    });
    setOpenPaymentDialog(true);
  };

  const handleClosePaymentDialog = () => {
    setOpenPaymentDialog(false);
    setPaymentOrder(null);
    resetPayment();
  };

  const handleRecordPayment = async (data: any) => {
    if (!paymentOrder) return;

    try {
      const response = await apiService.post('/supplier-payments/payments', {
        purchaseOrderId: paymentOrder.id,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        notes: data.notes,
        userId: user?.id || 'cmg3r4eww0011uogxzfadd5lk' // Super Admin as fallback
      });

      if (response.success) {
        showSnackbar('Payment recorded successfully', 'success');
        handleClosePaymentDialog();
        fetchPurchaseOrders(); // Refresh the list
      } else {
        showSnackbar('Failed to record payment', 'error');
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      showSnackbar('Failed to record payment', 'error');
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Purchase Orders
      </Typography>

      {/* Search and Filter */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              placeholder="Search purchase orders..."
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
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="DRAFT">Draft</MenuItem>
                <MenuItem value="SENT">Sent</MenuItem>
                <MenuItem value="CONFIRMED">Confirmed</MenuItem>
                <MenuItem value="PARTIAL_RECEIVED">Partial Received</MenuItem>
                <MenuItem value="RECEIVED">Received</MenuItem>
                <MenuItem value="CANCELLED">Cancelled</MenuItem>
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
              New Purchase Order
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Purchase Orders Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>PO Number</TableCell>
              <TableCell>Supplier</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Order Date</TableCell>
              <TableCell>Expected Delivery</TableCell>
              <TableCell>Total</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography>Loading purchase orders...</Typography>
                </TableCell>
              </TableRow>
            ) : filteredPurchaseOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography>No purchase orders found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredPurchaseOrders
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Typography variant="subtitle2">{order.poNumber}</Typography>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">{order.supplier.name}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          {order.supplier.company}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(order.status)}
                        label={order.status.replace('_', ' ')}
                        color={getStatusColor(order.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(order.orderDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {order.expectedDelivery
                        ? new Date(order.expectedDelivery).toLocaleDateString()
                        : 'Not set'
                      }
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {formatCurrency(Number(order.total) || 0)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => handleViewDetails(order)}
                            color="info"
                          >
                            <SearchIcon />
                          </IconButton>
                        </Tooltip>
                        {getNextStatus(order.status) && (
                          <Tooltip title={getNextStatusLabel(order.status)}>
                            <Button
                              size="small"
                              variant="contained"
                              color="primary"
                              onClick={() => handleUpdateStatus(order.id, getNextStatus(order.status)!)}
                              sx={{ minWidth: 'auto', px: 1, fontSize: '0.75rem' }}
                            >
                              {getNextStatusLabel(order.status)}
                            </Button>
                          </Tooltip>
                        )}
                        {canCancel(order.status) && (
                          <Tooltip title="Cancel Purchase Order">
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              onClick={() => {
                                if (window.confirm('Are you sure you want to cancel this purchase order?')) {
                                  handleUpdateStatus(order.id, 'CANCELLED');
                                }
                              }}
                              sx={{ minWidth: 'auto', px: 1, fontSize: '0.75rem' }}
                            >
                              Cancel
                            </Button>
                          </Tooltip>
                        )}
                        {parseFloat(order.dueAmount?.toString() || '0') > 0 && (
                          <Tooltip title="Record Payment">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenPaymentDialog(order)}
                              color="primary"
                            >
                              <PaymentIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(order)}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteOrder(order.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredPurchaseOrders.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </TableContainer>

      {/* Purchase Order Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingOrder ? 'Edit Purchase Order' : 'Create New Purchase Order'}
        </DialogTitle>
        <form onSubmit={handleSubmit(editingOrder ? handleUpdateOrder : handleCreateOrder)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="supplierId"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.supplierId}>
                      <InputLabel>Supplier *</InputLabel>
                      <Select {...field} label="Supplier *">
                        {suppliers.map((supplier) => (
                          <MenuItem key={supplier.id} value={supplier.id}>
                            {supplier.name} - {supplier.company}
                            {!supplier.isActive && ' (Inactive)'}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="expectedDelivery"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Expected Delivery"
                      type="date"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
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
                      label="Notes"
                      multiline
                      rows={3}
                      fullWidth
                    />
                  )}
                />
              </Grid>
            </Grid>

            {/* Purchase Mode Selection */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Purchase Mode
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant={purchaseMode === 'FULL' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setPurchaseMode('FULL')}
                >
                  Full Purchase Order
                </Button>
                <Button
                  variant={purchaseMode === 'QUICK' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setPurchaseMode('QUICK')}
                >
                  Quick Purchase
                </Button>
              </Box>
              <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                {purchaseMode === 'FULL'
                  ? 'Full workflow: Draft → Sent → Confirmed → Received (for printing items)'
                  : 'Quick workflow: Direct to Received (for office supplies, etc.)'
                }
              </Typography>
            </Box>

            {/* Product Selection Section */}
            <Divider sx={{ my: 3 }}>
              <Typography variant="h6">Products</Typography>
            </Divider>

            {/* Add Product Button and Filter */}
            <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setShowProductSelection(!showProductSelection)}
                sx={{ flex: 1 }}
              >
                {showProductSelection ? 'Hide Product Selection' : 'Add Products'}
              </Button>

              {showProductSelection && (
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Product Type</InputLabel>
                  <Select
                    value={productTypeFilter}
                    label="Product Type"
                    onChange={(e) => setProductTypeFilter(e.target.value)}
                  >
                    <MenuItem value="ALL">All Products</MenuItem>
                    <MenuItem value="PHYSICAL">Physical Items</MenuItem>
                    <MenuItem value="SERVICE">Services</MenuItem>
                    <MenuItem value="DIGITAL">Digital Products</MenuItem>
                  </Select>
                </FormControl>
              )}
            </Box>

            {/* Product Selection Grid */}
            {showProductSelection && (
              <Grid container spacing={2} sx={{ mb: 3 }}>
                {products
                  .filter(product =>
                    productTypeFilter === 'ALL' || product.type === productTypeFilter
                  )
                  .map((product) => (
                    <Grid item xs={12} sm={6} md={4} key={product.id}>
                      <Card
                        variant="outlined"
                        sx={{
                          cursor: 'pointer',
                          '&:hover': { backgroundColor: 'action.hover' }
                        }}
                        onClick={() => handleAddProduct(product)}
                      >
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Typography variant="subtitle1" noWrap sx={{ flex: 1 }}>
                              {product.name}
                            </Typography>
                            <Chip
                              label={product.type}
                              size="small"
                              color={
                                product.type === 'PHYSICAL' ? 'primary' :
                                  product.type === 'SERVICE' ? 'secondary' : 'default'
                              }
                            />
                          </Box>
                          <Typography variant="body2" color="textSecondary">
                            SKU: {product.sku}
                          </Typography>
                          <Typography variant="body2" color="primary">
                            Cost: {formatCurrency(product.baseCostPrice || product.basePrice || 0)}
                          </Typography>
                          {product.type === 'PHYSICAL' && product.hasInventory && (
                            <Typography variant="caption" color="success.main">
                              ✓ Inventory Tracked
                            </Typography>
                          )}
                          {product.type === 'SERVICE' && (
                            <Typography variant="caption" color="info.main">
                              ⚡ Service Item
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
              </Grid>
            )}

            {/* Selected Products Table */}
            {selectedProducts.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Selected Products ({selectedProducts.length})
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Product</TableCell>
                        <TableCell>SKU</TableCell>
                        <TableCell>Quantity</TableCell>
                        <TableCell>Unit Price</TableCell>
                        <TableCell>Total</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedProducts.map((selectedProduct) => (
                        <TableRow key={selectedProduct.productId}>
                          <TableCell>
                            <Typography variant="body2">
                              {selectedProduct.product.name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="textSecondary">
                              {selectedProduct.product.sku}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <TextField
                              type="number"
                              size="small"
                              value={selectedProduct.quantity}
                              onChange={(e) => handleUpdateProductQuantity(
                                selectedProduct.productId,
                                parseInt(e.target.value) || 0
                              )}
                              inputProps={{ min: 1 }}
                              sx={{ width: 80 }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              type="number"
                              size="small"
                              value={selectedProduct.unitPrice}
                              onChange={(e) => handleUpdateProductPrice(
                                selectedProduct.productId,
                                parseFloat(e.target.value) || 0
                              )}
                              inputProps={{ min: 0, step: 0.01 }}
                              sx={{ width: 100 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold">
                              {formatCurrency(typeof selectedProduct.total === 'number' ? selectedProduct.total : parseFloat(selectedProduct.total) || 0)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveProduct(selectedProduct.productId)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Discount Field */}
                <Box sx={{ mt: 2, mb: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Discount Amount"
                    type="number"
                    value={discountAmount}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      setDiscountAmount(Math.max(0, value));
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">৳</InputAdornment>
                      ),
                    }}
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                </Box>

                {/* Process Payment Checkbox */}
                <Box sx={{ mb: 2 }}>
                  <FormControl fullWidth>
                    <Box display="flex" alignItems="center" gap={1}>
                      <input
                        type="checkbox"
                        checked={processPaymentOnCreate}
                        onChange={(e) => setProcessPaymentOnCreate(e.target.checked)}
                        style={{ width: 18, height: 18 }}
                      />
                      <Typography variant="body2">
                        Process payment with purchase
                      </Typography>
                    </Box>
                    {processPaymentOnCreate && (
                      <FormControl fullWidth sx={{ mt: 1 }}>
                        <InputLabel size="small">Payment Method</InputLabel>
                        <Select
                          value={paymentMethodOnCreate}
                          onChange={(e) => setPaymentMethodOnCreate(e.target.value)}
                          label="Payment Method"
                          size="small"
                        >
                          <MenuItem value="CASH">Cash</MenuItem>
                          <MenuItem value="BANK_TRANSFER">Bank Transfer</MenuItem>
                          <MenuItem value="CHECK">Check</MenuItem>
                          <MenuItem value="BKASH">bKash</MenuItem>
                          <MenuItem value="OTHER">Other</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  </FormControl>
                </Box>

                {/* Order Summary */}
                <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2">Subtotal:</Typography>
                    </Grid>
                    <Grid item xs={6} sx={{ textAlign: 'right' }}>
                      <Typography variant="body2">{formatCurrency(calculateTotals().subtotal)}</Typography>
                    </Grid>
                    {discountAmount > 0 && (
                      <>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="error">Discount:</Typography>
                        </Grid>
                        <Grid item xs={6} sx={{ textAlign: 'right' }}>
                          <Typography variant="body2" color="error">-{formatCurrency(calculateTotals().discount)}</Typography>
                        </Grid>
                      </>
                    )}
                    <Grid item xs={6}>
                      <Typography variant="body2">Tax ({(calculateTotals().taxRate * 100).toFixed(1)}%):</Typography>
                    </Grid>
                    <Grid item xs={6} sx={{ textAlign: 'right' }}>
                      <Typography variant="body2">{formatCurrency(calculateTotals().taxAmount)}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="h6">Total:</Typography>
                    </Grid>
                    <Grid item xs={6} sx={{ textAlign: 'right' }}>
                      <Typography variant="h6" color="primary">
                        {formatCurrency(calculateTotals().total)}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} disabled={submitting}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  {editingOrder ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                editingOrder ? 'Update' : 'Create'
              )} Purchase Order
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Purchase Order Details Dialog */}
      <Dialog open={openDetailsDialog} onClose={handleCloseDetailsDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          Purchase Order Details - {selectedOrderDetails?.poNumber}
        </DialogTitle>
        <DialogContent>
          {selectedOrderDetails && (
            <Box>
              {/* Order Information */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Supplier</Typography>
                  <Typography variant="body1">{selectedOrderDetails.supplier.name}</Typography>
                  <Typography variant="body2" color="textSecondary">{selectedOrderDetails.supplier.company}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Status</Typography>
                  <Chip
                    icon={getStatusIcon(selectedOrderDetails.status)}
                    label={selectedOrderDetails.status.replace('_', ' ')}
                    color={getStatusColor(selectedOrderDetails.status) as any}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Order Date</Typography>
                  <Typography variant="body1">
                    {new Date(selectedOrderDetails.orderDate).toLocaleDateString()}
                  </Typography>
                </Grid>
                {selectedOrderDetails.expectedDelivery && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary">Expected Delivery</Typography>
                    <Typography variant="body1">
                      {new Date(selectedOrderDetails.expectedDelivery).toLocaleDateString()}
                    </Typography>
                  </Grid>
                )}
              </Grid>

              <Divider sx={{ my: 2 }} />

              {/* Items Table */}
              <Typography variant="h6" sx={{ mb: 2 }}>Items ({selectedOrderDetails.items.length})</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell>SKU</TableCell>
                      <TableCell align="right">Quantity</TableCell>
                      <TableCell align="right">Unit Price</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell align="right">Received</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedOrderDetails.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Typography variant="body2">{item.product.name}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="textSecondary">{item.product.sku}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">{item.quantity}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">{formatCurrency(item.unitPrice)}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="bold">
                            {formatCurrency(item.total)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {item.receivedQuantity || 0} / {item.quantity}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Order Summary */}
              <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2">Subtotal:</Typography>
                  </Grid>
                  <Grid item xs={6} sx={{ textAlign: 'right' }}>
                    <Typography variant="body2">{formatCurrency(selectedOrderDetails.subtotal)}</Typography>
                  </Grid>
                  {selectedOrderDetails.discountAmount > 0 && (
                    <>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="error">Discount:</Typography>
                      </Grid>
                      <Grid item xs={6} sx={{ textAlign: 'right' }}>
                        <Typography variant="body2" color="error">
                          -{formatCurrency(selectedOrderDetails.discountAmount)}
                        </Typography>
                      </Grid>
                    </>
                  )}
                  <Grid item xs={6}>
                    <Typography variant="body2">Tax:</Typography>
                  </Grid>
                  <Grid item xs={6} sx={{ textAlign: 'right' }}>
                    <Typography variant="body2">{formatCurrency(selectedOrderDetails.taxAmount)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="h6">Total:</Typography>
                  </Grid>
                  <Grid item xs={6} sx={{ textAlign: 'right' }}>
                    <Typography variant="h6" color="primary">
                      {formatCurrency(selectedOrderDetails.total)}
                    </Typography>
                  </Grid>
                  {selectedOrderDetails.paidAmount !== undefined && (
                    <>
                      <Grid item xs={6}>
                        <Typography variant="body2">Paid:</Typography>
                      </Grid>
                      <Grid item xs={6} sx={{ textAlign: 'right' }}>
                        <Typography variant="body2" color="success.main">
                          {formatCurrency(selectedOrderDetails.paidAmount || 0)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="error">Due:</Typography>
                      </Grid>
                      <Grid item xs={6} sx={{ textAlign: 'right' }}>
                        <Typography variant="body2" color="error" fontWeight="bold">
                          {formatCurrency(selectedOrderDetails.dueAmount || 0)}
                        </Typography>
                      </Grid>
                    </>
                  )}
                </Grid>
              </Box>

              {selectedOrderDetails.notes && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>Notes</Typography>
                  <Typography variant="body2">{selectedOrderDetails.notes}</Typography>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetailsDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={openPaymentDialog} onClose={handleClosePaymentDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Record Payment - {paymentOrder?.poNumber}
        </DialogTitle>
        <form onSubmit={handlePaymentSubmit(handleRecordPayment)}>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Typography variant="body2" color="textSecondary">
                  Supplier: {paymentOrder?.supplier?.name}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Total Amount: {formatCurrency(parseFloat(paymentOrder?.total?.toString() || '0'))}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Already Paid: {formatCurrency(parseFloat(paymentOrder?.paidAmount?.toString() || '0'))}
                </Typography>
                <Typography variant="body2" color="error">
                  Due Amount: {formatCurrency(parseFloat(paymentOrder?.dueAmount?.toString() || '0'))}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="amount"
                  control={paymentControl}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Payment Amount *"
                      type="number"
                      fullWidth
                      error={!!paymentErrors.amount}
                      helperText={paymentErrors.amount?.message}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">৳</InputAdornment>
                      }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="paymentMethod"
                  control={paymentControl}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!paymentErrors.paymentMethod}>
                      <InputLabel>Payment Method *</InputLabel>
                      <Select {...field} label="Payment Method *">
                        <MenuItem value="CASH">Cash</MenuItem>
                        <MenuItem value="BANK_TRANSFER">Bank Transfer</MenuItem>
                        <MenuItem value="CHECK">Check</MenuItem>
                        <MenuItem value="BKASH">bKash</MenuItem>
                        <MenuItem value="OTHER">Other</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="notes"
                  control={paymentControl}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Notes"
                      multiline
                      rows={3}
                      fullWidth
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClosePaymentDialog}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">
              Record Payment
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PurchaseOrdersPage;
