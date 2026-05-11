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
  ListItemSecondaryAction,
  Menu,
  Tooltip,
  Chip,
  Snackbar,
  Autocomplete,
  TablePagination,
} from '@mui/material';
import {
  Add,
  Delete,
  Search,
  Remove,
  Visibility,
  MoreVert,
  Payment,
  Print,
  CheckCircle,
  PointOfSale,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { apiService } from '@/services/api';
import { useSettings } from '@/hooks/useSettings';
import OrderReceipt from '@/components/OrderReceipt';

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

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
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

const orderSchema = yup.object({
  customerId: yup.string().required('Customer is required'),
  type: yup.string().required('Order type is required'),
  notes: yup.string()
});



const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { formatCurrency, getSettingValue } = useSettings();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
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
  const [submitting, setSubmitting] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [itemQuantity, setItemQuantity] = useState(1);
  
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

  // Serial number input state
  const [openSerialDialog, setOpenSerialDialog] = useState(false);
  const [selectedItemForSerial, setSelectedItemForSerial] = useState<OrderItem | null>(null);
  const [serialNumbersInput, setSerialNumbersInput] = useState('');

  // Discount state
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountType, setDiscountType] = useState<'AMOUNT' | 'PERCENTAGE'>('AMOUNT');

  const WALK_IN_MAX_TOTAL = 1000;

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors }
  } = useForm({
    resolver: yupResolver(orderSchema),
    defaultValues: {
      customerId: '',
      type: 'SALE',
      notes: ''
    }
  });

  const selectedCustomerId = watch('customerId');



  useEffect(() => {
    fetchProducts();
    fetchCustomers();
  }, []);

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

  // Auto-populate payment amount when order total changes
  useEffect(() => {
    const total = calculateOrderTotal();
    if (total > 0 && paymentAmount === 0) {
      setPaymentAmount(total);
    }
  }, [orderItems]);

  // Update payment amount when discount changes
  useEffect(() => {
    const total = calculateOrderTotal();
    if (total > 0) {
      setPaymentAmount(total);
    }
  }, [discountAmount, discountType, orderItems]);

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





  const handleOpenDialog = () => {
    setOpenDialog(true);
    setOrderItems([]);
    reset();
    setPaymentAmount(0);
    setPaymentMethod('CASH');
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setOrderItems([]);
    setSelectedProduct(null);
    setItemQuantity(1);
    reset();
    setPaymentAmount(0);
    setPaymentMethod('CASH');
    setDiscountAmount(0);
    setDiscountType('AMOUNT');
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

  // Calculate warranty dates for a product
  const calculateWarrantyDates = (product: Product) => {
    if (!product.hasWarranty || !product.warrantyPeriod) {
      return { warrantyStartDate: null, warrantyEndDate: null };
    }

    const startDate = new Date(); // Warranty starts from order completion
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + product.warrantyPeriod);

    return {
      warrantyStartDate: startDate.toISOString(),
      warrantyEndDate: endDate.toISOString()
    };
  };

  const addItemToOrder = () => {
    if (!selectedProduct || itemQuantity <= 0) return;

    const existingItem = orderItems.find(item => item.productId === selectedProduct.id);
    if (existingItem) {
      setOrderItems(orderItems.map(item => 
        item.productId === selectedProduct.id 
          ? { ...item, quantity: item.quantity + itemQuantity }
          : item
      ));
    } else {
      const warrantyDates = calculateWarrantyDates(selectedProduct);
      const newItem: OrderItem = {
        productId: selectedProduct.id,
        quantity: itemQuantity,
        unitPrice: selectedProduct.basePrice,
        costPrice: selectedProduct.baseCostPrice,
        discount: 0,
        taxAmount: 0,
        total: selectedProduct.basePrice * itemQuantity,
        notes: '',
        specifications: {},
        serialNumbers: '', // Will be filled when order is completed
        warrantyStartDate: warrantyDates.warrantyStartDate || undefined,
        warrantyEndDate: warrantyDates.warrantyEndDate || undefined
      };
      setOrderItems([...orderItems, newItem]);
    }
    setSelectedProduct(null);
    setItemQuantity(1);
  };

  const removeItemFromOrder = (productId: string) => {
    setOrderItems(orderItems.filter(item => item.productId !== productId));
  };

  const updateItemQuantity = (productId: string, quantity: number) => {
    setOrderItems(orderItems.map(item => 
      item.productId === productId 
        ? { ...item, quantity, total: item.unitPrice * quantity }
        : item
    ));
  };

  const handleSerialNumberInput = (item: OrderItem) => {
    setSelectedItemForSerial(item);
    setSerialNumbersInput(item.serialNumbers || '');
    setOpenSerialDialog(true);
  };

  const handleSerialNumberSave = () => {
    if (selectedItemForSerial) {
      setOrderItems(orderItems.map(item => 
        item.productId === selectedItemForSerial.productId 
          ? { ...item, serialNumbers: serialNumbersInput }
          : item
      ));
    }
    setOpenSerialDialog(false);
    setSelectedItemForSerial(null);
    setSerialNumbersInput('');
  };

  const handleSerialNumberCancel = () => {
    setOpenSerialDialog(false);
    setSelectedItemForSerial(null);
    setSerialNumbersInput('');
  };

  const calculateOrderTotal = () => {
    const subtotal = orderItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
    
    // Apply discount
    if (discountAmount > 0) {
      if (discountType === 'PERCENTAGE') {
        return subtotal * (1 - discountAmount / 100);
      } else {
        return Math.max(0, subtotal - discountAmount);
      }
    }
    
    return subtotal;
  };

  const calculateDiscountAmount = () => {
    const subtotal = orderItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
    
    if (discountAmount > 0) {
      if (discountType === 'PERCENTAGE') {
        return subtotal * (discountAmount / 100);
      } else {
        return Math.min(discountAmount, subtotal);
      }
    }
    
    return 0;
  };

  const onSubmit = async (data: any) => {
    // Prevent double submission
    if (submitting) {
      return;
    }

    if (orderItems.length === 0) {
      setError('Please add at least one item to the order');
      return;
    }

    if (data.customerId === 'walk-in' && calculateOrderTotal() > WALK_IN_MAX_TOTAL) {
      setError(
        `Orders above ${formatCurrency(WALK_IN_MAX_TOTAL)} require a registered customer — walk-in is not allowed.`
      );
      return;
    }

    try {
      setSubmitting(true);
      const orderData = {
        ...data,
        items: orderItems.map(item => ({
          ...item,
          total: item.unitPrice * item.quantity
        })),
        discountAmount: discountAmount > 0 ? discountAmount : undefined,
        discountType: discountAmount > 0 ? discountType : undefined
      };

      // Create the order
      const orderResponse = await apiService.post('/orders', orderData);
      
      // Handle response structure: apiService returns response.data, which is { success: true, data: order }
      // Check if response has success flag
      if (orderResponse && typeof orderResponse === 'object' && 'success' in orderResponse) {
        if (!orderResponse.success) {
          const errorMsg = orderResponse.message || 'Failed to create order';
          setError(errorMsg);
          console.error('Order creation failed:', orderResponse);
          return;
        }
      }

      // Extract order data from response
      const createdOrder = orderResponse?.data || orderResponse;

      if (!createdOrder || !createdOrder.id) {
        console.error('Invalid order response:', orderResponse);
        setError('Order created but received invalid response. Please refresh the page.');
        return;
      }

      console.log('Order created successfully:', createdOrder);

      // Track if payment was successful
      let paymentSuccess = true;
      
      // If payment amount is provided, create payment
      if (paymentAmount > 0) {
        try {
          // Get the actual customer ID from the created order (not from data.customerId which might be 'walk-in')
          const actualCustomerId = createdOrder.customerId || createdOrder.customer?.id;
          
          if (!actualCustomerId) {
            console.error('No customer ID found in created order:', createdOrder);
            setError('Order created successfully, but payment failed: Customer ID not found. Please process payment separately.');
            paymentSuccess = false;
          } else {
            const paymentData = {
              customerId: actualCustomerId,
              orderId: createdOrder.id,
              amount: paymentAmount,
              paymentMethod,
              notes: `Payment for order ${createdOrder.orderNumber || createdOrder.id}`
            };

            console.log('Creating payment with data:', paymentData);
            const paymentResponse = await apiService.post('/payments', paymentData);
            
            // Check if payment was successful
            if (paymentResponse && typeof paymentResponse === 'object') {
              if ('success' in paymentResponse && !paymentResponse.success) {
                const errorMsg = paymentResponse.message || 'Payment creation failed';
                setError(`Order created successfully, but payment failed: ${errorMsg}. Please process payment separately.`);
                paymentSuccess = false;
                console.error('Payment creation failed:', paymentResponse);
              } else {
                console.log('Payment created successfully:', paymentResponse);
                // Refresh due amount for this specific order after payment creation
                setTimeout(() => {
                  fetchDueAmountForOrder(createdOrder.id);
                }, 1000);
              }
            } else {
              // Assume success if response structure is unexpected
              console.log('Payment created successfully (unexpected response format):', paymentResponse);
              setTimeout(() => {
                fetchDueAmountForOrder(createdOrder.id);
              }, 1000);
            }
          }
        } catch (paymentError: any) {
          console.error('Payment creation failed:', paymentError);
          const errorMessage = paymentError?.response?.data?.message || paymentError?.message || 'Unknown error';
          setError(`Order created successfully, but payment failed: ${errorMessage}. Please process payment separately.`);
          paymentSuccess = false;
          // Don't return here - allow order creation to complete
        }
      }

      // Refresh orders and due amounts
      try {
        await fetchOrders();
      } catch (fetchError) {
        console.error('Error fetching orders after creation:', fetchError);
        // Don't show error to user - order was created successfully
      }
      
      // Close dialog - order was created successfully
      handleCloseDialog();
      
      // Show appropriate success/error messages
      if (paymentSuccess || paymentAmount === 0) {
        setError(null);
        // Show success message
        if (paymentAmount > 0) {
          showSnackbar('Order and payment created successfully!', 'success');
        } else {
          showSnackbar('Order created successfully!', 'success');
        }
      } else {
        // Payment failed but order succeeded
        showSnackbar('Order created successfully, but payment failed. Please process payment separately.', 'warning');
      }
      
      // Refresh due amount for the created order after order/payment creation
      if (createdOrder?.id) {
        setTimeout(() => {
          fetchDueAmountForOrder(createdOrder.id).catch(err => {
            console.error('Error fetching due amount:', err);
          });
        }, 1000);
      }
    } catch (err: any) {
      console.error('Order creation error:', err);
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to create order';
      setError(errorMessage);
      
      // Check if order might have been created despite error
      if (err?.response?.status === 201 || err?.response?.status === 200) {
        // Order was created, just refresh
        fetchOrders();
        // Note: We can't fetch due amount here as we don't have the order ID
        // It will be fetched when the order list is refreshed
      }
    } finally {
      setSubmitting(false);
    }
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
      (order.customer?.email || '').toLowerCase().includes(searchLower);
    
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
            variant="outlined"
            color="primary"
            startIcon={<PointOfSale />}
            onClick={() => navigate('/pos')}
          >
            POS Mode
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleOpenDialog}
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
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
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



      {/* Create Order Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>Create New Order</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Grid container spacing={3}>
              {/* Order Details */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Order Details</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
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
                              return '🚶 Walk-in Customer (One-time)';
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
                            field.value === 'walk-in' || !field.value
                              ? { id: 'walk-in', firstName: 'Walk-in', lastName: 'Customer', email: '', phone: '' }
                              : customers.find((c) => c.id === field.value) || null
                          }
                          onChange={(_, newValue) => {
                            field.onChange(newValue ? newValue.id : 'walk-in');
                          }}
                          renderInput={(params) => {
                            const overWalkInLimit =
                              (selectedCustomerId === 'walk-in' || !selectedCustomerId) &&
                              calculateOrderTotal() > WALK_IN_MAX_TOTAL;
                            return (
                              <TextField
                                {...params}
                                label="Customer"
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
                  <Grid item xs={12} md={6}>
                    <Controller
                      name="type"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth error={!!errors.type}>
                          <InputLabel>Order Type</InputLabel>
                                                     <Select {...field} label="Order Type">
                             <MenuItem value="SALE">Sale</MenuItem>
                             <MenuItem value="DIRECT_SALE">Direct Sale (Instant Complete)</MenuItem>
                             <MenuItem value="CUSTOM_ORDER">Custom Order</MenuItem>
                             <MenuItem value="RUSH_ORDER">Rush Order</MenuItem>
                             <MenuItem value="REPRINT">Reprint</MenuItem>
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
                          fullWidth
                          label="Notes"
                          multiline
                          rows={2}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </Grid>

              <Grid item xs={12}>
                <Divider />
              </Grid>

              {/* Add Items */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Add Items</Typography>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Product</InputLabel>
                      <Select
                        value={selectedProduct?.id || ''}
                        onChange={(e) => {
                          const product = products.find(p => p.id === e.target.value);
                          setSelectedProduct(product || null);
                        }}
                        label="Product"
                      >
                        {products.map((product) => (
                          <MenuItem key={product.id} value={product.id}>
                            {product.name} ({product.sku}) - {formatCurrency(product.basePrice)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="Quantity"
                      type="number"
                      value={itemQuantity}
                      onChange={(e) => setItemQuantity(Number(e.target.value))}
                      inputProps={{ min: 1 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={addItemToOrder}
                      disabled={!selectedProduct || itemQuantity <= 0}
                    >
                      Add Item
                    </Button>
                  </Grid>
                </Grid>
              </Grid>

              {/* Order Items */}
              {orderItems.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Order Items</Typography>
                  <List>
                    {orderItems.map((item) => {
                      const product = products.find(p => p.id === item.productId);
                      return (
                        <ListItem key={item.productId} divider>
                                                      <ListItemText
                              primary={product?.name || 'Unknown Product'}
                              secondary={`SKU: ${product?.sku || 'N/A'} | Price: ${formatCurrency(item.unitPrice)}`}
                            />
                          <ListItemSecondaryAction>
                            <Box display="flex" alignItems="center" gap={2}>
                              <TextField
                                size="small"
                                label="Qty"
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateItemQuantity(item.productId, Number(e.target.value))}
                                inputProps={{ min: 1 }}
                                sx={{ width: 80 }}
                              />
                              {product?.hasWarranty && (
                                <Tooltip title="Add Serial Numbers">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleSerialNumberInput(item)}
                                    color="primary"
                                  >
                                    <Search />
                                  </IconButton>
                                </Tooltip>
                              )}
                              <Typography variant="body2">
                                {formatCurrency(Number(item.total) || 0)}
                              </Typography>
                              <IconButton
                                size="small"
                                onClick={() => removeItemFromOrder(item.productId)}
                                color="error"
                              >
                                <Remove />
                              </IconButton>
                            </Box>
                          </ListItemSecondaryAction>
                        </ListItem>
                      );
                    })}
                  </List>
                  <Box display="flex" justifyContent="flex-end" mt={2}>
                    <Typography variant="h6">
                      Total: {formatCurrency(calculateOrderTotal())}
                    </Typography>
                  </Box>
                </Grid>
              )}

              {/* Discount Section */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Discount</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel>Discount Type</InputLabel>
                      <Select
                        value={discountType}
                        onChange={(e) => setDiscountType(e.target.value as 'AMOUNT' | 'PERCENTAGE')}
                        label="Discount Type"
                      >
                        <MenuItem value="AMOUNT">Fixed Amount</MenuItem>
                        <MenuItem value="PERCENTAGE">Percentage</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label={`Discount ${discountType === 'PERCENTAGE' ? '(%)' : '(Amount)'}`}
                      type="number"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(Number(e.target.value))}
                      inputProps={{ 
                        min: 0, 
                        max: discountType === 'PERCENTAGE' ? 100 : undefined,
                        step: discountType === 'PERCENTAGE' ? 1 : 0.01 
                      }}
                      InputProps={{
                        startAdornment: discountType === 'AMOUNT' ? (
                          <InputAdornment position="start">{getSettingValue('CURRENCY', 'USD')}</InputAdornment>
                        ) : (
                          <InputAdornment position="start">%</InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                      <Typography variant="body2" color="text.secondary">
                        Discount Amount: {formatCurrency(calculateDiscountAmount())}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Grid>

              {/* Order Summary */}
              <Grid item xs={12}>
                <Divider />
                <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2">Subtotal:</Typography>
                    </Grid>
                    <Grid item xs={6} sx={{ textAlign: 'right' }}>
                      <Typography variant="body2">
                        {formatCurrency(orderItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0))}
                      </Typography>
                    </Grid>
                    {discountAmount > 0 && (
                      <>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="success.main">
                            Discount ({discountType === 'PERCENTAGE' ? `${discountAmount}%` : formatCurrency(discountAmount)}):
                          </Typography>
                        </Grid>
                        <Grid item xs={6} sx={{ textAlign: 'right' }}>
                          <Typography variant="body2" color="success.main">
                            -{formatCurrency(calculateDiscountAmount())}
                          </Typography>
                        </Grid>
                      </>
                    )}
                    <Grid item xs={6}>
                      <Typography variant="h6">Total:</Typography>
                    </Grid>
                    <Grid item xs={6} sx={{ textAlign: 'right' }}>
                      <Typography variant="h6" color="primary">
                        {formatCurrency(calculateOrderTotal())}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </Grid>

              {/* Payment Section */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Payment</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Payment Amount"
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(Number(e.target.value))}
                      inputProps={{ min: 0, step: 0.01 }}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">{getSettingValue('CURRENCY', 'USD')}</InputAdornment>,
                      }}
                      helperText={`Order Total: ${formatCurrency(calculateOrderTotal())}`}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
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
              </Grid>

              <Grid item xs={12}>
                <Divider />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} disabled={submitting}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={orderItems.length === 0 || submitting}>
              {submitting ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Creating...
                </>
              ) : (
                'Create Order'
              )}
            </Button>
          </DialogActions>
        </form>
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

      {/* Serial Number Dialog */}
      <Dialog open={openSerialDialog} onClose={handleSerialNumberCancel} maxWidth="sm" fullWidth>
        <DialogTitle>
          Add Serial Numbers - {selectedItemForSerial?.product?.name}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Serial Numbers"
            value={serialNumbersInput}
            onChange={(e) => setSerialNumbersInput(e.target.value)}
            placeholder="Enter serial numbers separated by commas (e.g., SN001, SN002, SN003)"
            helperText="Separate multiple serial numbers with commas"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSerialNumberCancel}>Cancel</Button>
          <Button onClick={handleSerialNumberSave} variant="contained">Save</Button>
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