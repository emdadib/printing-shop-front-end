import React, { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
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
  /** Called with the employees that are ticked. */
  onConfirm: (userIds: string[]) => void
}

const blockedReason = (row: EmployeeMonthRow): string | null => {
  if (!row.hasProfile) return 'no base salary'
  if (row.pendingPayoutsCount > 0) return `${row.pendingPayoutsCount} payout(s) waiting`
  return null
}

/**
 * Settles the ticked employees for the month using the attendance deduction
 * and no bonus. Untick anyone who should wait (or be skipped instead).
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
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (open) setSelected(new Set(rows.filter(r => !blockedReason(r)).map(r => r.userId)))
  }, [open, rows])

  const toggle = (userId: string) =>
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })

  const summary = useMemo(() => {
    let pay = 0
    let owe = 0
    let count = 0
    for (const row of rows) {
      if (!selected.has(row.userId)) continue
      count += 1
      pay += row.paidAmount
      owe += row.carryForward
    }
    return { pay, owe, count }
  }, [rows, selected])

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
            Ticked employees are settled with their attendance deduction and no bonus. Untick anyone who should
            wait. For someone who was not here the full month, close the dialog and use Skip on their row instead.
          </Alert>

          <Stack direction="row" spacing={3}>
            <div>
              <Typography variant="caption" color="text.secondary">Employees</Typography>
              <Typography variant="h6" fontWeight={700}>{summary.count}</Typography>
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
              const blocked = blockedReason(row)
              const net = describeNet(row)
              const checked = selected.has(row.userId)
              return (
                <ListItem key={row.userId} disableGutters divider disablePadding>
                  <ListItemButton
                    dense
                    disabled={!!blocked}
                    onClick={() => toggle(row.userId)}
                    sx={{ px: 0.5 }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Checkbox
                        edge="start"
                        size="small"
                        checked={checked && !blocked}
                        disabled={!!blocked}
                        tabIndex={-1}
                        disableRipple
                        inputProps={{ 'aria-label': `Process ${fullName(row.user)}` }}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={fullName(row.user)}
                      secondary={blocked ? `Cannot process: ${blocked}` : net.label}
                      secondaryTypographyProps={{ color: blocked ? 'error.main' : 'text.secondary' }}
                    />
                    {!blocked && (
                      <Chip
                        size="small"
                        label={net.tone === 'even' ? '—' : format(net.amount)}
                        color={net.tone === 'pay' ? 'success' : net.tone === 'owe' ? 'error' : 'default'}
                        variant={net.tone === 'even' ? 'outlined' : 'filled'}
                      />
                    )}
                  </ListItemButton>
                </ListItem>
              )
            })}
          </List>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button
          variant="contained"
          color="success"
          disabled={submitting || summary.count === 0}
          onClick={() => onConfirm(Array.from(selected))}
        >
          {submitting ? 'Processing…' : `Process ${summary.count} employee${summary.count === 1 ? '' : 's'}`}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ProcessAllDialog
