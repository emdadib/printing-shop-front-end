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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  InputAdornment,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Add,
  Edit,
  Search,
  FilterList,
  Warning,
  Refresh
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { apiService } from '@/services/api';

interface InventoryItem {
  id: string;
  productId: string;
  quantity: number;
  available: number;
  reserved: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
  product: {
    id: string;
    name: string;
    sku: string;
    minStock: number;
    maxStock: number;
    unit: string;
    category: {
      id: string;
      name: string;
    };
  };
}

interface Category {
  id: string;
  name: string;
  description: string;
}

const stockUpdateSchema = yup.object({
  productId: yup.string().required('Product is required'),
  quantity: yup.number().required('Quantity is required'),
  type: yup.string().required('Movement type is required'),
  reason: yup.string()
});

const InventoryPage: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({
    resolver: yupResolver(stockUpdateSchema),
    defaultValues: {
      productId: '',
      quantity: 0,
      type: 'PURCHASE',
      reason: ''
    }
  });

  useEffect(() => {
    fetchInventory();
    fetchCategories();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterCategory) params.append('category', filterCategory);
      if (showLowStockOnly) params.append('lowStock', 'true');

      const response = await apiService.get(`/inventory?${params.toString()}`);
      console.log('Inventory response:', response);
      
      if (response.success && Array.isArray(response.data)) {
        setInventory(response.data);
      } else if (Array.isArray(response)) {
        setInventory(response);
      } else {
        console.error('Invalid inventory response format:', response);
        setError('Invalid response format from server');
      }
    } catch (err) {
      setError('Failed to load inventory');
      console.error('Inventory fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await apiService.get(`/products/categories/all?t=${Date.now()}`);
      if (response.success && Array.isArray(response.data)) {
        setCategories(response.data);
      } else if (Array.isArray(response)) {
        setCategories(response);
      } else {
        setCategories([]);
      }
    } catch (err) {
      console.error('Categories fetch error:', err);
    }
  };

  const handleOpenDialog = (item?: InventoryItem) => {
    if (item) {
      // Pre-fill the form with the selected product
      reset({
        productId: item.product.id,
        quantity: 0,
        type: 'PURCHASE',
        reason: ''
      });
    } else {
      // Reset to default values for new stock update
      reset({
        productId: '',
        quantity: 0,
        type: 'PURCHASE',
        reason: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    reset();
  };

  const onSubmit = async (data: any) => {
    try {
      await apiService.post('/inventory/update-stock', data);
      fetchInventory();
      handleCloseDialog();
    } catch (err) {
      setError('Failed to update stock');
      console.error('Stock update error:', err);
    }
  };

  const getStockStatusColor = (item: InventoryItem) => {
    if (item.isOutOfStock) return 'error';
    if (item.isLowStock) return 'warning';
    return 'success';
  };

  const getStockStatusText = (item: InventoryItem) => {
    if (item.isOutOfStock) return 'Out of Stock';
    if (item.isLowStock) return 'Low Stock';
    return 'In Stock';
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || item.product.category?.id === filterCategory;
    const matchesLowStock = !showLowStockOnly || item.isLowStock || item.isOutOfStock;
    
    return matchesSearch && matchesCategory && matchesLowStock;
  });

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Inventory Management</Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchInventory}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Update Stock
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search inventory..."
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
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  label="Category"
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={showLowStockOnly}
                    onChange={(e) => setShowLowStockOnly(e.target.checked)}
                  />
                }
                label="Low Stock Only"
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FilterList />}
                onClick={() => {
                  setSearchTerm('');
                  setFilterCategory('');
                  setShowLowStockOnly(false);
                }}
              >
                Clear
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Product</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Current Stock</TableCell>
              <TableCell>Available</TableCell>
              <TableCell>Reserved</TableCell>
              <TableCell>Min Stock</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredInventory.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Box>
                    <Typography variant="subtitle2">{item.product.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      SKU: {item.product.sku}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>{item.product.category?.name || 'No Category'}</TableCell>
                <TableCell>
                  <Typography variant="subtitle2">
                    {item.quantity} {item.product.unit}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {item.available} {item.product.unit}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {item.reserved} {item.product.unit}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {item.product.minStock} {item.product.unit}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={getStockStatusText(item)}
                    color={getStockStatusColor(item)}
                    size="small"
                    icon={item.isLowStock || item.isOutOfStock ? <Warning /> : undefined}
                  />
                </TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => handleOpenDialog(item)}>
                    <Edit />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Update Stock Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Update Stock</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Controller
                  name="productId"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.productId}>
                      <InputLabel>Product</InputLabel>
                      <Select {...field} label="Product">
                        {inventory.map((item) => (
                          <MenuItem key={item.product.id} value={item.product.id}>
                            {item.product.name} ({item.product.sku})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="quantity"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Quantity"
                      type="number"
                      error={!!errors.quantity}
                      helperText={errors.quantity?.message}
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
                      <InputLabel>Movement Type</InputLabel>
                      <Select {...field} label="Movement Type">
                        <MenuItem value="PURCHASE">Purchase</MenuItem>
                        <MenuItem value="SALE">Sale</MenuItem>
                        <MenuItem value="ADJUSTMENT">Adjustment</MenuItem>
                        <MenuItem value="TRANSFER">Transfer</MenuItem>
                        <MenuItem value="RETURN">Return</MenuItem>
                        <MenuItem value="DAMAGE">Damage</MenuItem>
                        <MenuItem value="EXPIRY">Expiry</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="reason"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Reason"
                      multiline
                      rows={2}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained">
              Update Stock
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default InventoryPage; 