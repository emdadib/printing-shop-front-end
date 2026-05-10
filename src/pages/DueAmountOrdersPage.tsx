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
  TablePagination,
  TableRow,
  Typography,
} from '@mui/material';
import { ArrowBack, Visibility } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { apiService } from '@/services/api';
import { useSettings } from '@/hooks/useSettings';

interface OrderWithDue {
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
  dueAmount: number;
}

interface DueOrdersResponse {
  success: boolean;
  data: OrderWithDue[];
  pagination: { page: number; limit: number; total: number; pages: number };
  summary: { totalOrders: number; totalDue: number };
}

const DueAmountOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { formatCurrency } = useSettings();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderWithDue[]>([]);
  const [page, setPage] = useState(0); // MUI TablePagination is 0-indexed
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalRows, setTotalRows] = useState(0);
  const [totalDueAll, setTotalDueAll] = useState(0);

  const fetchOrdersWithDueAmount = async (pageIndex: number, limit: number) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiService.get<DueOrdersResponse>(
        `/orders/with-due?page=${pageIndex + 1}&limit=${limit}`
      );

      if (response?.success) {
        const list = (response.data || []).map((o) => ({
          ...o,
          dueAmount: Number(o.dueAmount) || 0,
        }));
        setOrders(list);
        setTotalRows(response.pagination?.total ?? list.length);
        setTotalDueAll(Number(response.summary?.totalDue) || 0);
      } else {
        setOrders([]);
        setTotalRows(0);
        setTotalDueAll(0);
      }
    } catch (e) {
      console.error('Due amount orders fetch error:', e);
      setError('Failed to load orders with due amount');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrdersWithDueAmount(page, rowsPerPage);
  }, [page, rowsPerPage]);

  const pageDueTotal = useMemo(
    () => orders.reduce((sum, o) => sum + (Number(o.dueAmount) || 0), 0),
    [orders]
  );

  const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);
  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  return (
    <Box p={3}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3} gap={2} flexWrap="wrap">
        <Box display="flex" alignItems="center" gap={2}>
          <Button startIcon={<ArrowBack />} variant="outlined" onClick={() => navigate('/orders')}>
            Back to Orders
          </Button>
          <Typography variant="h4">Orders With Due Amount</Typography>
        </Box>

        <Button
          variant="outlined"
          onClick={() => fetchOrdersWithDueAmount(page, rowsPerPage)}
          disabled={loading}
        >
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
              <strong>{totalRows}</strong> order{totalRows === 1 ? '' : 's'} with due (all pages).
            </Typography>
            <Typography variant="body1">
              Total due (all pages): <strong>{formatCurrency(totalDueAll)}</strong>
            </Typography>
            <Typography variant="body1" color="text.secondary">
              This page: <strong>{formatCurrency(pageDueTotal)}</strong>
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
        <TablePagination
          component="div"
          count={totalRows}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </TableContainer>
    </Box>
  );
};

export default DueAmountOrdersPage;
