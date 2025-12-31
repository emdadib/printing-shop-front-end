import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  Paper,
  IconButton,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Divider,
  List,
  ListItem,
  Alert,
  Snackbar,
  Badge,
  Autocomplete,
  Checkbox,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
} from '@mui/material';
import {
  Add,
  Remove,
  Search,
  ShoppingCart,
  Close,
  Delete,
  LocalShipping,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { apiService } from '../services/api';
import { useSettings } from '../hooks/useSettings';
import { useAuth } from '../hooks/useAuth';

interface Product {
  id: string;
  name: string;
  sku: string;
  basePrice: number;
  baseCostPrice: number;
  category: {
    id: string;
    name: string;
  };
  type: string;
  hasInventory: boolean;
  hasWarranty: boolean;
}

interface Supplier {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  isActive: boolean;
}

interface CartItem {
  productId: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  total: number;
}

const purchaseOrderSchema = yup.object({
  supplierId: yup.string().required('Supplier is required'),
  expectedDelivery: yup.string().optional(),
  notes: yup.string(),
});

const PurchaseOrderPOSPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedSupplierId = location.state?.selectedSupplierId;
  const { formatCurrency, getSettingValue } = useSettings();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [productTypeFilter, setProductTypeFilter] = useState<string>('ALL');
  const [purchaseMode, setPurchaseMode] = useState<'FULL' | 'QUICK'>('QUICK');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [processPayment, setProcessPayment] = useState<boolean>(true);
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [openPaymentConfirmDialog, setOpenPaymentConfirmDialog] = useState(false);
  const [purchaseOrderToPay, setPurchaseOrderToPay] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({ open: false, message: '', severity: 'success' });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(purchaseOrderSchema),
    defaultValues: {
      supplierId: selectedSupplierId || '',
      expectedDelivery: undefined,
      notes: '',
    },
  });

  useEffect(() => {
    fetchProducts();
    fetchSuppliers();
  }, []);

  useEffect(() => {
    if (selectedSupplierId) {
      reset({
        supplierId: selectedSupplierId,
        expectedDelivery: undefined,
        notes: '',
      });
    }
  }, [selectedSupplierId, reset]);

  const fetchProducts = async () => {
    try {
      const response = await apiService.get('/products?limit=1000&isActive=true');
      if (response.success && Array.isArray(response.data)) {
        setProducts(response.data);
      } else if (Array.isArray(response)) {
        setProducts(response);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error('Products fetch error:', err);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await apiService.get('/suppliers?includeInactive=true');
      if (response.success && Array.isArray(response.data)) {
        setSuppliers(response.data);
      } else if (Array.isArray(response)) {
        setSuppliers(response);
      } else {
        setSuppliers([]);
      }
    } catch (err) {
      console.error('Suppliers fetch error:', err);
    }
  };

  const categories = useMemo(() => {
    const uniqueCategories = new Map<string, { id: string; name: string }>();
    products.forEach((product) => {
      if (product.category) {
        uniqueCategories.set(product.category.id, product.category);
      }
    });
    return Array.from(uniqueCategories.values());
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(productSearchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'ALL' || product.category?.id === categoryFilter;
      const matchesType = productTypeFilter === 'ALL' || product.type === productTypeFilter;
      return matchesSearch && matchesCategory && matchesType;
    });
  }, [products, productSearchTerm, categoryFilter, productTypeFilter]);

  const addToCart = (product: Product) => {
    const existingItem = cart.find((item) => item.productId === product.id);
    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                total: (item.quantity + 1) * item.unitPrice,
              }
            : item
        )
      );
    } else {
      // Use product's actual cost price, fallback to base price, minimum 1
      const unitPrice = Math.max(1, product.baseCostPrice || product.basePrice || 1);
      setCart([
        ...cart,
        {
          productId: product.id,
          product,
          quantity: 1,
          unitPrice: unitPrice,
          total: unitPrice,
        },
      ]);
    }
    showSnackbar(`${product.name} added to cart`, 'success');
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    // Ensure quantity is always an integer and at least 1
    const qty = Math.max(1, Math.floor(quantity));
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(
      cart.map((item) =>
        item.productId === productId
          ? { ...item, quantity: qty, total: qty * item.unitPrice }
          : item
      )
    );
  };

  const updateCartPrice = (productId: string, price: number) => {
    // Ensure price is always an integer and at least 1
    const rate = Math.max(1, Math.floor(price));
    setCart(
      cart.map((item) =>
        item.productId === productId
          ? { ...item, unitPrice: rate, total: item.quantity * rate }
          : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.productId !== productId));
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateDiscount = () => {
    return discountAmount || 0;
  };

  const calculateTax = () => {
    const subtotal = calculateSubtotal();
    const discount = calculateDiscount();
    const taxableAmount = Math.max(0, subtotal - discount);
    const taxRate = parseFloat(getSettingValue('TAXRATE', '0.08'));
    return taxableAmount * taxRate;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = calculateDiscount();
    const tax = calculateTax();
    return subtotal - discount + tax;
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleConfirmPayment = async () => {
    if (!purchaseOrderToPay) return;

    try {
      setLoading(true);
      const response = await apiService.post('/supplier-payments/payments', {
        purchaseOrderId: purchaseOrderToPay.id,
        amount: purchaseOrderToPay.total,
        paymentMethod: paymentMethod,
        notes: `Payment processed with purchase order creation`,
        userId: user?.id || 'cmg3r4eww0011uogxzfadd5lk'
      });

      if (response.success) {
        showSnackbar('Purchase order created and payment processed successfully!', 'success');
        setOpenPaymentConfirmDialog(false);
        setPurchaseOrderToPay(null);
        
        // Reset form and cart
        setCart([]);
        setDiscountAmount(0);
        setProcessPayment(false);
        reset({
          supplierId: selectedSupplierId || '',
          expectedDelivery: undefined,
          notes: '',
        });
        
        // Navigate back after a short delay
        setTimeout(() => {
          navigate('/purchase-orders');
        }, 1000);
      } else {
        showSnackbar('Payment processing failed', 'error');
      }
    } catch (error: any) {
      console.error('Error processing payment:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to process payment';
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPayment = () => {
    setOpenPaymentConfirmDialog(false);
    setPurchaseOrderToPay(null);
    showSnackbar('Purchase order created successfully!', 'success');
    
    // Reset form and cart
    setCart([]);
    setDiscountAmount(0);
    setProcessPayment(false);
    reset({
      supplierId: selectedSupplierId || '',
      expectedDelivery: undefined,
      notes: '',
    });
    
    // Navigate back after a short delay
    setTimeout(() => {
      navigate('/purchase-orders');
    }, 1000);
  };

  const onSubmit = async (data: any) => {
    if (loading) {
      return;
    }

    if (cart.length === 0) {
      showSnackbar('Please add at least one item to the cart', 'warning');
      return;
    }

    try {
      setLoading(true);
      const poNumber = `PO-${Date.now()}`;
      const subtotal = calculateSubtotal();
      const discount = calculateDiscount();
      const taxAmount = calculateTax();
      const total = calculateTotal();

      const purchaseOrderData = {
        ...data,
        poNumber,
        status: purchaseMode === 'QUICK' ? 'RECEIVED' : 'DRAFT',
        purchaseMode,
        subtotal,
        taxAmount,
        discountAmount: discount,
        total,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
          notes: '',
        })),
      };

      const response = await apiService.post('/purchase-orders', purchaseOrderData);
      const createdOrder = response.data || response;
      
      // If process payment is enabled, process payment after order creation
      if (processPayment && createdOrder) {
        const orderId = typeof createdOrder === 'string' ? createdOrder : (createdOrder.id || createdOrder);
        const orderTotal = total;
        
        // Show confirmation dialog
        setPurchaseOrderToPay({
          id: orderId,
          poNumber,
          total: orderTotal,
          supplier: suppliers.find(s => s.id === data.supplierId)
        });
        setOpenPaymentConfirmDialog(true);
        // Don't reset or navigate here - let the payment dialog handle it
      } else {
        showSnackbar('Purchase order created successfully!', 'success');
        
        // Reset form and cart
        setCart([]);
        setDiscountAmount(0);
        setProcessPayment(false);
        reset({
          supplierId: selectedSupplierId || '',
          expectedDelivery: undefined,
          notes: '',
        });
        
        // Navigate back after a short delay
        setTimeout(() => {
          navigate('/purchase-orders');
        }, 1000);
      }
    } catch (err: any) {
      console.error('Purchase order creation error:', err);
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to create purchase order';
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <Paper sx={{ p: 2, borderRadius: 0, boxShadow: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={2}>
            <Button
              variant="outlined"
              startIcon={<Close />}
              onClick={() => navigate('/purchase-orders')}
              size="small"
            >
              Close
            </Button>
            <Typography variant="h5" fontWeight="bold">
              New Purchase Order
            </Typography>
          </Box>
          <Badge badgeContent={cart.length} color="primary">
            <ShoppingCart fontSize="large" />
          </Badge>
        </Box>
      </Paper>

      {/* Main Content */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Side - Products */}
        <Box sx={{ width: '65%', display: 'flex', flexDirection: 'column', borderRight: 1, borderColor: 'divider' }}>
          {/* Product Search and Filters */}
          <Paper sx={{ p: 2, borderRadius: 0, boxShadow: 1 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search products..."
                  value={productSearchTerm}
                  onChange={(e) => setProductSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    label="Category"
                  >
                    <MenuItem value="ALL">All Categories</MenuItem>
                    {categories.map((category) => (
                      <MenuItem key={category.id} value={category.id}>
                        {category.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={productTypeFilter}
                    onChange={(e) => setProductTypeFilter(e.target.value)}
                    label="Type"
                  >
                    <MenuItem value="ALL">All Types</MenuItem>
                    <MenuItem value="PHYSICAL">Physical</MenuItem>
                    <MenuItem value="SERVICE">Service</MenuItem>
                    <MenuItem value="DIGITAL">Digital</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={2}>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  {filteredProducts.length} products
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* Product Grid */}
          <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            <Grid container spacing={2}>
              {filteredProducts.map((product) => (
                <Grid item xs={12} sm={6} md={4} key={product.id}>
                  <Card
                    variant="outlined"
                    sx={{
                      cursor: 'pointer',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'all 0.2s',
                      '&:hover': {
                        backgroundColor: 'action.hover',
                        transform: 'translateY(-2px)',
                        boxShadow: 3,
                      },
                    }}
                    onClick={() => addToCart(product)}
                  >
                    <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                        <Typography variant="h6" sx={{ flex: 1, fontSize: '1rem' }} noWrap>
                          {product.name}
                        </Typography>
                        <Chip
                          label={product.type}
                          size="small"
                          color={
                            product.type === 'PHYSICAL'
                              ? 'primary'
                              : product.type === 'SERVICE'
                              ? 'secondary'
                              : 'default'
                          }
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        SKU: {product.sku}
                      </Typography>
                      {product.category && (
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
                          {product.category.name}
                        </Typography>
                      )}
                      <Box sx={{ mt: 'auto', pt: 1 }}>
                        <Typography variant="h6" color="primary" fontWeight="bold">
                          {formatCurrency(product.baseCostPrice || product.basePrice || 0)}
                        </Typography>
                        {product.hasInventory && (
                          <Typography variant="caption" color="success.main">
                            ✓ In Stock
                          </Typography>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
            {filteredProducts.length === 0 && (
              <Box textAlign="center" py={4}>
                <Typography variant="h6" color="text.secondary">
                  No products found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Try adjusting your search or filters
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        {/* Right Side - Cart & Order Summary */}
        <Box sx={{ width: '35%', display: 'flex', flexDirection: 'column', bgcolor: 'grey.50' }}>
          <Paper sx={{ p: 2, borderRadius: 0, boxShadow: 1 }}>
            <Typography variant="h6" gutterBottom>
              Purchase Order Summary
            </Typography>
            
            {/* Supplier, Purchase Mode, and Expected Delivery in one row */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              {/* Supplier Selection */}
              <Grid item xs={12} sm={5}>
                <Controller
                  name="supplierId"
                  control={control}
                  render={({ field }) => (
                    <Autocomplete
                      options={suppliers}
                      getOptionLabel={(option) => `${option.name}${option.company ? ` - ${option.company}` : ''}${option.email ? ` (${option.email})` : ''}`}
                      filterOptions={(options, { inputValue }) => {
                        const searchTerm = inputValue.toLowerCase();
                        return options.filter((option) =>
                          option.name.toLowerCase().includes(searchTerm) ||
                          option.company.toLowerCase().includes(searchTerm) ||
                          option.email.toLowerCase().includes(searchTerm) ||
                          option.phone.toLowerCase().includes(searchTerm)
                        );
                      }}
                      value={suppliers.find((s) => s.id === field.value) || null}
                      onChange={(_, newValue) => {
                        field.onChange(newValue ? newValue.id : '');
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Supplier *"
                          size="small"
                          error={!!errors.supplierId}
                          helperText={errors.supplierId?.message}
                          placeholder="Search supplier..."
                        />
                      )}
                      noOptionsText="No suppliers found"
                    />
                  )}
                />
              </Grid>

              {/* Purchase Mode */}
              <Grid item xs={12} sm={3}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={purchaseMode === 'QUICK'}
                      onChange={(e) => setPurchaseMode(e.target.checked ? 'QUICK' : 'FULL')}
                      size="small"
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                      {purchaseMode === 'QUICK' ? 'Quick Mode' : 'Full PO Mode'}
                    </Typography>
                  }
                  sx={{ alignItems: 'center', mt: 0.5 }}
                />
              </Grid>

              {/* Expected Delivery */}
              <Grid item xs={12} sm={4}>
                <Controller
                  name="expectedDelivery"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      size="small"
                      label="Expected Delivery"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Cart Items */}
          <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            {cart.length === 0 ? (
              <Box textAlign="center" py={4}>
                <ShoppingCart sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  Cart is empty
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Click on products to add them to cart
                </Typography>
              </Box>
            ) : (
              <List>
                {cart.map((item) => (
                  <ListItem
                    key={item.productId}
                    divider
                    sx={{
                      bgcolor: 'background.paper',
                      mb: 1,
                      borderRadius: 1,
                      border: 1,
                      borderColor: 'divider',
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 1,
                      py: 1,
                      px: 1.5,
                    }}
                  >
                    {/* Product Name - Takes most space */}
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: 'bold',
                        flex: 1,
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        mr: 1
                      }}
                    >
                      {item.product.name}
                    </Typography>

                    {/* Quantity Controls */}
                    <Box display="flex" alignItems="center" gap={0.5} sx={{ flexShrink: 0 }}>
                      <IconButton
                        size="small"
                        onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}
                        sx={{ p: 0.5 }}
                      >
                        <Remove fontSize="small" />
                      </IconButton>
                      <TextField
                        type="number"
                        value={item.quantity}
                        onChange={(e) => {
                          const qty = parseInt(e.target.value) || 1;
                          updateCartQuantity(item.productId, qty);
                        }}
                        inputProps={{ 
                          min: 1,
                          step: 1,
                          style: { textAlign: 'center', padding: '4px 8px', width: '40px' }
                        }}
                        size="small"
                        sx={{ width: 60 }}
                        variant="outlined"
                      />
                      <IconButton
                        size="small"
                        onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}
                        sx={{ p: 0.5 }}
                      >
                        <Add fontSize="small" />
                      </IconButton>
                    </Box>

                    {/* Price Input */}
                    <TextField
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => {
                        const price = parseInt(e.target.value) || 1;
                        updateCartPrice(item.productId, price);
                      }}
                      inputProps={{ 
                        min: 1,
                        step: 1,
                        style: { textAlign: 'right', padding: '4px 8px', width: '80px' }
                      }}
                      size="small"
                      sx={{ width: 130, flexShrink: 0 }}
                      variant="outlined"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start" sx={{ fontSize: '0.7rem', mr: 0.5 }}>
                            {getSettingValue('CURRENCY', 'USD')}
                          </InputAdornment>
                        ),
                      }}
                    />

                    {/* Total */}
                    <Typography 
                      variant="body2" 
                      fontWeight="bold" 
                      sx={{ 
                        minWidth: 80, 
                        textAlign: 'right',
                        flexShrink: 0
                      }}
                    >
                      {formatCurrency(item.total)}
                    </Typography>

                    {/* Delete Button */}
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => removeFromCart(item.productId)}
                      sx={{ flexShrink: 0, ml: 0.5 }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>

          {/* Order Totals & Submit */}
          <Paper sx={{ p: 2, borderRadius: 0, boxShadow: -1 }}>
            <form onSubmit={handleSubmit(onSubmit)}>
              {/* Notes and Discount in one row - equal size */}
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="notes"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        size="small"
                        label="Notes (Optional)"
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
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
                        <InputAdornment position="start">
                          {getSettingValue('CURRENCY', 'USD')}
                        </InputAdornment>
                      ),
                    }}
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                </Grid>
              </Grid>

              {/* Process Payment Checkbox and Payment Method in one row - equal size */}
              <Grid container spacing={2} sx={{ mb: 2 }} alignItems="center">
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={processPayment}
                        onChange={(e) => setProcessPayment(e.target.checked)}
                        size="small"
                      />
                    }
                    label={
                      <Typography variant="body2">
                        Process payment with purchase
                      </Typography>
                    }
                  />
                </Grid>
                {processPayment && (
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Payment Method</InputLabel>
                      <Select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        label="Payment Method"
                      >
                        <MenuItem value="CASH">Cash</MenuItem>
                        <MenuItem value="BANK_TRANSFER">Bank Transfer</MenuItem>
                        <MenuItem value="CHECK">Check</MenuItem>
                        <MenuItem value="BKASH">bKash</MenuItem>
                        <MenuItem value="OTHER">Other</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                )}
              </Grid>

              {/* Totals */}
              <Divider sx={{ my: 2 }} />
              <Box sx={{ mb: 2 }}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Subtotal:</Typography>
                  <Typography variant="body2">{formatCurrency(calculateSubtotal())}</Typography>
                </Box>
                {discountAmount > 0 && (
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" color="error">Discount:</Typography>
                    <Typography variant="body2" color="error">-{formatCurrency(calculateDiscount())}</Typography>
                  </Box>
                )}
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">
                    Tax ({(parseFloat(getSettingValue('TAXRATE', '0.08')) * 100).toFixed(1)}%):
                  </Typography>
                  <Typography variant="body2">{formatCurrency(calculateTax())}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="h6">Total:</Typography>
                  <Typography variant="h6" color="primary">
                    {formatCurrency(calculateTotal())}
                  </Typography>
                </Box>
              </Box>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                size="large"
                disabled={cart.length === 0 || loading}
                startIcon={<LocalShipping />}
                sx={{ py: 1.5 }}
              >
                {loading ? 'Processing...' : 'Create Purchase Order'}
              </Button>
            </form>
          </Paper>
        </Box>
      </Box>

      {/* Payment Confirmation Dialog */}
      <Dialog
        open={openPaymentConfirmDialog}
        onClose={loading ? undefined : handleCancelPayment}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown={loading}
      >
        <DialogTitle>Confirm Payment Processing</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You are about to process payment for the following purchase order:
          </DialogContentText>
          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="body2"><strong>PO Number:</strong> {purchaseOrderToPay?.poNumber}</Typography>
            <Typography variant="body2"><strong>Supplier:</strong> {purchaseOrderToPay?.supplier?.name || 'N/A'}</Typography>
            <Typography variant="body2"><strong>Total Amount:</strong> {formatCurrency(purchaseOrderToPay?.total || 0)}</Typography>
            <Typography variant="body2"><strong>Payment Method:</strong> {paymentMethod}</Typography>
          </Box>
          <Alert severity="info" sx={{ mt: 2 }}>
            This will record a payment of {formatCurrency(purchaseOrderToPay?.total || 0)} for this purchase order.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelPayment} disabled={loading}>
            Skip Payment
          </Button>
          <Button onClick={handleConfirmPayment} variant="contained" color="primary" disabled={loading}>
            {loading ? 'Processing...' : 'Confirm & Process Payment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PurchaseOrderPOSPage;

