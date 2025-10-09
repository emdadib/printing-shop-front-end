import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Tabs,
  Tab,
  Pagination,
  // Divider // Unused import
} from '@mui/material';
import {
  Download,
  Refresh,
  // Print, // Unused import
  FilterList
} from '@mui/icons-material';
import { Helmet } from 'react-helmet-async';
import { apiService } from '@/services/api';
import { useSettings } from '@/hooks/useSettings';
import { usePhotocopySetting } from '@/hooks/usePhotocopySetting';






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
}

interface PhotocopyLedgerData {
  orders: Array<{
    id: string;
    orderNumber: string;
    subtotal: number;
    discountAmount: number;
    total: number;
    createdAt: string;
    customer?: {
      firstName: string;
      lastName: string;
      phone: string;
    } | null;
    items: Array<{
      product: {
        name: string;
        sku: string;
      };
      quantity: number;
      unitPrice: number;
      total: number;
    }>;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  summary: {
    totalOrders: number;
    totalSubtotal: number;
    totalDiscount: number;
    totalAmount: number;
    totalCopies: number;
  };
}

interface ProfitReportData {
  summary: {
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    overallMargin: number;
    orderCount: number;
    averageOrderProfit: number;
    averageOrderMargin: number;
  };
  profitByProduct: Array<{
    productId: string;
    productName: string;
    sku: string;
    revenue: number;
    cost: number;
    profit: number;
    quantity: number;
    margin: number;
  }>;
  profitByOrder: Array<{
    orderId: string;
    orderNumber: string;
    revenue: number;
    cost: number;
    profit: number;
    margin: number;
    itemCount: number;
    createdAt: string;
  }>;
  period: {
    startDate: string | null;
    endDate: string | null;
  };
}

const ReportsPage: React.FC = () => {
  const { formatCurrency } = useSettings();
  const { isEnabled: isPhotocopyServiceEnabled } = usePhotocopySetting();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [photocopyLedger, setPhotocopyLedger] = useState<PhotocopyLedgerData | null>(null);
  const [photocopyLoading, setPhotocopyLoading] = useState(false);
  const [profitReport, setProfitReport] = useState<ProfitReportData | null>(null);
  const [profitLoading, setProfitLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  // Handle tab switching when photocopy setting changes
  useEffect(() => {
    if (!isPhotocopyServiceEnabled && activeTab === 1) {
      // If photocopy is disabled and user is on photocopy tab, switch to profit report
      setActiveTab(1); // This will be the profit report tab when photocopy is disabled
    }
  }, [isPhotocopyServiceEnabled, activeTab]);

  useEffect(() => {
    if (activeTab === 1 && isPhotocopyServiceEnabled) {
      fetchPhotocopyLedger();
    } else if ((activeTab === 2 && isPhotocopyServiceEnabled) || (activeTab === 1 && !isPhotocopyServiceEnabled)) {
      fetchProfitReport();
    }
  }, [activeTab, currentPage, startDate, endDate, isPhotocopyServiceEnabled]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/reports/dashboard');
      if (response.success && response.data) {
        setDashboardStats(response.data);
      } else {
        setDashboardStats(response);
      }
    } catch (err) {
      setError('Failed to load dashboard stats');
      console.error('Dashboard stats error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPhotocopyLedger = async () => {
    try {
      setPhotocopyLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      });
      
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await apiService.get(`/photocopy/ledger?${params}`);
      if (response.success && response.data) {
        setPhotocopyLedger(response.data);
      }
    } catch (err) {
      setError('Failed to load photocopy ledger');
      console.error('Photocopy ledger error:', err);
    } finally {
      setPhotocopyLoading(false);
    }
  };

  const fetchProfitReport = async () => {
    try {
      setProfitLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await apiService.get(`/reports/profit?${params.toString()}`);
      if (response.success && response.data) {
        setProfitReport(response.data);
      }
    } catch (err) {
      setError('Failed to load profit report');
      console.error('Profit report error:', err);
    } finally {
      setProfitLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'CANCELLED':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading && !dashboardStats) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Helmet>
        <title>Reports & Analytics - PrintShop Management</title>
      </Helmet>
      <Box p={3}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">Reports & Analytics</Typography>
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchDashboardStats}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<Download />}
            >
              Export Report
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
            <Tab label="Dashboard" />
            {isPhotocopyServiceEnabled && <Tab label="Photocopy Ledger" />}
            <Tab label="Profit Report" />
          </Tabs>
        </Box>

        {/* Dashboard Content */}
        {activeTab === 0 && dashboardStats && (
          <Grid container spacing={3}>
            {/* Today's Stats */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Today's Performance</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Box textAlign="center">
                        <Typography variant="h4" color="primary">
                          {dashboardStats.today?.orders || 0}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Orders
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box textAlign="center">
                        <Typography variant="h4" color="success.main">
                          {formatCurrency(dashboardStats.today?.sales || 0)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Sales
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Month's Stats */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>This Month</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Box textAlign="center">
                        <Typography variant="h4" color="primary">
                          {dashboardStats.month?.orders || 0}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Orders
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box textAlign="center">
                        <Typography variant="h4" color="success.main">
                          {formatCurrency(dashboardStats.month?.sales || 0)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Sales
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Alerts */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Alerts</Typography>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary={`${dashboardStats.pendingOrders} Pending Orders`}
                        secondary="Orders awaiting processing"
                      />
                      <ListItemSecondaryAction>
                        <Chip
                          label={dashboardStats.pendingOrders}
                          color="warning"
                          size="small"
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary={`${dashboardStats.lowStockCount} Low Stock Items`}
                        secondary="Items below minimum stock level"
                      />
                      <ListItemSecondaryAction>
                        <Chip
                          label={dashboardStats.lowStockCount}
                          color="error"
                          size="small"
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Recent Orders */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Recent Orders</Typography>
                  <List>
                    {dashboardStats.recentOrders && dashboardStats.recentOrders.length > 0 ? (
                      dashboardStats.recentOrders.map((order) => (
                        <ListItem key={order.id} divider>
                          <ListItemText
                            primary={`Order #${order.orderNumber}`}
                            secondary={`${order.customer?.firstName || 'Unknown'} ${order.customer?.lastName || 'Customer'} - ${formatCurrency(order.total)}`}
                          />
                          <ListItemSecondaryAction>
                            <Chip
                              label={order.status}
                              color={getStatusColor(order.status) as any}
                              size="small"
                            />
                          </ListItemSecondaryAction>
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
          </Grid>
        )}

        {/* Photocopy Ledger Content */}
        {activeTab === 1 && isPhotocopyServiceEnabled && (
          <Box>
            {/* Filters */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <FilterList sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Filters
                </Typography>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      label="Start Date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      label="End Date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Button
                      variant="contained"
                      onClick={fetchPhotocopyLedger}
                      disabled={photocopyLoading}
                      startIcon={<Refresh />}
                    >
                      Apply Filters
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setStartDate('');
                        setEndDate('');
                        setCurrentPage(1);
                      }}
                    >
                      Clear Filters
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Summary Cards */}
            {photocopyLedger && (
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="h4" color="primary">
                        {photocopyLedger.summary.totalOrders}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Orders
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="h4" color="success.main">
                        {photocopyLedger.summary.totalCopies}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Copies
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="h4" color="warning.main">
                        {formatCurrency(photocopyLedger.summary.totalDiscount)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Discount
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="h4" color="success.main">
                        {formatCurrency(photocopyLedger.summary.totalAmount)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Revenue
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            {/* Ledger Table */}
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">Photocopy Orders</Typography>
                  <Button
                    variant="outlined"
                    startIcon={<Download />}
                    disabled={!photocopyLedger}
                  >
                    Export
                  </Button>
                </Box>

                {photocopyLoading ? (
                  <Box display="flex" justifyContent="center" p={3}>
                    <CircularProgress />
                  </Box>
                ) : photocopyLedger && photocopyLedger.orders.length > 0 ? (
                  <>
                    <TableContainer component={Paper}>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Order #</TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell>Customer</TableCell>
                            <TableCell>Copies</TableCell>
                            <TableCell>Subtotal</TableCell>
                            <TableCell>Discount</TableCell>
                            <TableCell>Total</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {photocopyLedger.orders.map((order) => {
                            const copyItems = order.items.filter(item => 
                              item.product.name.includes('১ পৃষ্ঠা') || 
                              item.product.name.includes('উভয় পৃষ্ঠা')
                            );
                            const totalCopies = copyItems.reduce((sum, item) => sum + item.quantity, 0);
                            
                            return (
                              <TableRow key={order.id}>
                                <TableCell>
                                  <Typography variant="subtitle2">
                                    {order.orderNumber}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  {new Date(order.createdAt).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                  {order.customer ? (
                                    <Box>
                                      <Typography variant="body2">
                                        {order.customer.firstName} {order.customer.lastName}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {order.customer.phone}
                                      </Typography>
                                    </Box>
                                  ) : (
                                    <Typography variant="body2" color="text.secondary">
                                      Walk-in Customer
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2">
                                    {totalCopies} copies
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  {formatCurrency(order.subtotal)}
                                </TableCell>
                                <TableCell>
                                  {order.discountAmount > 0 ? (
                                    <Typography variant="body2" color="error">
                                      -{formatCurrency(order.discountAmount)}
                                    </Typography>
                                  ) : (
                                    <Typography variant="body2" color="text.secondary">
                                      No discount
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Typography variant="subtitle2" color="success.main">
                                    {formatCurrency(order.total)}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    {/* Pagination */}
                    {photocopyLedger.pagination.pages > 1 && (
                      <Box display="flex" justifyContent="center" mt={3}>
                        <Pagination
                          count={photocopyLedger.pagination.pages}
                          page={currentPage}
                          onChange={(_, page) => setCurrentPage(page)}
                          color="primary"
                        />
                      </Box>
                    )}
                  </>
                ) : (
                  <Box textAlign="center" p={3}>
                    <Typography variant="body1" color="text.secondary">
                      No photocopy orders found for the selected period.
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Profit Report Content */}
        {((activeTab === 2 && isPhotocopyServiceEnabled) || (activeTab === 1 && !isPhotocopyServiceEnabled)) && (
          <Box>
            {/* Filters */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <FilterList sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Filters
                </Typography>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      label="Start Date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      label="End Date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Button
                      variant="contained"
                      onClick={fetchProfitReport}
                      disabled={profitLoading}
                      startIcon={<Refresh />}
                    >
                      Apply Filters
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setStartDate('');
                        setEndDate('');
                        setCurrentPage(1);
                      }}
                    >
                      Clear Filters
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Summary Cards */}
            {profitReport && (
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="h4" color="success.main">
                        {formatCurrency(profitReport.summary.totalRevenue)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Revenue
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="h4" color="error.main">
                        {formatCurrency(profitReport.summary.totalCost)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Cost
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="h4" color="primary">
                        {formatCurrency(profitReport.summary.totalProfit)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Profit
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="h4" color="info.main">
                        {profitReport.summary.overallMargin.toFixed(1)}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Profit Margin
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            {/* Profit by Product */}
            {profitReport && profitReport.profitByProduct.length > 0 && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Top Products by Profit
                  </Typography>
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Product</TableCell>
                          <TableCell>SKU</TableCell>
                          <TableCell>Quantity</TableCell>
                          <TableCell>Revenue</TableCell>
                          <TableCell>Cost</TableCell>
                          <TableCell>Profit</TableCell>
                          <TableCell>Margin</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {profitReport.profitByProduct.map((product) => (
                          <TableRow key={product.productId}>
                            <TableCell>
                              <Typography variant="subtitle2">
                                {product.productName}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {product.sku}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {product.quantity}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="success.main">
                                {formatCurrency(product.revenue)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="error.main">
                                {formatCurrency(product.cost)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography 
                                variant="body2" 
                                color={product.profit >= 0 ? "success.main" : "error.main"}
                              >
                                {formatCurrency(product.profit)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={`${product.margin.toFixed(1)}%`}
                                color={product.margin >= 20 ? "success" : product.margin >= 10 ? "warning" : "error"}
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            )}

            {/* Profit by Order */}
            {profitReport && profitReport.profitByOrder.length > 0 && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Top Orders by Profit
                  </Typography>
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Order #</TableCell>
                          <TableCell>Date</TableCell>
                          <TableCell>Items</TableCell>
                          <TableCell>Revenue</TableCell>
                          <TableCell>Cost</TableCell>
                          <TableCell>Profit</TableCell>
                          <TableCell>Margin</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {profitReport.profitByOrder.map((order) => (
                          <TableRow key={order.orderId}>
                            <TableCell>
                              <Typography variant="subtitle2">
                                {order.orderNumber}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {new Date(order.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {order.itemCount} items
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="success.main">
                                {formatCurrency(order.revenue)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="error.main">
                                {formatCurrency(order.cost)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography 
                                variant="body2" 
                                color={order.profit >= 0 ? "success.main" : "error.main"}
                              >
                                {formatCurrency(order.profit)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={`${order.margin.toFixed(1)}%`}
                                color={order.margin >= 20 ? "success" : order.margin >= 10 ? "warning" : "error"}
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            )}

            {profitLoading && (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            )}

            {!profitLoading && (!profitReport || (profitReport.profitByProduct.length === 0 && profitReport.profitByOrder.length === 0)) && (
              <Box textAlign="center" p={3}>
                <Typography variant="body1" color="text.secondary">
                  No profit data found for the selected period.
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </>
  );
};

export default ReportsPage; 