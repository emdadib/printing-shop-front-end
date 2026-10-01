import React, { useMemo } from 'react'
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material'
import type { EmployeeMonthRow } from '@/services/salaryApi'
import { describeNet, fullName } from '@/utils/salaryReport'

export interface ProcessAllDialogProps {
  open: boolean
  onClose: () => void
  /** Only the rows that are still open. */
  rows: EmployeeMonthRow[]
  periodLabel: string
  periodUnfinished: boolean
  submitting: boolean
  format: (amount: number) => string
  onConfirm: () => void
}

const skipReason = (row: EmployeeMonthRow): string | null => {
  if (!row.hasProfile) return 'no base salary'
  if (row.pendingPayoutsCount > 0) return `${row.pendingPayoutsCount} payout(s) waiting`
  return null
}

/**
 * Settles every open employee for the month using the attendance deduction
 * and no bonus. Anyone who needs a manual touch is skipped and listed.
 */
export const ProcessAllDialog: React.FC<ProcessAllDialogProps> = ({
  open,
  onClose,
  rows,
  periodLabel,
  periodUnfinished,
  submitting,
  format,
  onConfirm,
}) => {
  const summary = useMemo(() => {
    let pay = 0
    let owe = 0
    let ready = 0
    for (const row of rows) {
      if (skipReason(row)) continue
      ready += 1
      pay += row.paidAmount
      owe += row.carryForward
    }
    return { pay, owe, ready }
  }, [rows])

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Process all — {periodLabel}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {periodUnfinished && (
            <Alert severity="warning">
              {periodLabel} is not over yet. Salary given after processing will count against the next month.
            </Alert>
          )}
          <Alert severity="info">
            Each employee is settled with their attendance deduction and no bonus. To add a bonus or change a
            deduction, process that employee on their own instead.
          </Alert>

          <Stack direction="row" spacing={3}>
            <div>
              <Typography variant="caption" color="text.secondary">Employees</Typography>
              <Typography variant="h6" fontWeight={700}>{summary.ready}</Typography>
            </div>
            <div>
              <Typography variant="caption" color="text.secondary">Cash to pay now</Typography>
              <Typography variant="h6" fontWeight={700} color="success.main">{format(summary.pay)}</Typography>
            </div>
            <div>
              <Typography variant="caption" color="text.secondary">Carried forward as owed</Typography>
              <Typography variant="h6" fontWeight={700} color={summary.owe ? 'error.main' : 'text.primary'}>
                {format(summary.owe)}
              </Typography>
            </div>
          </Stack>

          <List dense disablePadding>
            {rows.map(row => {
              const skip = skipReason(row)
              const net = describeNet(row)
              return (
                <ListItem key={row.userId} disableGutters divider>
                  <ListItemText
                    primary={fullName(row.user)}
                    secondary={skip ? `Skipped: ${skip}` : net.label}
                    secondaryTypographyProps={{ color: skip ? 'error.main' : 'text.secondary' }}
                  />
                  {!skip && (
                    <Chip
                      size="small"
                      label={net.tone === 'even' ? '—' : format(net.amount)}
                      color={net.tone === 'pay' ? 'success' : net.tone === 'owe' ? 'error' : 'default'}
                      variant={net.tone === 'even' ? 'outlined' : 'filled'}
                    />
                  )}
                </ListItem>
              )
            })}
          </List>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button variant="contained" color="success" disabled={submitting || summary.ready === 0} onClick={onConfirm}>
          {submitting ? 'Processing…' : `Process ${summary.ready} employee${summary.ready === 1 ? '' : 's'}`}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ProcessAllDialog
