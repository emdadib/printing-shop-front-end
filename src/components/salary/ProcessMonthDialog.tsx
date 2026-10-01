import React, { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import type { EmployeeMonthRow } from '@/services/salaryApi'
import { fullName } from '@/utils/salaryReport'

export interface ProcessMonthDialogProps {
  open: boolean
  onClose: () => void
  row: EmployeeMonthRow | null
  periodLabel: string
  /** The month is still running; processing now is allowed but flagged. */
  periodUnfinished: boolean
  submitting: boolean
  format: (amount: number) => string
  onSubmit: (data: { deductions: number; bonuses: number; notes?: string }) => void
}

const Line: React.FC<{ label: string; value: string; color?: string; bold?: boolean }> = ({ label, value, color, bold }) => (
  <Stack direction="row" justifyContent="space-between" alignItems="baseline">
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant="body2" fontWeight={bold ? 700 : 500} color={color}>{value}</Typography>
  </Stack>
)

/**
 * Month-end settlement for one employee. Shows the arithmetic and lets the
 * admin adjust the deduction and bonus before confirming.
 */
export const ProcessMonthDialog: React.FC<ProcessMonthDialogProps> = ({
  open,
  onClose,
  row,
  periodLabel,
  periodUnfinished,
  submitting,
  format,
  onSubmit,
}) => {
  const [deductions, setDeductions] = useState('')
  const [bonuses, setBonuses] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (open && row) {
      setDeductions(row.deductions ? String(row.deductions) : '')
      setBonuses(row.bonuses ? String(row.bonuses) : '')
      setNotes('')
    }
  }, [open, row])

  const preview = useMemo(() => {
    if (!row) return null
    const d = parseFloat(deductions) || 0
    const b = parseFloat(bonuses) || 0
    const net = Math.round((row.baseSalary + b - d - row.payoutsTotal - row.previousBalance) * 100) / 100
    return { d, b, net, pay: net > 0 ? net : 0, owe: net < 0 ? -net : 0 }
  }, [row, deductions, bonuses])

  if (!row || !preview) return null

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>
        Process {periodLabel}
        <Typography variant="body2" color="text.secondary">{fullName(row.user)}</Typography>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {periodUnfinished && (
            <Alert severity="warning">
              {periodLabel} is not over yet. Any salary given after processing will count against the next month.
            </Alert>
          )}

          <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Stack spacing={0.5}>
              <Line label="Base salary" value={format(row.baseSalary)} />
              <Line label={`Given during month (${row.payoutsCount})`} value={`- ${format(row.payoutsTotal)}`} color={row.payoutsTotal ? 'error.main' : undefined} />
              {row.previousBalance > 0 && (
                <Line label="Owed from earlier months" value={`- ${format(row.previousBalance)}`} color="error.main" />
              )}
              <Line label="Deduction" value={`- ${format(preview.d)}`} color={preview.d ? 'error.main' : undefined} />
              <Line label="Bonus" value={`+ ${format(preview.b)}`} color={preview.b ? 'success.main' : undefined} />
              <Divider sx={{ my: 0.5 }} />
              {preview.pay > 0 && <Line label="Pay now" value={format(preview.pay)} color="success.main" bold />}
              {preview.owe > 0 && (
                <Line label="Employee owes (carried to next month)" value={format(preview.owe)} color="error.main" bold />
              )}
              {preview.net === 0 && <Line label="Nothing left to pay" value={format(0)} bold />}
            </Stack>
          </Box>

          <TextField
            label="Deduction"
            type="number"
            inputProps={{ min: 0, step: '0.01', inputMode: 'decimal' }}
            value={deductions}
            onChange={e => setDeductions(e.target.value)}
            helperText={
              row.attendance
                ? `Attendance suggests ${format(row.attendance.deductionAmount)} (${row.attendance.lateDays} late, ${row.attendance.absentDays} absent)`
                : 'No attendance deduction calculated for this month'
            }
            fullWidth
          />

          <TextField
            label="Bonus"
            type="number"
            inputProps={{ min: 0, step: '0.01', inputMode: 'decimal' }}
            value={bonuses}
            onChange={e => setBonuses(e.target.value)}
            fullWidth
          />

          <TextField
            label="Notes (optional)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            multiline
            minRows={2}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button
          variant="contained"
          color="success"
          disabled={submitting}
          onClick={() => onSubmit({ deductions: preview.d, bonuses: preview.b, notes: notes.trim() || undefined })}
        >
          {submitting ? 'Processing…' : preview.pay > 0 ? `Pay ${format(preview.pay)} & close month` : 'Close month'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ProcessMonthDialog
