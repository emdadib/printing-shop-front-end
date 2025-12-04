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
  Fab,
  Tooltip,
  Snackbar,
  InputAdornment
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Search,
  FilterList,
  Category,
  AutoAwesome
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate } from 'react-router-dom';
import { useCurrency } from '@/contexts/CurrencyContext';
import { apiService } from '@/services/api'
import { dataService } from '@/services/dataService';

interface Product {
  id: string;
  name: string;
  description: string;
  sku: string;
  barcode: string;
  basePrice: number;
  baseCostPrice: number;
  category: {
    id: string;
    name: string;
  };
  type: string;
  specifications: any;
  isActive: boolean;
  hasInventory: boolean;
  isCustomOrder: boolean;
  requiresSpecifications: boolean;
  pricingModel: string;
  minStock: number;
  maxStock: number;
  unit: string;
  hasWarranty: boolean;
  warrantyPeriod: number;
  warrantyPeriodType: string;
  warrantyDescription: string;
  createdAt: string;
  updatedAt: string;
}

interface Category {
  id: string;
  name: string;
  description: string;
  parentId?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  parent?: {
    id: string;
    name: string;
  };
  children?: Category[];
  _count?: {
    products: number;
  };
}

const productSchema = yup.object({
  name: yup.string().required('Product name is required'),
  description: yup.string(),
  sku: yup.string().required('SKU is required'),
  barcode: yup.string(),
  basePrice: yup.number().positive('Price must be positive').required('Price is required'),
  baseCostPrice: yup.number().positive('Cost must be positive').required('Cost is required'),
  categoryId: yup.string().required('Category is required'),
  type: yup.string().required('Product type is required'),
  pricingModel: yup.string().required('Pricing model is required'),
  hasInventory: yup.string(),
  isCustomOrder: yup.string(),
  requiresSpecifications: yup.string(),
  minStock: yup.number().min(0, 'Minimum stock cannot be negative'),
  maxStock: yup.number().min(0, 'Maximum stock cannot be negative'),
  unit: yup.string().required('Unit is required'),
  isActive: yup.boolean(),
  hasWarranty: yup.string(),
  warrantyPeriod: yup.number().min(0, 'Warranty period cannot be negative'),
  warrantyPeriodType: yup.string(),
  warrantyDescription: yup.string()
});

const ProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterType, setFilterType] = useState('');
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({ open: false, message: '', severity: 'success' });

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors }
  } = useForm({
    resolver: yupResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      sku: '',
      barcode: '',
      basePrice: 0,
      baseCostPrice: 0,
      categoryId: '',
      type: 'PHYSICAL',
      pricingModel: 'FIXED',
      hasInventory: "true",
      isCustomOrder: "false",
      requiresSpecifications: "false",
      minStock: 0,
      maxStock: 100,
      unit: 'piece',
      isActive: true
    }
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  // Auto-calculate warranty period based on type
  useEffect(() => {
    const warrantyPeriodType = watch('warrantyPeriodType');
    if (warrantyPeriodType && warrantyPeriodType !== 'CUSTOM') {
      let days = 0;
      switch (warrantyPeriodType) {
        case 'SIX_MONTHS':
          days = 180; // 6 months
          break;
        case 'ONE_YEAR':
          days = 365; // 1 year
          break;
        case 'TWO_YEARS':
          days = 730; // 2 years
          break;
        case 'THREE_YEARS':
          days = 1095; // 3 years
          break;
        case 'FIVE_YEARS':
          days = 1825; // 5 years
          break;
        case 'LIFETIME':
          days = 99999; // Very large number for lifetime
          break;
        default:
          days = 0;
      }
      setValue('warrantyPeriod', days);
    }
  }, [watch('warrantyPeriodType'), setValue]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      // Clear cache to ensure fresh data
      dataService.clearProductsCache();
      // Fetch all products by requesting a high limit to get all products
      const response = await apiService.get('/products?limit=1000');
      
      console.log('Products API response:', response);
      
      // Handle different response formats
      let productsList: Product[] = [];
      
      if (response.success && Array.isArray(response.data)) {
        productsList = response.data;
      } else if (Array.isArray(response)) {
        productsList = response;
      } else if (response.data && Array.isArray(response.data)) {
        productsList = response.data;
      } else if (response.success && response.data && Array.isArray(response.data)) {
        productsList = response.data;
      } else {
        console.error('Invalid products response format:', response);
        setError('Invalid response format from server. Please try refreshing the page.');
        return;
      }
      
      if (productsList.length > 0) {
        setProducts(productsList);
        console.log(`Loaded ${productsList.length} products`);
      } else {
        setProducts([]);
        console.log('No products found');
      }
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to load products';
      setError(errorMessage);
      console.error('Products fetch error:', err);
      setProducts([]); // Clear products on error
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await dataService.getCategories();
      let categoriesList: Category[] = [];
      
      // Handle different response formats
      if (response.success && Array.isArray(response.data)) {
        categoriesList = response.data;
      } else if (Array.isArray(response)) {
        categoriesList = response;
      } else if (response.data && Array.isArray(response.data)) {
        categoriesList = response.data;
      } else {
        // If response format is unexpected but no error, just log and use empty array
        console.warn('Unexpected categories response format:', response);
        categoriesList = [];
      }
      
      setCategories(categoriesList);
      
      // Only log if we expected categories but got none (not an error, just a warning)
      if (categoriesList.length === 0) {
        console.log('No categories found');
      }
    } catch (err) {
      // Only set error if there's an actual exception
      console.error('Categories fetch error:', err);
      // Don't set error state - categories are optional and shouldn't block the page
      // Just use empty array
      setCategories([]);
    }
  };

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      console.log('Opening edit dialog for product:', product);
      setEditingProduct(product);
      const formData = {
        name: product.name || '',
        description: product.description || '',
        sku: product.sku || '',
        barcode: product.barcode || '',
        basePrice: product.basePrice || 0,
        baseCostPrice: product.baseCostPrice || 0,
        categoryId: product.category?.id || '',
        type: product.type || 'PHYSICAL',
        pricingModel: product.pricingModel || 'FIXED',
        hasInventory: product.hasInventory?.toString() || 'false',
        isCustomOrder: product.isCustomOrder?.toString() || 'false',
        requiresSpecifications: product.requiresSpecifications?.toString() || 'false',
        minStock: product.minStock || 0,
        maxStock: product.maxStock || 0,
        unit: product.unit || 'piece',
        isActive: product.isActive ?? true,
        hasWarranty: product.hasWarranty?.toString() || 'false',
        warrantyPeriod: product.warrantyPeriod || 0,
        warrantyPeriodType: product.warrantyPeriodType || 'ONE_YEAR',
        warrantyDescription: product.warrantyDescription || ''
      };
      console.log('Form data being set:', formData);
      reset(formData);
    } else {
      setEditingProduct(null);
      reset({
        name: '',
        description: '',
        sku: '',
        barcode: '',
        basePrice: 0,
        baseCostPrice: 0,
        categoryId: '',
        type: 'PHYSICAL',
        pricingModel: 'FIXED',
        hasInventory: "true",
        isCustomOrder: "false",
        requiresSpecifications: "false",
        minStock: 0,
        maxStock: 100,
        unit: 'piece',
        isActive: true
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingProduct(null);
    reset({
      name: '',
      description: '',
      sku: '',
      barcode: '',
      basePrice: 0,
      baseCostPrice: 0,
      categoryId: '',
      type: 'PHYSICAL',
      pricingModel: 'FIXED',
      hasInventory: "true",
      isCustomOrder: "false",
      requiresSpecifications: "false",
      minStock: 0,
      maxStock: 100,
      unit: 'piece',
      isActive: true
    });
  };

  const handleGenerateSKU = async () => {
    try {
      const categoryId = watch('categoryId');
      if (!categoryId) {
        setSnackbar({
          open: true,
          message: 'Please select a category first',
          severity: 'warning'
        });
        return;
      }

      const response = await apiService.post('/products/generate-sku', {
        categoryId
      });

      if (response.success && response.data?.sku) {
        setValue('sku', response.data.sku);
        setSnackbar({
          open: true,
          message: 'SKU generated successfully',
          severity: 'success'
        });
      }
    } catch (err) {
      console.error('Generate SKU error:', err);
      setSnackbar({
        open: true,
        message: 'Failed to generate SKU',
        severity: 'error'
      });
    }
  };

  const onSubmit = async (data: any) => {
    try {
      setError(null); // Clear any previous errors
      
      // Convert string boolean values to actual booleans
      const processedData = {
        ...data,
        hasInventory: data.hasInventory === 'true',
        isCustomOrder: data.isCustomOrder === 'true',
        requiresSpecifications: data.requiresSpecifications === 'true',
        hasWarranty: data.hasWarranty === 'true'
      };

      console.log('Submitting product data:', processedData);
      console.log('Editing product:', editingProduct?.id);

      if (editingProduct) {
        const response = await apiService.put(`/products/${editingProduct.id}`, processedData);
        console.log('Update response:', response);
        showSnackbar('Product updated successfully!', 'success');
      } else {
        const response = await apiService.post('/products', processedData);
        console.log('Create response:', response);
        showSnackbar('Product created successfully!', 'success');
      }
      
      fetchProducts();
      handleCloseDialog();
    } catch (err: any) {
      console.error('Product save error:', err);
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to save product';
      setError(errorMessage);
    }
  };

  const handleDelete = async (productId: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await apiService.delete(`/products/${productId}`);
        fetchProducts();
        showSnackbar('Product deleted successfully!', 'success');
      } catch (err) {
        console.error('Product delete error:', err);
        showSnackbar('Failed to delete product', 'error');
      }
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const filteredProducts = (products || []).filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || product.category?.id === filterCategory;
    const matchesType = !filterType || product.type === filterType;
    
    return matchesSearch && matchesCategory && matchesType;
  });

  console.log('Products in state:', products);
  console.log('Filtered products:', filteredProducts);
  console.log('Sample product:', products[0]);

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
        <Typography variant="h4">Products</Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<Category />}
            onClick={() => navigate('/categories')}
            color="secondary"
          >
            Manage Categories
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Add Product
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
                placeholder="Search products..."
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
                  {(categories || []).map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
                         <Grid item xs={12} md={3}>
               <FormControl fullWidth>
                 <InputLabel>Type</InputLabel>
                 <Select
                   value={filterType}
                   onChange={(e) => setFilterType(e.target.value)}
                   label="Type"
                 >
                   <MenuItem value="">All Types</MenuItem>
                   <MenuItem value="PHYSICAL">Physical</MenuItem>
                   <MenuItem value="SERVICE">Service</MenuItem>
                   <MenuItem value="DIGITAL">Digital</MenuItem>
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
                  setFilterCategory('');
                  setFilterType('');
                }}
              >
                Clear
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Products Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Product</TableCell>
              <TableCell>SKU</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Stock</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredProducts.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <Box>
                    <Typography variant="subtitle2">{product.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {product.description}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>{product.sku}</TableCell>
                <TableCell>{product.category?.name || 'No Category'}</TableCell>
                                 <TableCell>{formatCurrency(Number(product.basePrice) || 0)}</TableCell>
                <TableCell>
                  <Chip
                    label={`${product.minStock} ${product.unit}`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={product.isActive ? 'Active' : 'Inactive'}
                    color={product.isActive ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => handleOpenDialog(product)}>
                    <Edit />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(product.id)}>
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Product Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingProduct ? 'Edit Product' : 'Add New Product'}
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      value={field.value || ''}
                      fullWidth
                      label="Product Name"
                      error={!!errors.name}
                      helperText={errors.name?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="sku"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      value={field.value || ''}
                      fullWidth
                      label="SKU"
                      error={!!errors.sku}
                      helperText={errors.sku?.message}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <Tooltip title="Auto-generate SKU">
                              <IconButton
                                onClick={handleGenerateSKU}
                                edge="end"
                                size="small"
                              >
                                <AutoAwesome />
                              </IconButton>
                            </Tooltip>
                          </InputAdornment>
                        )
                      }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      value={field.value || ''}
                      fullWidth
                      label="Description"
                      multiline
                      rows={3}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="basePrice"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      value={field.value || ''}
                      fullWidth
                      label="Price"
                      type="number"
                      error={!!errors.basePrice}
                      helperText={errors.basePrice?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                                 <Controller
                   name="baseCostPrice"
                   control={control}
                   render={({ field }) => (
                     <TextField
                       {...field}
                       value={field.value || ''}
                       fullWidth
                       label="Cost"
                       type="number"
                       error={!!errors.baseCostPrice}
                       helperText={errors.baseCostPrice?.message}
                     />
                   )}
                 />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="categoryId"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.categoryId}>
                      <InputLabel>Category</InputLabel>
                      <Select {...field} value={field.value || ''} label="Category">
                        {(categories || []).map((category) => (
                          <MenuItem key={category.id} value={category.id}>
                            {category.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.type}>
                      <InputLabel>Type</InputLabel>
                                             <Select {...field} value={field.value || ''} label="Type">
                         <MenuItem value="PHYSICAL">Physical</MenuItem>
                         <MenuItem value="SERVICE">Service</MenuItem>
                         <MenuItem value="DIGITAL">Digital</MenuItem>
                       </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="pricingModel"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.pricingModel}>
                      <InputLabel>Pricing Model</InputLabel>
                      <Select {...field} value={field.value || ''} label="Pricing Model">
                        <MenuItem value="FIXED">Fixed Price</MenuItem>
                        <MenuItem value="VARIABLE">Variable Pricing</MenuItem>
                        <MenuItem value="CUSTOM">Custom Pricing</MenuItem>
                        <MenuItem value="AREA_BASED">Area Based</MenuItem>
                        <MenuItem value="TIME_BASED">Time Based</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Controller
                  name="hasInventory"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Inventory Tracking</InputLabel>
                      <Select {...field} value={field.value || ''} label="Inventory Tracking">
                        <MenuItem value="true">Yes - Track Stock</MenuItem>
                        <MenuItem value="false">No - Custom Orders Only</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Controller
                  name="isCustomOrder"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Custom Order</InputLabel>
                      <Select {...field} value={field.value || ''} label="Custom Order">
                        <MenuItem value="true">Yes - Custom Orders</MenuItem>
                        <MenuItem value="false">No - Standard Product</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Controller
                  name="requiresSpecifications"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Requires Specs</InputLabel>
                      <Select {...field} value={field.value || ''} label="Requires Specs">
                        <MenuItem value="true">Yes - Needs Specs</MenuItem>
                        <MenuItem value="false">No - Standard Specs</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Controller
                  name="minStock"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      value={field.value || ''}
                      fullWidth
                      label="Minimum Stock"
                      type="number"
                      error={!!errors.minStock}
                      helperText={errors.minStock?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Controller
                  name="maxStock"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      value={field.value || ''}
                      fullWidth
                      label="Maximum Stock"
                      type="number"
                      error={!!errors.maxStock}
                      helperText={errors.maxStock?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Controller
                  name="unit"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.unit}>
                      <InputLabel>Unit</InputLabel>
                      <Select {...field} value={field.value || ''} label="Unit">
                        <MenuItem value="piece">Piece</MenuItem>
                        <MenuItem value="kg">Kilogram (kg)</MenuItem>
                        <MenuItem value="g">Gram (g)</MenuItem>
                        <MenuItem value="lb">Pound (lb)</MenuItem>
                        <MenuItem value="oz">Ounce (oz)</MenuItem>
                        <MenuItem value="liter">Liter (L)</MenuItem>
                        <MenuItem value="ml">Milliliter (ml)</MenuItem>
                        <MenuItem value="gallon">Gallon</MenuItem>
                        <MenuItem value="meter">Meter (m)</MenuItem>
                        <MenuItem value="cm">Centimeter (cm)</MenuItem>
                        <MenuItem value="mm">Millimeter (mm)</MenuItem>
                        <MenuItem value="inch">Inch</MenuItem>
                        <MenuItem value="foot">Foot (ft)</MenuItem>
                        <MenuItem value="yard">Yard</MenuItem>
                        <MenuItem value="sft">Square Feet (Sft)</MenuItem>
                        <MenuItem value="box">Box</MenuItem>
                        <MenuItem value="pack">Pack</MenuItem>
                        <MenuItem value="set">Set</MenuItem>
                        <MenuItem value="pair">Pair</MenuItem>
                        <MenuItem value="dozen">Dozen</MenuItem>
                        <MenuItem value="roll">Roll</MenuItem>
                        <MenuItem value="sheet">Sheet</MenuItem>
                        <MenuItem value="page">Page</MenuItem>
                        <MenuItem value="copy">Copy</MenuItem>
                        <MenuItem value="print">Print</MenuItem>
                        <MenuItem value="hour">Hour</MenuItem>
                        <MenuItem value="day">Day</MenuItem>
                        <MenuItem value="week">Week</MenuItem>
                        <MenuItem value="month">Month</MenuItem>
                        <MenuItem value="year">Year</MenuItem>
                      </Select>
                      {errors.unit && (
                        <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                          {errors.unit.message}
                        </Typography>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>
            </Grid>

            {/* Warranty Section */}
            <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
              Warranty Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Controller
                  name="hasWarranty"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.hasWarranty}>
                      <InputLabel>Has Warranty</InputLabel>
                      <Select {...field} value={field.value || 'false'} label="Has Warranty">
                        <MenuItem value="false">No Warranty</MenuItem>
                        <MenuItem value="true">Has Warranty</MenuItem>
                      </Select>
                      {errors.hasWarranty && (
                        <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                          {errors.hasWarranty.message}
                        </Typography>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="warrantyPeriodType"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.warrantyPeriodType}>
                      <InputLabel>Warranty Period Type</InputLabel>
                      <Select {...field} label="Warranty Period Type" disabled={watch('hasWarranty') !== 'true'}>
                        <MenuItem value="SIX_MONTHS">6 Months</MenuItem>
                        <MenuItem value="ONE_YEAR">1 Year</MenuItem>
                        <MenuItem value="TWO_YEARS">2 Years</MenuItem>
                        <MenuItem value="THREE_YEARS">3 Years</MenuItem>
                        <MenuItem value="FIVE_YEARS">5 Years</MenuItem>
                        <MenuItem value="LIFETIME">Lifetime</MenuItem>
                        <MenuItem value="CUSTOM">Custom Period</MenuItem>
                      </Select>
                      {errors.warrantyPeriodType && (
                        <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                          {errors.warrantyPeriodType.message}
                        </Typography>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="warrantyPeriod"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label={watch('warrantyPeriodType') === 'CUSTOM' ? 'Warranty Period (Days)' : 'Warranty Period (Days)'}
                      type="number"
                      error={!!errors.warrantyPeriod}
                      helperText={
                        watch('warrantyPeriodType') === 'CUSTOM' 
                          ? errors.warrantyPeriod?.message || 'Enter custom warranty period in days'
                          : `Auto-calculated: ${field.value || 0} days (${watch('warrantyPeriodType')?.replace('_', ' ').toLowerCase()})`
                      }
                      disabled={watch('hasWarranty') !== 'true' || watch('warrantyPeriodType') !== 'CUSTOM'}
                      InputProps={{
                        readOnly: watch('warrantyPeriodType') !== 'CUSTOM'
                      }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="warrantyDescription"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Warranty Description"
                      multiline
                      rows={3}
                      error={!!errors.warrantyDescription}
                      helperText={errors.warrantyDescription?.message}
                      disabled={watch('hasWarranty') !== 'true'}
                      placeholder="Describe warranty terms and conditions..."
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingProduct ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Floating Action Button */}
      <Tooltip title="Add Product">
        <Fab
          color="primary"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={() => handleOpenDialog()}
        >
          <Add />
        </Fab>
      </Tooltip>

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

export default ProductsPage; 