import React from 'react';
import { Box, Typography, Divider, Grid } from '@mui/material';
import { useSettings } from '@/hooks/useSettings';
import { useCompany } from '@/contexts/CompanyContext';

interface OrderReceiptProps {
  order: {
    id: string;
    orderNumber: string;
    customer: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
    };
    status: string;
    type: string;
    total: number | string;
    createdAt: string;
    items?: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      total: number | string;
      notes: string;
      product?: {
        name: string;
        sku: string;
      };
    }>;
    notes?: string;
  };
  dueAmount?: number;
}

const OrderReceipt: React.FC<OrderReceiptProps> = ({ order, dueAmount }) => {
  const { formatCurrency } = useSettings();
  const { companyInfo } = useCompany();

  const handlePrint = () => {
    const printContent = document.getElementById('order-receipt');
    if (printContent) {
      const originalContents = document.body.innerHTML;
      document.body.innerHTML = printContent.innerHTML;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload();
    }
  };

  return (
    <Box>
      {/* Print Button */}
      <Box mb={2} sx={{ '@media print': { display: 'none' } }}>
        <button
          onClick={handlePrint}
          style={{
            padding: '10px 20px',
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Print Receipt
        </button>
      </Box>

      {/* Receipt Content */}
      <Box
        id="order-receipt"
        sx={{
          maxWidth: '400px',
          margin: '0 auto',
          padding: '20px',
          border: '1px solid #ddd',
          borderRadius: '8px',
          backgroundColor: 'white',
          '@media print': {
            border: 'none',
            padding: '0',
            maxWidth: '100%'
          }
        }}
      >
        {/* Header */}
        <Box textAlign="center" mb={3}>
          {companyInfo.logo && (
            <Box
              component="img"
              src={companyInfo.logo}
              alt={`${companyInfo.name} Logo`}
              sx={{
                height: 60,
                width: 'auto',
                objectFit: 'contain',
                mb: 2,
              }}
            />
          )}
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            {companyInfo.name}
          </Typography>
          {companyInfo.address && (
            <Typography variant="body2" color="text.secondary">
              {companyInfo.address}
            </Typography>
          )}
          {(companyInfo.phone || companyInfo.email) && (
            <Typography variant="body2" color="text.secondary">
              {companyInfo.phone && `Phone: ${companyInfo.phone}`}
              {companyInfo.phone && companyInfo.email && ' | '}
              {companyInfo.email && `Email: ${companyInfo.email}`}
            </Typography>
          )}
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Receipt Title */}
        <Box textAlign="center" mb={2}>
          <Typography variant="h6" fontWeight="bold">
            ORDER RECEIPT
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Receipt #{order.orderNumber}
          </Typography>
        </Box>

        <Divider sx={{ mb: 2 }} />

                 {/* Order Details */}
         <Grid container spacing={2} mb={2}>
           <Grid item xs={6}>
             <Typography variant="body2" fontWeight="bold">Date:</Typography>
             <Typography variant="body2">
               {new Date(order.createdAt).toLocaleDateString()}
             </Typography>
           </Grid>
           <Grid item xs={6}>
             <Typography variant="body2" fontWeight="bold">Time:</Typography>
             <Typography variant="body2">
               {new Date(order.createdAt).toLocaleTimeString()}
             </Typography>
           </Grid>
         </Grid>

        <Divider sx={{ mb: 2 }} />

        {/* Customer Information */}
        <Box mb={2}>
          <Typography variant="body2" fontWeight="bold" gutterBottom>
            Customer Information:
          </Typography>
          <Typography variant="body2">
            {order.customer.firstName} {order.customer.lastName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {order.customer.email}
          </Typography>
          {order.customer.phone && (
            <Typography variant="body2" color="text.secondary">
              {order.customer.phone}
            </Typography>
          )}
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Order Items */}
        <Box mb={2}>
          <Typography variant="body2" fontWeight="bold" gutterBottom>
            Order Items:
          </Typography>
          {order.items && order.items.map((item, index) => (
            <Box key={index} mb={1}>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="body2" fontWeight="bold">
                    {item.product?.name || 'Unknown Product'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    SKU: {item.product?.sku || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={2}>
                  <Typography variant="body2">
                    Qty: {item.quantity}
                  </Typography>
                </Grid>
                <Grid item xs={2}>
                  <Typography variant="body2">
                    {formatCurrency(item.unitPrice)}
                  </Typography>
                </Grid>
                <Grid item xs={2}>
                  <Typography variant="body2" fontWeight="bold">
                    {formatCurrency(Number(item.total) || 0)}
                  </Typography>
                </Grid>
              </Grid>
              {item.notes && (
                <Typography variant="caption" color="text.secondary" display="block">
                  Note: {item.notes}
                </Typography>
              )}
            </Box>
          ))}
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Totals */}
        <Box mb={2}>
          <Grid container spacing={1}>
            <Grid item xs={8}>
              <Typography variant="body2" fontWeight="bold">
                Total Amount:
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="body2" fontWeight="bold">
                {formatCurrency(Number(order.total) || 0)}
              </Typography>
            </Grid>
            {dueAmount !== undefined && dueAmount > 0 && (
              <>
                <Grid item xs={8}>
                  <Typography variant="body2" color="error">
                    Due Amount:
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="body2" color="error" fontWeight="bold">
                    {formatCurrency(dueAmount)}
                  </Typography>
                </Grid>
              </>
            )}
          </Grid>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Notes */}
        {order.notes && (
          <Box mb={2}>
            <Typography variant="body2" fontWeight="bold" gutterBottom>
              Notes:
            </Typography>
            <Typography variant="body2">
              {order.notes}
            </Typography>
          </Box>
        )}

        {/* Footer */}
        <Box textAlign="center" mt={3}>
          <Typography variant="body2" color="text.secondary">
            Thank you for your business!
          </Typography>
          <Typography variant="caption" color="text.secondary">
            This is a computer generated receipt
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default OrderReceipt;
