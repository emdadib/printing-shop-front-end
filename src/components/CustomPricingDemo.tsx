import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert
} from '@mui/material';

interface Product {
  id: string;
  name: string;
  pricingModel: 'FIXED' | 'VARIABLE' | 'AREA_BASED';
  basePrice: number;
  unit: string;
}

const CustomPricingDemo: React.FC = () => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [customUnitPrice, setCustomUnitPrice] = useState<number | undefined>();
  const [calculation, setCalculation] = useState<any>(null);

  const products: Product[] = [
    { id: 'PROD01', name: 'ফটোকপি', pricingModel: 'FIXED', basePrice: 2.00, unit: 'page' },
    { id: 'PROD03', name: 'ব্যানার প্রিন্ট', pricingModel: 'AREA_BASED', basePrice: 18.00, unit: 'sqft' },
    { id: 'PROD06', name: 'বিয়ের কার্ড', pricingModel: 'VARIABLE', basePrice: 8.00, unit: 'piece' }
  ];

  const calculatePricing = () => {
    if (!selectedProduct) return;

    let unitPrice = selectedProduct.basePrice;
    
    // Apply custom pricing if provided
    if (customUnitPrice) {
      unitPrice = customUnitPrice;
    } else if (selectedProduct.pricingModel === 'VARIABLE') {
      // Apply quantity discounts
      if (quantity >= 101) {
        unitPrice = selectedProduct.basePrice * 0.90; // 10% discount
      } else if (quantity >= 51) {
        unitPrice = selectedProduct.basePrice * 0.95; // 5% discount
      }
    }

    const subtotal = quantity * unitPrice;
    const taxAmount = subtotal * 0.05;
    const total = subtotal + taxAmount;

    setCalculation({
      unitPrice,
      subtotal,
      taxAmount,
      total,
      isCustomPriced: !!customUnitPrice
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        🏪 Custom Pricing Demo
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📦 Select Product
              </Typography>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Product</InputLabel>
                <Select
                  value={selectedProduct?.id || ''}
                  onChange={(e) => {
                    const product = products.find(p => p.id === e.target.value);
                    setSelectedProduct(product || null);
                    setCalculation(null);
                  }}
                >
                  {products.map((product) => (
                    <MenuItem key={product.id} value={product.id}>
                      {product.name} ({product.pricingModel})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {selectedProduct && (
                <Box>
                  <Chip 
                    label={selectedProduct.pricingModel} 
                    color="primary"
                    sx={{ mr: 1 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Base Price: {selectedProduct.basePrice} BDT/{selectedProduct.unit}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📋 Order Details
              </Typography>
              
              <TextField
                fullWidth
                label={`Quantity (${selectedProduct?.unit || 'units'})`}
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                sx={{ mb: 2 }}
                disabled={!selectedProduct}
              />

              <TextField
                fullWidth
                label="Custom Unit Price (BDT)"
                type="number"
                value={customUnitPrice || ''}
                onChange={(e) => setCustomUnitPrice(e.target.value ? Number(e.target.value) : undefined)}
                sx={{ mb: 2 }}
                helperText="Leave empty to use standard pricing"
              />

              <Button
                variant="contained"
                fullWidth
                onClick={calculatePricing}
                disabled={!selectedProduct || quantity <= 0}
              >
                Calculate Pricing
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {calculation && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  🧮 Pricing Calculation
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">
                      Product: {selectedProduct?.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Quantity: {quantity} {selectedProduct?.unit}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Unit Price: {calculation.unitPrice} BDT
                    </Typography>
                    {calculation.isCustomPriced && (
                      <Alert severity="success" sx={{ mt: 1 }}>
                        Custom pricing applied
                      </Alert>
                    )}
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="h6">
                        Subtotal: {calculation.subtotal.toFixed(2)} BDT
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Tax (5%): {calculation.taxAmount.toFixed(2)} BDT
                      </Typography>
                      <Typography variant="h5" color="primary" sx={{ fontWeight: 'bold' }}>
                        Total: {calculation.total.toFixed(2)} BDT
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📊 Example Scenarios
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Mr. Rahim's Wedding Cards
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      50 pieces at 15 BDT each
                    </Typography>
                    <Typography variant="h6" color="primary">
                      Total: 787.50 BDT
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Mr. Karim's Wedding Cards
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      100 pieces at 13 BDT each
                    </Typography>
                    <Typography variant="h6" color="primary">
                      Total: 1,365.00 BDT
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Mr. Asif's Banner
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      3×8 ft (24 sq ft) at 18 BDT/sq ft
                    </Typography>
                    <Typography variant="h6" color="primary">
                      Total: 453.60 BDT
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CustomPricingDemo;
