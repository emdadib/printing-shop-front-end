import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Paper,
  Divider,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Print,
  Add,
  Remove,
  CheckCircle,
  Receipt
} from '@mui/icons-material';
import { useCurrency } from '@/contexts/CurrencyContext';
import { apiService } from '@/services/api';

interface PhotocopyProduct {
  id: string;
  name: string;
  basePrice: number;
  unit: string;
}

interface PhotocopyOrder {
  oneSidedCopies: number;
  bothSidedCopies: number;
  totalPages: number;
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
}

const PhotocopyPage: React.FC = () => {
  const { formatCurrency } = useCurrency();
  const [photocopyProducts, setPhotocopyProducts] = useState<PhotocopyProduct[]>([]);
  const [photocopyPageProduct, setPhotocopyPageProduct] = useState<PhotocopyProduct | null>(null);
  const [oneSidedCopies, setOneSidedCopies] = useState(0);
  const [bothSidedCopies, setBothSidedCopies] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [orderSummary, setOrderSummary] = useState<PhotocopyOrder | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<PhotocopyOrder | null>(null);

  useEffect(() => {
    fetchPhotocopyProducts();
  }, []);

  const fetchPhotocopyProducts = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/photocopy/products');
      
      if (response.success && Array.isArray(response.data)) {
        const products = response.data;
        const photocopyProducts = products.filter((product: any) => 
          product.name.includes('১ পৃষ্ঠা') || product.name.includes('উভয় পৃষ্ঠা')
        );
        const photocopyPageProduct = products.find((product: any) => 
          product.name.toLowerCase().includes('photocopy page')
        );
        
        setPhotocopyProducts(photocopyProducts);
        setPhotocopyPageProduct(photocopyPageProduct);
      }
    } catch (err) {
      console.error('Failed to fetch photocopy products:', err);
      setError('Failed to load photocopy products');
    } finally {
      setLoading(false);
    }
  };

  const calculateOrder = () => {
    if (photocopyProducts.length < 2) return;

    const oneSidedProduct = photocopyProducts.find(p => p.name.includes('১ পৃষ্ঠা'));
    const bothSidedProduct = photocopyProducts.find(p => p.name.includes('উভয় পৃষ্ঠা'));

    if (!oneSidedProduct || !bothSidedProduct) return;

    const totalPages = oneSidedCopies + bothSidedCopies;
    const items = [];

    if (oneSidedCopies > 0) {
      items.push({
        productId: oneSidedProduct.id,
        productName: oneSidedProduct.name,
        quantity: oneSidedCopies,
        unitPrice: oneSidedProduct.basePrice,
        total: oneSidedCopies * oneSidedProduct.basePrice
      });
    }

    if (bothSidedCopies > 0) {
      items.push({
        productId: bothSidedProduct.id,
        productName: bothSidedProduct.name,
        quantity: bothSidedCopies,
        unitPrice: bothSidedProduct.basePrice,
        total: bothSidedCopies * bothSidedProduct.basePrice
      });
    }

    // Add photocopy page consumption
    if (photocopyPageProduct && totalPages > 0) {
      items.push({
        productId: photocopyPageProduct.id,
        productName: photocopyPageProduct.name,
        quantity: totalPages,
        unitPrice: photocopyPageProduct.basePrice,
        total: totalPages * photocopyPageProduct.basePrice
      });
    }

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const finalDiscountAmount = Math.min(discountAmount, subtotal); // Ensure discount doesn't exceed subtotal
    const totalAmount = Math.max(0, subtotal - finalDiscountAmount); // Ensure total doesn't go below 0

    setOrderSummary({
      oneSidedCopies,
      bothSidedCopies,
      totalPages,
      subtotal,
      discountAmount: finalDiscountAmount,
      totalAmount,
      items
    });
  };

  useEffect(() => {
    calculateOrder();
  }, [oneSidedCopies, bothSidedCopies, discountAmount, photocopyProducts, photocopyPageProduct]);

  const handleSubmit = async () => {
    if (!orderSummary || orderSummary.totalAmount === 0) {
      setError('Please enter copy quantities');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Create photocopy order
      const orderData = {
        oneSidedCopies,
        bothSidedCopies,
        discountAmount: orderSummary.discountAmount
      };

      const response = await apiService.post('/photocopy/order', orderData);
      
      if (response.success) {
        setSuccess('Photocopy order created successfully!');
        // Save order data for receipt before resetting
        setReceiptData(orderSummary);
        setShowReceipt(true);
        // Reset form
        setOneSidedCopies(0);
        setBothSidedCopies(0);
        setDiscountAmount(0);
        setOrderSummary(null);
      }
    } catch (err: any) {
      console.error('Failed to create photocopy order:', err);
      setError(err?.response?.data?.message || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3} maxWidth="800px" mx="auto">
      {/* Header */}
      <Box textAlign="center" mb={4}>
        <Typography 
          variant="h3" 
          gutterBottom 
          color="primary"
          sx={{ 
            whiteSpace: 'nowrap',
            fontSize: { xs: '1.8rem', sm: '2.5rem', md: '3rem' },
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          <Print sx={{ fontSize: { xs: 32, sm: 40, md: 48 }, mr: 2, verticalAlign: 'middle' }} />
          Photocopy Service
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Enter your copy requirements below
        </Typography>
      </Box>


      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Copy Input Form */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Copy Requirements
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>
                  ১ পৃষ্ঠা (1 Side)
                </Typography>
                <Box display="flex" alignItems="center" justifyContent="center" gap={2}>
                  <IconButton 
                    onClick={() => setOneSidedCopies(Math.max(0, oneSidedCopies - 1))}
                    disabled={oneSidedCopies === 0}
                  >
                    <Remove />
                  </IconButton>
                  <TextField
                    type="number"
                    value={oneSidedCopies}
                    onChange={(e) => setOneSidedCopies(Math.max(0, parseInt(e.target.value) || 0))}
                    inputProps={{ min: 0, style: { textAlign: 'center', fontSize: '1.5rem' } }}
                    sx={{ width: 100 }}
                  />
                  <IconButton onClick={() => setOneSidedCopies(oneSidedCopies + 1)}>
                    <Add />
                  </IconButton>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {photocopyProducts.find(p => p.name.includes('১ পৃষ্ঠা'))?.basePrice && 
                    formatCurrency(photocopyProducts.find(p => p.name.includes('১ পৃষ্ঠা'))!.basePrice)} per copy
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>
                  উভয় পৃষ্ঠা (Both Side)
                </Typography>
                <Box display="flex" alignItems="center" justifyContent="center" gap={2}>
                  <IconButton 
                    onClick={() => setBothSidedCopies(Math.max(0, bothSidedCopies - 1))}
                    disabled={bothSidedCopies === 0}
                  >
                    <Remove />
                  </IconButton>
                  <TextField
                    type="number"
                    value={bothSidedCopies}
                    onChange={(e) => setBothSidedCopies(Math.max(0, parseInt(e.target.value) || 0))}
                    inputProps={{ min: 0, style: { textAlign: 'center', fontSize: '1.5rem' } }}
                    sx={{ width: 100 }}
                  />
                  <IconButton onClick={() => setBothSidedCopies(bothSidedCopies + 1)}>
                    <Add />
                  </IconButton>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {photocopyProducts.find(p => p.name.includes('উভয় পৃষ্ঠা'))?.basePrice && 
                    formatCurrency(photocopyProducts.find(p => p.name.includes('উভয় পৃষ্ঠা'))!.basePrice)} per copy
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Discount Input */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Discount
          </Typography>
          
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                label="Fixed Amount Discount"
                type="number"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                inputProps={{ min: 0, step: 0.01 }}
                fullWidth
                helperText="Enter discount amount in BDT"
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>৳</Typography>
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                {discountAmount > 0 && (
                  <>
                    Discount: {formatCurrency(discountAmount)}
                    {orderSummary && orderSummary.subtotal > 0 && (
                      <span> ({(discountAmount / orderSummary.subtotal * 100).toFixed(1)}% of subtotal)</span>
                    )}
                  </>
                )}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Order Summary */}
      {orderSummary && orderSummary.totalAmount > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              Order Summary
            </Typography>
            
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <Chip 
                  label={`1-sided: ${orderSummary.oneSidedCopies}`} 
                  color="primary" 
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={6}>
                <Chip 
                  label={`2-sided: ${orderSummary.bothSidedCopies}`} 
                  color="secondary" 
                  variant="outlined"
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <List>
              {orderSummary.items.map((item, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={item.productName}
                    secondary={`${item.quantity} ${item.quantity > 1 ? 'copies' : 'copy'}`}
                  />
                  <ListItemSecondaryAction>
                    <Typography variant="h6">
                      {formatCurrency(item.total)}
                    </Typography>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ mb: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="h6">
                  Subtotal:
                </Typography>
                <Typography variant="h6">
                  {formatCurrency(orderSummary.subtotal)}
                </Typography>
              </Box>
              
              {orderSummary.discountAmount > 0 && (
                <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="h6" color="error">
                    Discount:
                  </Typography>
                  <Typography variant="h6" color="error">
                    -{formatCurrency(orderSummary.discountAmount)}
                  </Typography>
                </Box>
              )}
              
              <Divider sx={{ my: 1 }} />
              
              <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="h6">
                  Total Pages: {orderSummary.totalPages}
                </Typography>
                <Typography variant="h4" color="primary">
                  {formatCurrency(orderSummary.totalAmount)}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Submit Button */}
      <Box textAlign="center">
        <Button
          variant="contained"
          size="large"
          startIcon={<CheckCircle />}
          onClick={handleSubmit}
          disabled={!orderSummary || orderSummary.totalAmount === 0 || submitting}
          sx={{ minWidth: 200, py: 1.5 }}
        >
          {submitting ? <CircularProgress size={24} /> : 'Create Order'}
        </Button>
      </Box>

      {/* Receipt Dialog */}
      <Dialog open={showReceipt} onClose={() => setShowReceipt(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Receipt />
            Order Receipt
          </Box>
        </DialogTitle>
        <DialogContent>
          {receiptData && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Photocopy Order Completed
              </Typography>
              <Typography variant="body1" gutterBottom>
                1-sided copies: {receiptData.oneSidedCopies}
              </Typography>
              <Typography variant="body1" gutterBottom>
                2-sided copies: {receiptData.bothSidedCopies}
              </Typography>
              <Typography variant="body1" gutterBottom>
                Total pages: {receiptData.totalPages}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ mb: 2 }}>
                <Box display="flex" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography variant="body1">Subtotal:</Typography>
                  <Typography variant="body1">{formatCurrency(receiptData.subtotal)}</Typography>
                </Box>
                {receiptData.discountAmount > 0 && (
                  <Box display="flex" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography variant="body1" color="error">Discount:</Typography>
                    <Typography variant="body1" color="error">-{formatCurrency(receiptData.discountAmount)}</Typography>
                  </Box>
                )}
                <Divider sx={{ my: 1 }} />
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="h5" color="primary">Total Amount:</Typography>
                  <Typography variant="h5" color="primary">{formatCurrency(receiptData.totalAmount)}</Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handlePrintReceipt} startIcon={<Print />}>
            Print Receipt
          </Button>
          <Button onClick={() => {
            setShowReceipt(false);
            setReceiptData(null);
          }} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PhotocopyPage;
