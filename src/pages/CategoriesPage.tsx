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
  Alert,
  CircularProgress,
  Fab,
  Tooltip,
  InputAdornment
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Search,
  Category,
  Folder
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { apiService } from '@/services/api';

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

const categorySchema = yup.object({
  name: yup.string().required('Category name is required'),
  description: yup.string(),
  parentId: yup.string(),
  sortOrder: yup.number().min(0, 'Sort order must be 0 or greater')
});

const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({
    resolver: yupResolver(categorySchema),
    defaultValues: {
      name: '',
      description: '',
      parentId: '',
      sortOrder: 0
    }
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await apiService.get(`/products/categories/all?t=${Date.now()}`);
      console.log('Categories response:', response);
      
      if (response.success && Array.isArray(response.data)) {
        setCategories(response.data);
        console.log('Categories set successfully (wrapped):', response.data);
      } else if (Array.isArray(response)) {
        setCategories(response);
        console.log('Categories set successfully (direct array):', response);
      } else {
        console.error('Invalid response format:', response);
        setError('Invalid response format from server');
      }
    } catch (err) {
      setError('Failed to load categories');
      console.error('Categories fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      reset({
        name: category.name,
        description: category.description,
        parentId: category.parentId || '',
        sortOrder: category.sortOrder
      });
    } else {
      setEditingCategory(null);
      reset();
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingCategory(null);
    reset();
  };

  const onSubmit = async (data: any) => {
    try {
      if (editingCategory) {
        await apiService.put(`/products/categories/${editingCategory.id}`, data);
      } else {
        await apiService.post('/products/categories', data);
      }
      fetchCategories();
      handleCloseDialog();
    } catch (err) {
      setError('Failed to save category');
      console.error('Category save error:', err);
    }
  };

  const handleDelete = async (categoryId: string) => {
    if (window.confirm('Are you sure you want to delete this category? This will also affect all products in this category.')) {
      try {
        await apiService.delete(`/products/categories/${categoryId}`);
        fetchCategories();
      } catch (err) {
        setError('Failed to delete category');
        console.error('Category delete error:', err);
      }
    }
  };

  const filteredCategories = (categories || []).filter(category => 
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  console.log('Categories state:', categories);
  console.log('Filtered categories:', filteredCategories);
  console.log('Search term:', searchTerm);

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
        <Typography variant="h4">Product Categories</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Add Category
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

             {/* Search */}
       <Card sx={{ mb: 3 }}>
         <CardContent>
           <TextField
             fullWidth
             placeholder="Search categories..."
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
         </CardContent>
       </Card>

       

      {/* Categories Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Category Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Parent Category</TableCell>
              <TableCell>Products</TableCell>
              <TableCell>Sort Order</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
                     <TableBody>
             {filteredCategories.length > 0 ? (
               filteredCategories.map((category) => (
                 <TableRow key={category.id}>
                   <TableCell>
                     <Box display="flex" alignItems="center">
                       <Category sx={{ mr: 1, color: 'primary.main' }} />
                       <Typography variant="subtitle2">{category.name}</Typography>
                     </Box>
                   </TableCell>
                   <TableCell>
                     <Typography variant="body2" color="text.secondary">
                       {category.description || 'No description'}
                     </Typography>
                   </TableCell>
                   <TableCell>
                     {category.parent ? (
                       <Chip
                         label={category.parent.name}
                         size="small"
                         variant="outlined"
                         icon={<Folder />}
                       />
                     ) : (
                       <Typography variant="body2" color="text.secondary">
                         Root Category
                       </Typography>
                     )}
                   </TableCell>
                   <TableCell>
                     <Chip
                       label={category._count?.products || 0}
                       size="small"
                       color="primary"
                       variant="outlined"
                     />
                   </TableCell>
                   <TableCell>{category.sortOrder}</TableCell>
                   <TableCell>
                     {new Date(category.createdAt).toLocaleDateString()}
                   </TableCell>
                   <TableCell>
                     <IconButton size="small" onClick={() => handleOpenDialog(category)}>
                       <Edit />
                     </IconButton>
                     <IconButton size="small" onClick={() => handleDelete(category.id)}>
                       <Delete />
                     </IconButton>
                   </TableCell>
                 </TableRow>
               ))
             ) : (
               <TableRow>
                 <TableCell colSpan={7} align="center">
                   <Typography variant="body2" color="text.secondary">
                     {loading ? 'Loading categories...' : 'No categories found'}
                   </Typography>
                 </TableCell>
               </TableRow>
             )}
           </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Category Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingCategory ? 'Edit Category' : 'Add New Category'}
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Category Name"
                      error={!!errors.name}
                      helperText={errors.name?.message}
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
                  name="parentId"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Parent Category ID (Optional)"
                      placeholder="Leave empty for root category"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="sortOrder"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Sort Order"
                      type="number"
                      error={!!errors.sortOrder}
                      helperText={errors.sortOrder?.message}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingCategory ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Floating Action Button */}
      <Tooltip title="Add Category">
        <Fab
          color="primary"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={() => handleOpenDialog()}
        >
          <Add />
        </Fab>
      </Tooltip>
    </Box>
  );
};

export default CategoriesPage;
