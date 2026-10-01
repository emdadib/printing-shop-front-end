import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { apiService } from '@/services/api';
import { splitCustomerName } from '@/utils/customerName';

export interface QuickCustomer {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
}

interface QuickCustomerDialogProps {
  open: boolean;
  /** Pre-fills the name field, e.g. with the text typed into the customer search. */
  initialName?: string;
  onClose: () => void;
  onCreated: (customer: QuickCustomer) => void;
}

interface ApiErrorShape {
  message?: string;
  response?: { data?: { message?: string; errors?: Array<{ message?: string }> } };
}

const getErrorMessage = (error: unknown): string => {
  const err = error as ApiErrorShape | undefined;
  return (
    err?.response?.data?.message ||
    err?.response?.data?.errors?.[0]?.message ||
    err?.message ||
    'Failed to create customer'
  );
};

/**
 * Minimal "create customer" dialog for the POS. Only a name is required; it is
 * split into first/last name for the API. Phone is optional.
 */
const QuickCustomerDialog: React.FC<QuickCustomerDialogProps> = ({
  open,
  initialName = '',
  onClose,
  onCreated,
}) => {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Reset the form every time the dialog is opened
  useEffect(() => {
    if (open) {
      setName(initialName);
      setPhone('');
      setNameError(null);
      setSubmitError(null);
      setSaving(false);
    }
  }, [open, initialName]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { firstName, lastName } = splitCustomerName(name);
    if (!firstName) {
      setNameError('Customer name is required');
      return;
    }

    setNameError(null);
    setSubmitError(null);
    setSaving(true);
    try {
      const payload: { firstName: string; lastName: string; phone?: string } = { firstName, lastName };
      const trimmedPhone = phone.trim();
      if (trimmedPhone) {
        payload.phone = trimmedPhone;
      }

      const response = await apiService.post('/customers', payload);
      const created: QuickCustomer | undefined = response?.data ?? response;
      if (!created?.id) {
        throw new Error('Unexpected response from server');
      }
      onCreated(created);
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="xs">
      <form onSubmit={handleSubmit} noValidate>
        <DialogTitle>New Customer</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {submitError && <Alert severity="error">{submitError}</Alert>}
            <TextField
              label="Customer name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
              fullWidth
              size="small"
              error={!!nameError}
              helperText={nameError ?? 'Only a name is needed. Phone is optional.'}
            />
            <TextField
              label="Phone (optional)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              fullWidth
              size="small"
              inputProps={{ inputMode: 'tel' }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            Create Customer
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default QuickCustomerDialog;
