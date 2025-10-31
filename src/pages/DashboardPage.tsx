import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  ShoppingCart,
  People,
  Inventory,
  AttachMoney,
  Schedule,
  Warning,
  ContentCopy
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/contexts/CurrencyContext';
import { apiService } from '@/services/api';

interface DashboardStats {
  today: {
    orders: number;
    sales: number;
  };
  month: {
    orders: number;
    sales: number;
  };
  pendingOrders: number;
  lowStockCount: number;
  lowStockProducts: Array<{
    id: string;
    product?: {
      name: string;
      sku: string;
    } | null;
    quantity: number;
  }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    total: number;
    status: string;
    customer?: {
      firstName: string;
      lastName: string;
    } | null;
    createdAt: string;
  }>;
  weeklySalesData: Array<{
    name: string;
    sales: number;
  }>;
  orderStatusData: Array<{
    name: string;
    value: number;
    percentage: number;
    color: string;
  }>;
}

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use real data from API or fallback to empty arrays
  const salesData = stats?.weeklySalesData || [];
  const orderStatusData = stats?.orderStatusData || [];

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/reports/dashboard');
      if (response.success && response.data) {
        setStats(response.data);
      } else {
        setStats(response);
      }
    } catch (err) {
      setError('Failed to load dashboard statistics');
      console.error('Dashboard stats error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'IN_PROGRESS':
        return 'info';
      case 'CANCELLED':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Welcome Header */}
      <Box mb={3} display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Welcome back, {user?.firstName}!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Here's what's happening with your printing shop today.
          </Typography>
        </Box>
        <Box display="flex" flexWrap="wrap" gap={1.5} sx={{ justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
          <Button 
            variant="contained" 
            startIcon={<ShoppingCart />}
            onClick={() => navigate('/orders')}
            size="small"
          >
            New Order
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<People />}
            onClick={() => navigate('/customers')}
            size="small"
          >
            Add Customer
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<Inventory />}
            onClick={() => navigate('/inventory')}
            size="small"
          >
            Update Inventory
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<AttachMoney />}
            onClick={() => navigate('/orders')}
            size="small"
          >
            Process Payment
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<ContentCopy />}
            onClick={() => navigate('/photocopy')}
            size="small"
          >
            Photocopy Service
          </Button>
        </Box>
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Today's Orders
                  </Typography>
                  <Typography variant="h4">
                    {stats?.today?.orders || 0}
                  </Typography>
                </Box>
                <ShoppingCart color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Today's Sales
                  </Typography>
                  <Typography variant="h4">
                    {formatCurrency(typeof stats?.today?.sales === 'number' ? stats.today.sales : parseFloat(String(stats?.today?.sales || 0)))}
                  </Typography>
                </Box>
                <AttachMoney color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Pending Orders
                  </Typography>
                  <Typography variant="h4">
                    {stats?.pendingOrders || 0}
                  </Typography>
                </Box>
                <Schedule color="warning" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Low Stock Items
                  </Typography>
                  <Typography variant="h4">
                    {stats?.lowStockCount || 0}
                  </Typography>
                </Box>
                <Warning color="error" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts and Data */}
      <Grid container spacing={3}>
        {/* Sales Chart */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Weekly Sales Trend
              </Typography>
              {salesData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Sales']} />
                    <Line type="monotone" dataKey="sales" stroke="#1976d2" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                  <Typography color="text.secondary">
                    No sales data available for the past week
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Order Status Chart */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Order Status Distribution
              </Typography>
              {orderStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={orderStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name} ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {orderStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                  <Typography color="text.secondary">
                    No order data available
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Orders */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Orders
              </Typography>
              <List>
                {stats?.recentOrders && stats.recentOrders.length > 0 ? (
                  stats.recentOrders.slice(0, 5).map((order) => (
                    <ListItem key={order.id} divider>
                      <ListItemIcon>
                        <ShoppingCart />
                      </ListItemIcon>
                      <ListItemText
                        primary={`${order.customer?.firstName || 'Unknown'} ${order.customer?.lastName || 'Customer'}`}
                        secondary={`${order.orderNumber} - ${formatCurrency(typeof order.total === 'number' ? order.total : parseFloat(order.total || 0))}`}
                      />
                      <Chip
                        label={order.status}
                        color={getStatusColor(order.status) as any}
                        size="small"
                      />
                    </ListItem>
                  ))
                ) : (
                  <ListItem>
                    <ListItemText
                      primary="No recent orders"
                      secondary="Orders will appear here once they are created"
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Low Stock Alerts */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Low Stock Alerts
              </Typography>
              <List>
                {stats?.lowStockProducts && stats.lowStockProducts.length > 0 ? (
                  stats.lowStockProducts.slice(0, 5).map((item) => (
                    <ListItem key={item.id} divider>
                      <ListItemIcon>
                        <Warning color="error" />
                      </ListItemIcon>
                      <ListItemText
                        primary={item.product?.name || 'Unknown Product'}
                        secondary={`SKU: ${item.product?.sku || 'N/A'} - Qty: ${item.quantity || 0}`}
                      />
                      <Button 
                        size="small" 
                        variant="outlined" 
                        color="primary"
                        onClick={() => navigate('/purchase-orders')}
                      >
                        Reorder
                      </Button>
                    </ListItem>
                  ))
                ) : (
                  <ListItem>
                    <ListItemText
                      primary="No low stock alerts"
                      secondary="All products are well stocked"
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

    </Box>
  );
};

export default DashboardPage; 