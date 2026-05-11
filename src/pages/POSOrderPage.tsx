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
} from '@mui/material';
import {
  Add,
  Remove,
  Search,
  ShoppingCart,
  Close,
  Delete,
  Payment,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { apiService } from '@/services/api';
import { useSettings } from '@/hooks/useSettings';

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

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface CartItem {
  productId: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  total: number;
}

const orderSchema = yup.object({
  customerId: yup.string().required('Customer is required'),
  type: yup.string().required('Order type is required'),
  notes: yup.string(),
});

const POSOrderPage: React.FC = () => {
  const navigate = useNavigate();
  const { formatCurrency, getSettingValue } = useSettings();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [productTypeFilter, setProductTypeFilter] = useState<string>('ALL');
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountType, setDiscountType] = useState<'AMOUNT' | 'PERCENTAGE'>('AMOUNT');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({ open: false, message: '', severity: 'success' });

  const WALK_IN_MAX_TOTAL = 1000;

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(orderSchema),
    defaultValues: {
      customerId: 'walk-in',
      type: 'DIRECT_SALE',
      notes: '',
    },
  });

  const selectedCustomerId = watch('customerId');

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
  }, []);

  useEffect(() => {
    const total = calculateOrderTotal();
    if (total > 0 && paymentAmount === 0) {
      setPaymentAmount(total);
    } else {
      setPaymentAmount(total);
    }
  }, [cart, discountAmount, discountType]);

  const fetchProducts = async () => {
    try {
      // Fetch all active products with high limit to ensure we get all products
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
    } catch (err) {
      console.error('Customers fetch error:', err);
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
      // Use product's actual base price, minimum 1
      const unitPrice = Math.max(1, product.basePrice || 1);
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
    // Ensure quantity is at least 1
    const validQuantity = Math.max(1, quantity);
    setCart(
      cart.map((item) =>
        item.productId === productId
          ? { ...item, quantity: validQuantity, total: validQuantity * item.unitPrice }
          : item
      )
    );
  };

  const updateCartPrice = (productId: string, price: number) => {
    // Ensure price is always an integer and at least 1 (minimum value)
    const validPrice = Math.max(1, Math.floor(price));
    setCart(
      cart.map((item) =>
        item.productId === productId
          ? { ...item, unitPrice: validPrice, total: item.quantity * validPrice }
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
    const subtotal = calculateSubtotal();
    if (discountAmount > 0) {
      if (discountType === 'PERCENTAGE') {
        return subtotal * (discountAmount / 100);
      } else {
        return Math.min(discountAmount, subtotal);
      }
    }
    return 0;
  };

  const calculateOrderTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = calculateDiscount();
    return Math.max(0, subtotal - discount);
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const onSubmit = async (data: any) => {
    // Prevent double submission
    if (loading) {
      return;
    }

    if (cart.length === 0) {
      showSnackbar('Please add at least one item to the cart', 'warning');
      return;
    }

    if (data.customerId === 'walk-in' && calculateOrderTotal() > WALK_IN_MAX_TOTAL) {
      showSnackbar(
        `Orders above ${formatCurrency(WALK_IN_MAX_TOTAL)} require a registered customer — walk-in is not allowed.`,
        'warning'
      );
      return;
    }

    try {
      setLoading(true);
      const orderData = {
        ...data,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          costPrice: item.product.baseCostPrice,
          discount: 0,
          taxAmount: 0,
          total: item.total,
          notes: '',
          specifications: {},
        })),
        discountAmount: discountAmount > 0 ? discountAmount : undefined,
        discountType: discountAmount > 0 ? discountType : undefined,
      };

      const orderResponse = await apiService.post('/orders', orderData);
      const createdOrder = orderResponse?.data || orderResponse;

      if (!createdOrder || !createdOrder.id) {
        showSnackbar('Order created but received invalid response', 'error');
        return;
      }

      // Create payment if payment amount is provided
      if (paymentAmount > 0) {
        try {
          const actualCustomerId = createdOrder.customerId || createdOrder.customer?.id;
          if (actualCustomerId) {
            const paymentData = {
              customerId: actualCustomerId,
              orderId: createdOrder.id,
              amount: paymentAmount,
              paymentMethod,
              notes: `Payment for order ${createdOrder.orderNumber || createdOrder.id}`,
            };
            await apiService.post('/payments', paymentData);
          }
        } catch (paymentError: any) {
          console.error('Payment creation failed:', paymentError);
        }
      }

      showSnackbar('Order created successfully!', 'success');
      
      // Reset form and cart
      setCart([]);
      setDiscountAmount(0);
      setDiscountType('AMOUNT');
      reset({
        customerId: 'walk-in',
        type: 'DIRECT_SALE',
        notes: '',
      });
    } catch (err: any) {
      console.error('Order creation error:', err);
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to create order';
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
              onClick={() => navigate('/orders')}
              size="small"
            >
              Close
            </Button>
            <Typography variant="h5" fontWeight="bold">
              Point of Sale (POS)
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
                          {formatCurrency(product.basePrice)}
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
              Order Summary
            </Typography>
            
            {/* Customer and Order Type in one row */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="customerId"
                  control={control}
                  render={({ field }) => (
                    <Autocomplete
                      options={[
                        { id: 'walk-in', firstName: 'Walk-in', lastName: 'Customer', email: '', phone: '' },
                        ...customers
                      ]}
                      getOptionLabel={(option) => {
                        if (option.id === 'walk-in') {
                          return '🚶 Walk-in Customer';
                        }
                        return `${option.firstName} ${option.lastName}${option.email ? ` (${option.email})` : ''}${option.phone ? ` - ${option.phone}` : ''}`;
                      }}
                      filterOptions={(options, { inputValue }) => {
                        const searchTerm = inputValue.toLowerCase();
                        return options.filter((option) => {
                          if (option.id === 'walk-in') {
                            return 'walk-in customer'.includes(searchTerm) || searchTerm === '';
                          }
                          return (
                            option.firstName.toLowerCase().includes(searchTerm) ||
                            option.lastName.toLowerCase().includes(searchTerm) ||
                            option.email.toLowerCase().includes(searchTerm) ||
                            option.phone.toLowerCase().includes(searchTerm) ||
                            `${option.firstName} ${option.lastName}`.toLowerCase().includes(searchTerm)
                          );
                        });
                      }}
                      value={
                        field.value === 'walk-in'
                          ? { id: 'walk-in', firstName: 'Walk-in', lastName: 'Customer', email: '', phone: '' }
                          : customers.find((c) => c.id === field.value) || null
                      }
                      onChange={(_, newValue) => {
                        field.onChange(newValue ? newValue.id : 'walk-in');
                      }}
                      renderInput={(params) => {
                        const overWalkInLimit =
                          selectedCustomerId === 'walk-in' &&
                          calculateOrderTotal() > WALK_IN_MAX_TOTAL;
                        return (
                          <TextField
                            {...params}
                            label="Customer"
                            size="small"
                            error={!!errors.customerId || overWalkInLimit}
                            helperText={
                              errors.customerId?.message ||
                              (overWalkInLimit
                                ? `Walk-in not allowed above ${formatCurrency(WALK_IN_MAX_TOTAL)} — select a customer.`
                                : undefined)
                            }
                            placeholder="Search by name, email, or phone..."
                          />
                        );
                      }}
                      noOptionsText="No customers found"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth size="small" error={!!errors.type}>
                      <InputLabel>Order Type</InputLabel>
                      <Select {...field} label="Order Type">
                        <MenuItem value="SALE">Sale</MenuItem>
                        <MenuItem value="DIRECT_SALE">Direct Sale</MenuItem>
                        <MenuItem value="CUSTOM_ORDER">Custom Order</MenuItem>
                        <MenuItem value="RUSH_ORDER">Rush Order</MenuItem>
                        <MenuItem value="REPRINT">Reprint</MenuItem>
                      </Select>
                    </FormControl>
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
                        onClick={() => {
                          const newQuantity = Math.max(1, item.quantity - 1);
                          updateCartQuantity(item.productId, newQuantity);
                        }}
                        disabled={item.quantity <= 1}
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
                        onBlur={(e) => {
                          // Ensure minimum of 1 on blur
                          const qty = parseInt(e.target.value) || 1;
                          if (qty < 1) {
                            updateCartQuantity(item.productId, 1);
                          }
                        }}
                        inputProps={{ 
                          min: 1,
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

          {/* Order Totals & Payment */}
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
                  <Box>
          
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Discount Type</InputLabel>
                          <Select
                            value={discountType}
                            onChange={(e) => setDiscountType(e.target.value as 'AMOUNT' | 'PERCENTAGE')}
                            label="Discount Type"
                          >
                            <MenuItem value="AMOUNT">Amount</MenuItem>
                            <MenuItem value="PERCENTAGE">%</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          value={discountAmount}
                          onChange={(e) => setDiscountAmount(Number(e.target.value))}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                {discountType === 'PERCENTAGE' ? '%' : getSettingValue('CURRENCY', 'USD')}
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Grid>
                    </Grid>
                  </Box>
                </Grid>
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
                    <Typography variant="body2" color="success.main">
                      
                    </Typography>
                    <Typography variant="body2" color="success.main">
                      -{formatCurrency(calculateDiscount())}
                    </Typography>
                  </Box>
                )}
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="h6">Total:</Typography>
                  <Typography variant="h6" color="primary">
                    {formatCurrency(calculateOrderTotal())}
                  </Typography>
                </Box>
              </Box>

              {/* Payment Amount and Payment Method in one row - equal size */}
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Payment Amount"
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">{getSettingValue('CURRENCY', 'USD')}</InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Payment Method</InputLabel>
                    <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} label="Payment Method">
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

              {/* Submit Button */}
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                size="large"
                disabled={cart.length === 0 || loading}
                startIcon={<Payment />}
                sx={{ py: 1.5 }}
              >
                {loading ? 'Processing...' : 'Complete Order'}
              </Button>
            </form>
          </Paper>
        </Box>
      </Box>

      {/* Snackbar */}
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default POSOrderPage;

