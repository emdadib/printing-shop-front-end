import React, { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tooltip,
  Typography,
  CircularProgress,
} from '@mui/material'
import {
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Undo as UndoIcon,
} from '@mui/icons-material'
import { useQuery } from 'react-query'
import { salaryApi, type EmployeeMonthRow, type SalaryPayout } from '@/services/salaryApi'
import { describeNet, downloadTextFile, employeeYearToCsv, fullName } from '@/utils/salaryReport'

export interface EmployeeSalaryDialogProps {
  open: boolean
  onClose: () => void
  row: EmployeeMonthRow | null
  month: number
  year: number
  periodLabel: string
  format: (amount: number) => string
  canProcess: boolean
  canPay: boolean
  onPay: (row: EmployeeMonthRow) => void
  onProcess: (row: EmployeeMonthRow) => void
  onUndoProcess: (row: EmployeeMonthRow) => void
  onDeletePayout: (payout: SalaryPayout) => void
  onHandOverPayout: (payout: SalaryPayout) => void
  onCancelPayout: (payout: SalaryPayout) => void
}

const Line: React.FC<{ label: string; value: string; color?: string; bold?: boolean }> = ({ label, value, color, bold }) => (
  <Stack direction="row" justifyContent="space-between" alignItems="baseline">
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant="body2" fontWeight={bold ? 700 : 500} color={color}>{value}</Typography>
  </Stack>
)

const PAYOUT_STATUS_LABEL: Record<SalaryPayout['status'], string> = {
  PENDING: 'Waiting',
  APPROVED: 'Waiting',
  PAID: 'Given',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
}

/** One employee: this month's arithmetic and payouts, plus a year-by-month history. */
export const EmployeeSalaryDialog: React.FC<EmployeeSalaryDialogProps> = ({
  open,
  onClose,
  row,
  month,
  year,
  periodLabel,
  format,
  canProcess,
  canPay,
  onPay,
  onProcess,
  onUndoProcess,
  onDeletePayout,
  onHandOverPayout,
  onCancelPayout,
}) => {
  const [tab, setTab] = useState(0)
  const [historyYear, setHistoryYear] = useState(year)

  useEffect(() => {
    if (open) {
      setTab(0)
      setHistoryYear(year)
    }
  }, [open, year])

  const historyQuery = useQuery(
    ['salary-employee', row?.userId, historyYear],
    () => salaryApi.getEmployeeYear(row!.userId, historyYear),
    { enabled: open && !!row && tab === 1 }
  )
  const history = historyQuery.data?.data

  if (!row) return null

  const net = describeNet(row)
  const isOpen = row.status === 'OPEN'
  const processable = isOpen && row.hasProfile && row.pendingPayoutsCount === 0

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        {fullName(row.user)}
        <Typography variant="body2" color="text.secondary">
          {row.user.role}
          {row.hasProfile ? ` · base salary ${format(row.baseSalary)}/month` : ' · no base salary set'}
        </Typography>
      </DialogTitle>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label={periodLabel} />
        <Tab label="Year history" />
      </Tabs>

      <DialogContent>
        {tab === 0 && (
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Chip
                size="small"
                color={isOpen ? 'warning' : 'success'}
                variant={isOpen ? 'outlined' : 'filled'}
                label={isOpen ? 'Open' : 'Processed'}
              />
              {row.processed?.paidAt && (
                <Typography variant="body2" color="text.secondary">
                  on {new Date(row.processed.paidAt).toLocaleString()}
                  {row.processed.processedBy ? ` by ${fullName(row.processed.processedBy)}` : ''}
                </Typography>
              )}
              {row.processed?.notes && (
                <Typography variant="body2" color="text.secondary">· {row.processed.notes}</Typography>
              )}
            </Stack>

            <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Stack spacing={0.5}>
                <Line label="Base salary" value={format(row.baseSalary)} />
                <Line label={`Given during month (${row.payoutsCount})`} value={`- ${format(row.payoutsTotal)}`} color={row.payoutsTotal ? 'error.main' : undefined} />
                {row.previousBalance > 0 && (
                  <Line label="Owed from earlier months" value={`- ${format(row.previousBalance)}`} color="error.main" />
                )}
                <Line label="Deduction" value={`- ${format(row.deductions)}`} color={row.deductions ? 'error.main' : undefined} />
                <Line label="Bonus" value={`+ ${format(row.bonuses)}`} color={row.bonuses ? 'success.main' : undefined} />
                <Divider sx={{ my: 0.5 }} />
                <Line
                  label={net.label}
                  value={net.tone === 'even' ? format(0) : format(net.amount)}
                  color={net.tone === 'pay' ? 'success.main' : net.tone === 'owe' ? 'error.main' : undefined}
                  bold
                />
              </Stack>
            </Box>

            {row.attendance && (
              <Typography variant="caption" color="text.secondary">
                Attendance this month: {row.attendance.lateDays} late, {row.attendance.absentDays} absent →{' '}
                {row.attendance.totalDeductionDays} deduction day(s), {format(row.attendance.deductionAmount)}
              </Typography>
            )}

            <Box>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                Salary given during {periodLabel}
              </Typography>
              {row.payouts.length === 0 ? (
                <Typography variant="body2" color="text.secondary">Nothing given yet this month.</Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell align="right">Amount</TableCell>
                        <TableCell>Reason</TableCell>
                        <TableCell>Given by</TableCell>
                        <TableCell align="center">Status</TableCell>
                        <TableCell align="right" />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {row.payouts.map(p => {
                        const waiting = p.status === 'PENDING' || p.status === 'APPROVED'
                        return (
                          <TableRow key={p.id}>
                            <TableCell>{new Date(p.date).toLocaleDateString()}</TableCell>
                            <TableCell align="right"><strong>{format(p.amount)}</strong></TableCell>
                            <TableCell>{p.reason || '—'}</TableCell>
                            <TableCell>{p.givenBy ? fullName(p.givenBy) : '—'}</TableCell>
                            <TableCell align="center">
                              <Chip
                                size="small"
                                label={PAYOUT_STATUS_LABEL[p.status]}
                                color={p.status === 'PAID' ? 'success' : waiting ? 'warning' : 'default'}
                                variant={p.status === 'PAID' ? 'outlined' : 'filled'}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                {waiting && canPay && isOpen && (
                                  <Button size="small" variant="outlined" onClick={() => onHandOverPayout(p)}>
                                    Hand over
                                  </Button>
                                )}
                                {waiting && canProcess && (
                                  <Button size="small" color="inherit" onClick={() => onCancelPayout(p)}>
                                    Cancel
                                  </Button>
                                )}
                                {canProcess && isOpen && p.status === 'PAID' && (
                                  <Tooltip describeChild title="Delete this payout (reverses the cash entry)">
                                    <IconButton size="small" color="error" onClick={() => onDeletePayout(p)} aria-label="Delete payout">
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </Stack>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>

            {row.pendingPayoutsCount > 0 && isOpen && (
              <Alert severity="warning">
                {row.pendingPayoutsCount} payout(s) from the old request flow are still waiting. Hand them over or cancel
                them before processing this month.
              </Alert>
            )}
          </Stack>
        )}

        {tab === 1 && (
          <Stack spacing={2}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack direction="row" alignItems="center" spacing={1}>
                <IconButton size="small" onClick={() => setHistoryYear(y => y - 1)} aria-label="Previous year">
                  <PrevIcon />
                </IconButton>
                <Typography variant="h6" fontWeight={700}>{historyYear}</Typography>
                <IconButton size="small" onClick={() => setHistoryYear(y => y + 1)} aria-label="Next year">
                  <NextIcon />
                </IconButton>
              </Stack>
              {history && (
                <Button
                  size="small"
                  startIcon={<DownloadIcon />}
                  onClick={() => downloadTextFile(`salary-${fullName(history.user).replace(/\s+/g, '-')}-${historyYear}.csv`, employeeYearToCsv(history))}
                >
                  CSV
                </Button>
              )}
            </Stack>

            {historyQuery.isLoading && (
              <Box display="flex" justifyContent="center" py={4}><CircularProgress size={28} /></Box>
            )}

            {history && (
              <>
                <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
                  <div>
                    <Typography variant="caption" color="text.secondary">Given during months</Typography>
                    <Typography variant="subtitle1" fontWeight={700}>{format(history.totals.payouts)}</Typography>
                  </div>
                  <div>
                    <Typography variant="caption" color="text.secondary">Paid at processing</Typography>
                    <Typography variant="subtitle1" fontWeight={700}>{format(history.totals.paidAtProcessing)}</Typography>
                  </div>
                  <div>
                    <Typography variant="caption" color="text.secondary">Total received</Typography>
                    <Typography variant="subtitle1" fontWeight={700} color="primary.main">{format(history.totals.cashOut)}</Typography>
                  </div>
                  <div>
                    <Typography variant="caption" color="text.secondary">Currently owes</Typography>
                    <Typography variant="subtitle1" fontWeight={700} color={history.currentBalanceOwed ? 'error.main' : 'text.primary'}>
                      {format(history.currentBalanceOwed)}
                    </Typography>
                  </div>
                </Stack>

                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Month</TableCell>
                        <TableCell align="right">Base</TableCell>
                        <TableCell align="right">Given</TableCell>
                        <TableCell align="right">Deduction</TableCell>
                        <TableCell align="right">Bonus</TableCell>
                        <TableCell align="right">Owed before</TableCell>
                        <TableCell align="right">Paid at processing</TableCell>
                        <TableCell align="right">Owed after</TableCell>
                        <TableCell align="center">Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {history.months.map(m => {
                        const isCurrent = m.month === month && historyYear === year
                        const processed = m.status === 'PROCESSED'
                        const empty = !processed && m.payoutsTotal === 0 && m.baseSalary === 0
                        return (
                          <TableRow key={m.month} selected={isCurrent} sx={{ opacity: empty ? 0.5 : 1 }}>
                            <TableCell>{m.label.replace(` ${historyYear}`, '')}</TableCell>
                            <TableCell align="right">{m.baseSalary ? format(m.baseSalary) : '—'}</TableCell>
                            <TableCell align="right">{m.payoutsTotal ? format(m.payoutsTotal) : '—'}</TableCell>
                            <TableCell align="right">{m.deductions ? format(m.deductions) : '—'}</TableCell>
                            <TableCell align="right">{m.bonuses ? format(m.bonuses) : '—'}</TableCell>
                            <TableCell align="right">{m.previousBalance ? format(m.previousBalance) : '—'}</TableCell>
                            <TableCell align="right">
                              {processed ? <strong>{format(m.paidAmount ?? 0)}</strong> : '—'}
                            </TableCell>
                            <TableCell align="right">
                              {processed && m.carryForward ? (
                                <Typography variant="body2" color="error.main" fontWeight={600}>{format(m.carryForward)}</Typography>
                              ) : '—'}
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                size="small"
                                label={processed ? 'Processed' : 'Open'}
                                color={processed ? 'success' : 'default'}
                                variant={processed ? 'filled' : 'outlined'}
                              />
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, flexWrap: 'wrap', gap: 1 }}>
        {tab === 0 && canProcess && !isOpen && (
          <Tooltip describeChild title="Reopen the month: removes the processed record and reverses its cash entry">
            <Button color="warning" startIcon={<UndoIcon />} onClick={() => onUndoProcess(row)}>
              Undo processing
            </Button>
          </Tooltip>
        )}
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>Close</Button>
        {tab === 0 && canPay && isOpen && (
          <Button variant="outlined" onClick={() => onPay(row)}>Pay salary</Button>
        )}
        {tab === 0 && canProcess && isOpen && (
          <Button variant="contained" color="success" disabled={!processable} onClick={() => onProcess(row)}>
            Process {periodLabel}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

export default EmployeeSalaryDialog
