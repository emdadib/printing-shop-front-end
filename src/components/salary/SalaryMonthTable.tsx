import React from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  Edit as EditIcon,
  Payments as PaymentsIcon,
  Visibility as ViewIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
} from '@mui/icons-material'
import type { EmployeeMonthRow, MonthTotals } from '@/services/salaryApi'
import { describeNet, fullName } from '@/utils/salaryReport'

export interface SalaryMonthTableProps {
  rows: EmployeeMonthRow[]
  totals: MonthTotals
  isMobile: boolean
  /** Admin: may process months and edit base salaries. */
  canProcess: boolean
  /** Manager and up: may hand out salary during the month. */
  canPay: boolean
  format: (amount: number) => string
  onPay: (row: EmployeeMonthRow) => void
  onProcess: (row: EmployeeMonthRow) => void
  onView: (row: EmployeeMonthRow) => void
  onEditBase: (row: EmployeeMonthRow) => void
}

const StatusChip: React.FC<{ row: EmployeeMonthRow }> = ({ row }) => {
  if (row.status === 'PROCESSED') {
    return <Chip size="small" color="success" icon={<CheckCircleIcon />} label="Processed" />
  }
  if (!row.hasProfile) {
    return <Chip size="small" color="error" variant="outlined" icon={<WarningIcon />} label="No base salary" />
  }
  if (row.pendingPayoutsCount > 0) {
    return <Chip size="small" color="warning" icon={<WarningIcon />} label={`${row.pendingPayoutsCount} waiting`} />
  }
  return <Chip size="small" color="warning" variant="outlined" label="Open" />
}

const NetCell: React.FC<{ row: EmployeeMonthRow; format: (n: number) => string; align?: 'right' | 'left' }> = ({
  row,
  format,
  align = 'right',
}) => {
  const net = describeNet(row)
  const color = net.tone === 'pay' ? 'success.main' : net.tone === 'owe' ? 'error.main' : 'text.secondary'
  return (
    <Box textAlign={align}>
      <Typography variant="subtitle2" fontWeight={700} color={color} data-testid={`net-${row.userId}`}>
        {net.tone === 'even' ? '—' : format(net.amount)}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {net.label}
      </Typography>
    </Box>
  )
}

const RowActions: React.FC<{
  row: EmployeeMonthRow
  canProcess: boolean
  canPay: boolean
  onPay: () => void
  onProcess: () => void
  onView: () => void
  onEditBase: () => void
  compact?: boolean
}> = ({ row, canProcess, canPay, onPay, onProcess, onView, onEditBase, compact }) => {
  const open = row.status === 'OPEN'
  const processable = open && row.hasProfile && row.pendingPayoutsCount === 0
  return (
    <Stack direction="row" spacing={0.5} justifyContent={compact ? 'flex-start' : 'center'} flexWrap="wrap" useFlexGap>
      {canPay && open && (
        <Tooltip describeChild title="Give salary now (counts against this month)">
          <Button size="small" variant="outlined" startIcon={<PaymentsIcon />} onClick={onPay}>
            Pay
          </Button>
        </Tooltip>
      )}
      {canProcess && open && (
        <Tooltip describeChild title={processable ? 'Settle this month for this employee' : 'Set a base salary and clear waiting payouts first'}>
          <span>
            <Button size="small" variant="contained" color="success" disabled={!processable} onClick={onProcess}>
              Process
            </Button>
          </span>
        </Tooltip>
      )}
      <Tooltip describeChild title="Payouts and history">
        <IconButton size="small" onClick={onView} aria-label={`View ${fullName(row.user)}`}>
          <ViewIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      {canProcess && (
        <Tooltip describeChild title="Edit base salary">
          <IconButton size="small" onClick={onEditBase} aria-label={`Edit base salary for ${fullName(row.user)}`}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Stack>
  )
}

const Money: React.FC<{ value: number; format: (n: number) => string; sign?: '+' | '-'; muted?: boolean }> = ({
  value,
  format,
  sign,
  muted,
}) => {
  if (!value) return <Typography variant="body2" color="text.disabled">—</Typography>
  const color = sign === '-' ? 'error.main' : sign === '+' ? 'success.main' : muted ? 'text.secondary' : 'text.primary'
  return (
    <Typography variant="body2" fontWeight={500} color={color}>
      {sign ?? ''}{format(value)}
    </Typography>
  )
}

export const SalaryMonthTable: React.FC<SalaryMonthTableProps> = ({
  rows,
  totals,
  isMobile,
  canProcess,
  canPay,
  format,
  onPay,
  onProcess,
  onView,
  onEditBase,
}) => {
  if (isMobile) {
    return (
      <Stack spacing={1.5}>
        {rows.map(row => (
          <Card key={row.userId} variant="outlined" data-testid={`row-${row.userId}`}>
            <CardContent sx={{ pb: '12px !important' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700}>{fullName(row.user)}</Typography>
                  <Typography variant="caption" color="text.secondary">{row.user.role}</Typography>
                </Box>
                <StatusChip row={row} />
              </Stack>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mt: 1.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Base salary</Typography>
                  <Money value={row.baseSalary} format={format} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Given so far ({row.payoutsCount})</Typography>
                  <Money value={row.payoutsTotal} format={format} sign={row.payoutsTotal ? '-' : undefined} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Deduction</Typography>
                  <Money value={row.deductions} format={format} sign={row.deductions ? '-' : undefined} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Bonus</Typography>
                  <Money value={row.bonuses} format={format} sign={row.bonuses ? '+' : undefined} />
                </Box>
                {row.previousBalance > 0 && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Owed from before</Typography>
                    <Money value={row.previousBalance} format={format} sign="-" />
                  </Box>
                )}
              </Box>

              <Box sx={{ mt: 1.5, p: 1.25, bgcolor: 'action.hover', borderRadius: 1 }}>
                <NetCell row={row} format={format} align="left" />
              </Box>

              <Box sx={{ mt: 1.5 }}>
                <RowActions
                  compact
                  row={row}
                  canProcess={canProcess}
                  canPay={canPay}
                  onPay={() => onPay(row)}
                  onProcess={() => onProcess(row)}
                  onView={() => onView(row)}
                  onEditBase={() => onEditBase(row)}
                />
              </Box>
            </CardContent>
          </Card>
        ))}
      </Stack>
    )
  }

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: 'grey.50' }}>
            <TableCell><strong>Employee</strong></TableCell>
            <TableCell align="right"><strong>Base</strong></TableCell>
            <TableCell align="right"><strong>Given so far</strong></TableCell>
            <TableCell align="right"><strong>Deduction</strong></TableCell>
            <TableCell align="right"><strong>Bonus</strong></TableCell>
            <TableCell align="right"><strong>Owed before</strong></TableCell>
            <TableCell align="right"><strong>Net</strong></TableCell>
            <TableCell align="center"><strong>Status</strong></TableCell>
            <TableCell align="center"><strong>Actions</strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(row => (
            <TableRow
              key={row.userId}
              hover
              data-testid={`row-${row.userId}`}
              sx={{ bgcolor: row.status === 'PROCESSED' ? 'rgba(76, 175, 80, 0.04)' : 'transparent' }}
            >
              <TableCell>
                <Typography variant="subtitle2" fontWeight={600}>{fullName(row.user)}</Typography>
                <Typography variant="caption" color="text.secondary">{row.user.role}</Typography>
              </TableCell>
              <TableCell align="right"><Money value={row.baseSalary} format={format} /></TableCell>
              <TableCell align="right">
                <Money value={row.payoutsTotal} format={format} sign={row.payoutsTotal ? '-' : undefined} />
                {row.payoutsCount > 0 && (
                  <Typography variant="caption" color="text.secondary">
                    {row.payoutsCount} payout{row.payoutsCount === 1 ? '' : 's'}
                  </Typography>
                )}
              </TableCell>
              <TableCell align="right"><Money value={row.deductions} format={format} sign={row.deductions ? '-' : undefined} /></TableCell>
              <TableCell align="right"><Money value={row.bonuses} format={format} sign={row.bonuses ? '+' : undefined} /></TableCell>
              <TableCell align="right"><Money value={row.previousBalance} format={format} sign={row.previousBalance ? '-' : undefined} /></TableCell>
              <TableCell align="right"><NetCell row={row} format={format} /></TableCell>
              <TableCell align="center"><StatusChip row={row} /></TableCell>
              <TableCell align="center">
                <RowActions
                  row={row}
                  canProcess={canProcess}
                  canPay={canPay}
                  onPay={() => onPay(row)}
                  onProcess={() => onProcess(row)}
                  onView={() => onView(row)}
                  onEditBase={() => onEditBase(row)}
                />
              </TableCell>
            </TableRow>
          ))}
          <TableRow sx={{ bgcolor: 'grey.100' }}>
            <TableCell><strong>Total ({totals.employees})</strong></TableCell>
            <TableCell align="right"><strong>{format(totals.baseSalary)}</strong></TableCell>
            <TableCell align="right"><strong>{format(totals.payouts)}</strong></TableCell>
            <TableCell align="right"><strong>{format(totals.deductions)}</strong></TableCell>
            <TableCell align="right"><strong>{format(totals.bonuses)}</strong></TableCell>
            <TableCell align="right"><strong>{format(totals.previousBalance)}</strong></TableCell>
            <TableCell align="right">
              <Typography variant="subtitle2" fontWeight={700} color="success.main">
                {format(totals.toPayAtProcessing + totals.paidAtProcessing)}
              </Typography>
              {(totals.owed + totals.projectedOwed) > 0 && (
                <Typography variant="caption" color="error.main">
                  owed {format(totals.owed + totals.projectedOwed)}
                </Typography>
              )}
            </TableCell>
            <TableCell align="center">
              <Typography variant="caption">{totals.processedCount}/{totals.employees} processed</Typography>
            </TableCell>
            <TableCell />
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export default SalaryMonthTable
