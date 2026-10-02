import React, { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import type { EmployeeMonthRow } from '@/services/salaryApi'
import { fullName } from '@/utils/salaryReport'

export interface SkipMonthDialogProps {
  open: boolean
  onClose: () => void
  row: EmployeeMonthRow | null
  periodLabel: string
  submitting: boolean
  format: (amount: number) => string
  onSubmit: (reason?: string) => void
}

const Line: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
  <Stack direction="row" justifyContent="space-between" alignItems="baseline">
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant="body2" fontWeight={600} color={color}>{value}</Typography>
  </Stack>
)

/**
 * Close a month without salary, for an employee who was not present for the
 * full month. Nothing is paid; what was already given stays as their pay.
 */
export const SkipMonthDialog: React.FC<SkipMonthDialogProps> = ({
  open,
  onClose,
  row,
  periodLabel,
  submitting,
  format,
  onSubmit,
}) => {
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (open) setReason('')
  }, [open, row])

  if (!row) return null

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>
        Skip {periodLabel}
        <Typography variant="body2" color="text.secondary">{fullName(row.user)}</Typography>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Alert severity="info">
            Use this when the employee was not here for the full month. No salary is calculated or paid for{' '}
            {periodLabel}; the month is closed as skipped.
          </Alert>

          <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Stack spacing={0.5}>
              <Line label="Base salary (not paid)" value={format(row.baseSalary)} color="text.disabled" />
              <Line
                label={`Already given this month (${row.payoutsCount})`}
                value={format(row.payoutsTotal)}
              />
              {row.previousBalance > 0 && (
                <Line label="Owed from earlier months (carries on)" value={format(row.previousBalance)} color="error.main" />
              )}
            </Stack>
          </Box>

          {row.payoutsTotal > 0 && (
            <Typography variant="body2" color="text.secondary">
              The {format(row.payoutsTotal)} already given stays as their pay for this month. It is not deducted
              from a later salary.
            </Typography>
          )}

          <TextField
            label="Reason (optional)"
            placeholder="Joined on the 20th, on leave, left mid-month…"
            value={reason}
            onChange={e => setReason(e.target.value)}
            fullWidth
            autoFocus
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button variant="contained" color="inherit" disabled={submitting} onClick={() => onSubmit(reason.trim() || undefined)}>
          {submitting ? 'Saving…' : 'Skip this month'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default SkipMonthDialog
