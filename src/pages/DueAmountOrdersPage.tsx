import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { ArrowBack, Visibility } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { apiService } from '@/services/api';
import { useSettings } from '@/hooks/useSettings';

interface Order {
  id: string;
  orderNumber: string;
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
  status: string;
  type: string;
  total: number | string;
  createdAt: string;
}

interface OrderWithDue extends Order {
  dueAmount: number;
}

const chunk = <T,>(arr: T[], size: number) => {
  const res: T[][] = [];
  for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
  return res;
};

const DueAmountOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { formatCurrency } = useSettings();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderWithDue[]>([]);

  const fetchOrdersWithDueAmount = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1) Fetch all orders (paged, backend max is 100)
      const pageSize = 100;
      let page = 1;
      let pages = 1;
      let allOrders: Order[] = [];

      while (page <= pages) {
        const response = await apiService.get(`/orders?page=${page}&limit=${pageSize}`);
        const data = response?.data ?? response;

        if (response?.success && Array.isArray(data)) {
          allOrders = allOrders.concat(data);
          pages = response.pagination?.pages ?? pages;
        } else if (Array.isArray(data)) {
          allOrders = allOrders.concat(data);
          pages = page; // stop
        } else {
          break;
        }

        page += 1;
      }

      // 2) For each order, fetch due amount (batched to avoid too many parallel requests)
      const batches = chunk(allOrders, 25);
      const withDue: OrderWithDue[] = [];

      for (const batch of batches) {
        const results = await Promise.allSettled(
          batch.map(async (o) => {
            const r = await apiService.get(`/payments/order/${o.id}/due`);
            // server shape: { success: true, data: { orderId, dueAmount } }
            const dueAmount = Number(r?.data?.dueAmount ?? r?.dueAmount ?? r?.data?.data?.dueAmount ?? 0);
            return { ...o, dueAmount };
          })
        );

        for (const r of results) {
          if (r.status === 'fulfilled') withDue.push(r.value);
        }
      }

      // 3) Keep only orders where dueAmount > 0
      setOrders(withDue.filter((o) => o.dueAmount > 0).sort((a, b) => b.dueAmount - a.dueAmount));
    } catch (e) {
      console.error('Due amount orders fetch error:', e);
      setError('Failed to load orders with due amount');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrdersWithDueAmount();
  }, []);

  const totals = useMemo(() => {
    const totalDue = orders.reduce((sum, o) => sum + (Number(o.dueAmount) || 0), 0);
    const totalOrders = orders.length;
    return { totalDue, totalOrders };
  }, [orders]);

  return (
    <Box p={3}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3} gap={2} flexWrap="wrap">
        <Box display="flex" alignItems="center" gap={2}>
          <Button startIcon={<ArrowBack />} variant="outlined" onClick={() => navigate('/orders')}>
            Back to Orders
          </Button>
          <Typography variant="h4">Orders With Due Amount</Typography>
        </Box>

        <Button variant="outlined" onClick={fetchOrdersWithDueAmount} disabled={loading}>
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" gap={3} flexWrap="wrap">
            <Typography variant="body1">
              Showing <strong>{totals.totalOrders}</strong> order{totals.totalOrders === 1 ? '' : 's'} with due.
            </Typography>
            <Typography variant="body1">
              Total due: <strong>{formatCurrency(totals.totalDue)}</strong>
            </Typography>
          </Box>
        </CardContent>
      </Card>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Order #</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Total</TableCell>
              <TableCell>Due Amount</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No orders have a due amount
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id} hover>
                  <TableCell>
                    <Typography variant="subtitle2">{order.orderNumber}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2">
                      {order.customer?.firstName || 'N/A'} {order.customer?.lastName || ''}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {order.customer?.email || ''}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={(order.status || '').replace('_', ' ')} size="small" />
                  </TableCell>
                  <TableCell>{formatCurrency(Number(order.total) || 0)}</TableCell>
                  <TableCell>
                    <Chip
                      label={formatCurrency(Number(order.dueAmount) || 0)}
                      color="error"
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      startIcon={<Visibility />}
                      onClick={() => navigate(`/orders?orderId=${encodeURIComponent(order.id)}`)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default DueAmountOrdersPage;

