import React, { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import type { EmployeeMonthRow } from '@/services/salaryApi'
import type { User } from '@/services/userApi'
import { fullName, todayIso } from '@/utils/salaryReport'

export interface PaySalaryDialogProps {
  open: boolean
  onClose: () => void
  periodLabel: string
  rows: EmployeeMonthRow[]
  users: User[]
  initialUserId?: string
  submitting: boolean
  format: (amount: number) => string
  onSubmit: (data: { userId: string; amount: number; date: string; reason?: string }) => void
}

/**
 * "Give salary now": records cash handed to an employee during the month.
 * The amount counts against that month's salary at processing time.
 */
export const PaySalaryDialog: React.FC<PaySalaryDialogProps> = ({
  open,
  onClose,
  periodLabel,
  rows,
  users,
  initialUserId,
  submitting,
  format,
  onSubmit,
}) => {
  const [userId, setUserId] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayIso())
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (open) {
      setUserId(initialUserId ?? '')
      setAmount('')
      setDate(todayIso())
      setReason('')
    }
  }, [open, initialUserId])

  const rowByUser = useMemo(() => new Map(rows.map(r => [r.userId, r])), [rows])

  const options = useMemo(() => {
    const active = users.filter(u => u.isActive)
    // Employees with a base salary first, then everyone else alphabetically.
    return active.sort((a, b) => {
      const pa = rowByUser.get(a.id)?.hasProfile ? 0 : 1
      const pb = rowByUser.get(b.id)?.hasProfile ? 0 : 1
      return pa - pb || fullName(a).localeCompare(fullName(b))
    })
  }, [users, rowByUser])

  const row = userId ? rowByUser.get(userId) : undefined
  const value = parseFloat(amount) || 0
  const remaining = row ? row.netAmount : null
  const processed = row?.status === 'PROCESSED'
  const exceeds = remaining !== null && value > remaining

  const canSubmit = !!userId && value > 0 && !!date && !processed && !submitting

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Pay salary — {periodLabel}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <FormControl fullWidth>
            <InputLabel id="pay-salary-employee">Employee</InputLabel>
            <Select
              labelId="pay-salary-employee"
              label="Employee"
              value={userId}
              onChange={e => setUserId(String(e.target.value))}
            >
              {options.map(u => {
                const r = rowByUser.get(u.id)
                return (
                  <MenuItem key={u.id} value={u.id}>
                    {fullName(u)}
                    {r?.hasProfile ? ` — ${format(r.baseSalary)}/month` : ' — no base salary'}
                  </MenuItem>
                )
              })}
            </Select>
          </FormControl>

          {row && (
            <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Base salary</Typography>
                <Typography variant="body2" fontWeight={600}>{format(row.baseSalary)}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Given so far this month</Typography>
                <Typography variant="body2" fontWeight={600}>{format(row.payoutsTotal)}</Typography>
              </Stack>
              {row.previousBalance > 0 && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Owed from earlier months</Typography>
                  <Typography variant="body2" fontWeight={600} color="error.main">{format(row.previousBalance)}</Typography>
                </Stack>
              )}
              <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
                <Typography variant="body2" fontWeight={700}>Remaining for this month</Typography>
                <Typography
                  variant="body2"
                  fontWeight={700}
                  color={remaining !== null && remaining < 0 ? 'error.main' : 'success.main'}
                >
                  {format(remaining ?? 0)}
                </Typography>
              </Stack>
            </Box>
          )}

          {processed && (
            <Alert severity="error">
              {periodLabel} is already processed for this employee. Undo the processing before giving more salary for this month.
            </Alert>
          )}

          <TextField
            label="Amount"
            type="number"
            inputProps={{ min: 0, step: '0.01', inputMode: 'decimal' }}
            value={amount}
            onChange={e => setAmount(e.target.value)}
            fullWidth
            autoFocus
          />

          <TextField
            label="Date given"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />

          <TextField
            label="Reason (optional)"
            value={reason}
            onChange={e => setReason(e.target.value)}
            fullWidth
          />

          {exceeds && !processed && (
            <Alert severity="warning">
              This is {format(value - (remaining ?? 0))} more than what is left for {periodLabel}. The extra will be
              carried forward and taken off the next month's salary.
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!canSubmit}
          onClick={() => onSubmit({ userId, amount: value, date, reason: reason.trim() || undefined })}
        >
          {submitting ? 'Saving…' : 'Record payment'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default PaySalaryDialog
