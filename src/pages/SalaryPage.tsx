import React, { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import {
  AccountBalanceWallet as WalletIcon,
  CalendarMonth as CalendarIcon,
  CheckCircle as CheckCircleIcon,
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  Download as DownloadIcon,
  EventRepeat as RecalcIcon,
  Group as GroupIcon,
  Payments as PaymentsIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
} from '@mui/icons-material'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { useCurrency } from '@/contexts/CurrencyContext'
import { usePermissions } from '@/hooks/usePermissions'
import { salaryApi, type EmployeeMonthRow, type SalaryPayout } from '@/services/salaryApi'
import { userApi } from '@/services/userApi'
import { attendanceApi } from '@/services/attendanceApi'
import { downloadTextFile, fullName, isPeriodUnfinished, monthReportToCsv } from '@/utils/salaryReport'
import { SalaryMonthTable } from '@/components/salary/SalaryMonthTable'
import { PaySalaryDialog } from '@/components/salary/PaySalaryDialog'
import { ProcessMonthDialog } from '@/components/salary/ProcessMonthDialog'
import { ProcessAllDialog } from '@/components/salary/ProcessAllDialog'
import { EmployeeSalaryDialog } from '@/components/salary/EmployeeSalaryDialog'
import { SetBaseSalaryDialog } from '@/components/salary/SetBaseSalaryDialog'

type SnackbarState = { open: boolean; message: string; severity: 'success' | 'error' | 'warning' | 'info' }

type ConfirmState = {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  confirmColor: 'error' | 'success' | 'primary' | 'warning'
  onConfirm: () => void
}

const errorMessage = (error: unknown, fallback: string): string =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback

/**
 * Salary — one screen for the whole month:
 *   1. give salary to an employee whenever they need it ("Pay")
 *   2. at month end, "Process" settles everyone: pays what is left or carries
 *      the shortfall forward
 * The table doubles as the monthly report; CSV export and per-employee history
 * live behind the action buttons.
 */
const SalaryPage: React.FC = () => {
  const queryClient = useQueryClient()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const { formatCurrency } = useCurrency()
  const { isAdmin, isManager } = usePermissions()
  const canProcess = isAdmin()
  const canPay = isManager()

  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [payOpen, setPayOpen] = useState(false)
  const [processOpen, setProcessOpen] = useState(false)
  const [processAllOpen, setProcessAllOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [baseOpen, setBaseOpen] = useState(false)
  const [baseInitial, setBaseInitial] = useState<{ userId: string; baseSalary: number } | null>(null)

  const [snackbar, setSnackbar] = useState<SnackbarState>({ open: false, message: '', severity: 'success' })
  const [confirm, setConfirm] = useState<ConfirmState>({
    open: false, title: '', message: '', confirmLabel: 'Confirm', confirmColor: 'primary', onConfirm: () => {},
  })

  const notify = (message: string, severity: SnackbarState['severity'] = 'success') =>
    setSnackbar({ open: true, message, severity })
  const ask = (config: Omit<ConfirmState, 'open'>) => setConfirm({ open: true, ...config })
  const closeConfirm = () => setConfirm(c => ({ ...c, open: false }))

  const navigateMonth = (direction: -1 | 1) => {
    let m = month + direction
    let y = year
    if (m < 1) { m = 12; y -= 1 }
    if (m > 12) { m = 1; y += 1 }
    setMonth(m)
    setYear(y)
  }

  // ── data
  const reportQuery = useQuery(
    ['salary-month', month, year],
    () => salaryApi.getMonthReport(month, year),
    { keepPreviousData: true }
  )
  const report = reportQuery.data?.data
  const rows = useMemo(() => report?.rows ?? [], [report])
  const totals = report?.totals
  const periodLabel = report?.label ?? ''
  const periodUnfinished = isPeriodUnfinished(month, year)

  const usersQuery = useQuery('users', () => userApi.getAllUsers())
  const users = usersQuery.data?.data ?? []

  const selectedRow = useMemo(
    () => (selectedUserId ? rows.find(r => r.userId === selectedUserId) ?? null : null),
    [rows, selectedUserId]
  )
  const openRows = useMemo(() => rows.filter(r => r.status === 'OPEN'), [rows])

  const refresh = () => {
    queryClient.invalidateQueries('salary-month')
    queryClient.invalidateQueries('salary-employee')
  }

  // ── mutations
  const createPayout = useMutation(salaryApi.createPayout, {
    onSuccess: res => {
      refresh()
      setPayOpen(false)
      notify(`${formatCurrency(res.data.amount)} given to ${fullName(res.data.user)}`)
    },
    onError: e => notify(errorMessage(e, 'Could not record the payment'), 'error'),
  })

  const processMonth = useMutation(salaryApi.processMonth, {
    onSuccess: res => {
      refresh()
      setProcessOpen(false)
      const r = res.data
      notify(
        r.paidAmount > 0
          ? `${fullName(r.user)}: paid ${formatCurrency(r.paidAmount)}`
          : r.carryForward > 0
            ? `${fullName(r.user)}: nothing to pay, ${formatCurrency(r.carryForward)} carried forward`
            : `${fullName(r.user)}: month closed, nothing left to pay`
      )
    },
    onError: e => notify(errorMessage(e, 'Could not process this month'), 'error'),
  })

  const processAll = useMutation(() => salaryApi.processAll(month, year), {
    onSuccess: res => {
      refresh()
      setProcessAllOpen(false)
      const { processedCount, skipped } = res.data
      notify(
        skipped.length
          ? `${processedCount} processed, ${skipped.length} skipped (${skipped.map(s => s.name).join(', ')})`
          : `${processedCount} employee${processedCount === 1 ? '' : 's'} processed`,
        skipped.length ? 'warning' : 'success'
      )
    },
    onError: e => notify(errorMessage(e, 'Could not process the month'), 'error'),
  })

  const undoProcess = useMutation(salaryApi.undoProcess, {
    onSuccess: res => { refresh(); notify(res.message || 'Month reopened') },
    onError: e => notify(errorMessage(e, 'Could not undo processing'), 'error'),
  })

  const deletePayout = useMutation(salaryApi.deletePayout, {
    onSuccess: () => { refresh(); notify('Payout deleted') },
    onError: e => notify(errorMessage(e, 'Could not delete payout'), 'error'),
  })

  const handOverPayout = useMutation(salaryApi.payPendingPayout, {
    onSuccess: () => { refresh(); notify('Payout handed over') },
    onError: e => notify(errorMessage(e, 'Could not hand over payout'), 'error'),
  })

  const cancelPayout = useMutation((id: string) => salaryApi.cancelPayout(id), {
    onSuccess: () => { refresh(); notify('Payout cancelled') },
    onError: e => notify(errorMessage(e, 'Could not cancel payout'), 'error'),
  })

  const setBaseSalary = useMutation(salaryApi.setBaseSalary, {
    onSuccess: res => {
      refresh()
      queryClient.invalidateQueries('salary-profiles')
      setBaseOpen(false)
      notify(`Base salary for ${fullName(res.data.user)} set to ${formatCurrency(res.data.baseSalary)}`)
    },
    onError: e => notify(errorMessage(e, 'Could not save base salary'), 'error'),
  })

  const recalcDeductions = useMutation(() => attendanceApi.calculateDeductions(month, year), {
    onSuccess: () => { refresh(); notify('Attendance deductions recalculated') },
    onError: e => notify(errorMessage(e, 'Could not recalculate attendance deductions'), 'error'),
  })

  // ── handlers
  const openPay = (row?: EmployeeMonthRow) => { setSelectedUserId(row?.userId ?? null); setPayOpen(true) }
  const openProcess = (row: EmployeeMonthRow) => { setSelectedUserId(row.userId); setProcessOpen(true) }
  const openView = (row: EmployeeMonthRow) => { setSelectedUserId(row.userId); setViewOpen(true) }
  const openBase = (row?: EmployeeMonthRow) => {
    setBaseInitial(row && row.hasProfile ? { userId: row.userId, baseSalary: row.baseSalary } : null)
    setBaseOpen(true)
  }

  const confirmUndo = (row: EmployeeMonthRow) => {
    if (!row.processed) return
    ask({
      title: 'Undo processing',
      message: `Reopen ${periodLabel} for ${fullName(row.user)}? The processed record is removed and its cash entry reversed.`,
      confirmLabel: 'Undo',
      confirmColor: 'warning',
      onConfirm: () => { closeConfirm(); undoProcess.mutate(row.processed!.id) },
    })
  }

  const confirmDeletePayout = (payout: SalaryPayout) => {
    ask({
      title: 'Delete payout',
      message: `Delete the ${formatCurrency(payout.amount)} given on ${new Date(payout.date).toLocaleDateString()}? The cash entry is reversed.`,
      confirmLabel: 'Delete',
      confirmColor: 'error',
      onConfirm: () => { closeConfirm(); deletePayout.mutate(payout.id) },
    })
  }

  const exportCsv = () => {
    if (!report) return
    downloadTextFile(`salary-${year}-${String(month).padStart(2, '0')}.csv`, monthReportToCsv(report))
  }

  // ── render
  if (reportQuery.isLoading && !report) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  const owedTotal = (totals?.owed ?? 0) + (totals?.projectedOwed ?? 0)

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap={2} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Salary</Typography>
          <Typography variant="body2" color="text.secondary">
            Give salary any time during the month, then process the month to settle up.
          </Typography>
        </Box>
        <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
          {canProcess && (
            <Button variant="outlined" startIcon={<TrendingUpIcon />} onClick={() => openBase()}>
              Set base salary
            </Button>
          )}
          {canPay && (
            <Button variant="contained" startIcon={<PaymentsIcon />} onClick={() => openPay()}>
              Pay salary
            </Button>
          )}
          {canProcess && openRows.length > 0 && (
            <Button variant="contained" color="success" startIcon={<CheckCircleIcon />} onClick={() => setProcessAllOpen(true)}>
              Process all ({openRows.length})
            </Button>
          )}
        </Stack>
      </Stack>

      {/* ── Month navigator ────────────────────────────────────── */}
      <Paper
        elevation={2}
        sx={{
          p: 1.5, mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
          bgcolor: 'primary.main', color: 'primary.contrastText', borderRadius: 2,
        }}
      >
        <IconButton onClick={() => navigateMonth(-1)} sx={{ color: 'inherit' }} aria-label="Previous month">
          <PrevIcon />
        </IconButton>
        <Typography variant="h5" fontWeight={700} sx={{ minWidth: 200, textAlign: 'center' }}>
          {periodLabel || '…'}
        </Typography>
        <IconButton onClick={() => navigateMonth(1)} sx={{ color: 'inherit' }} aria-label="Next month">
          <NextIcon />
        </IconButton>
      </Paper>

      {/* ── Summary cards ──────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6} md={3}>
          <Card sx={{ borderLeft: 4, borderColor: 'primary.main', height: '100%' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <GroupIcon sx={{ fontSize: 36, color: 'primary.main', opacity: 0.8 }} />
              <Box>
                <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                  {formatCurrency(totals?.baseSalary ?? 0)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Base payroll · {totals?.employees ?? 0} employee{totals?.employees === 1 ? '' : 's'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ borderLeft: 4, borderColor: 'info.main', height: '100%' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <WalletIcon sx={{ fontSize: 36, color: 'info.main', opacity: 0.8 }} />
              <Box>
                <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }} data-testid="total-payouts">
                  {formatCurrency(totals?.payouts ?? 0)}
                </Typography>
                <Typography variant="caption" color="text.secondary">Given during the month</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ borderLeft: 4, borderColor: 'success.main', height: '100%' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <CheckCircleIcon sx={{ fontSize: 36, color: 'success.main', opacity: 0.8 }} />
              <Box>
                <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }} data-testid="total-to-pay">
                  {formatCurrency(totals?.toPayAtProcessing ?? 0)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Still to pay · {totals?.processedCount ?? 0}/{totals?.employees ?? 0} processed
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ borderLeft: 4, borderColor: owedTotal ? 'error.main' : 'grey.400', height: '100%' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <WarningIcon sx={{ fontSize: 36, color: owedTotal ? 'error.main' : 'text.disabled', opacity: 0.8 }} />
              <Box>
                <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }} color={owedTotal ? 'error.main' : 'text.primary'}>
                  {formatCurrency(owedTotal)}
                </Typography>
                <Typography variant="caption" color="text.secondary">Owed to the company</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Report table ───────────────────────────────────────── */}
      <Paper sx={{ p: { xs: 1.5, md: 2 } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} sx={{ mb: 1.5 }}>
          <Stack direction="row" alignItems="center" gap={1}>
            <CalendarIcon color="action" fontSize="small" />
            <Typography variant="subtitle1" fontWeight={700}>{periodLabel}</Typography>
            {totals && totals.employees > 0 && (
              <Chip
                size="small"
                label={`${totals.processedCount}/${totals.employees} processed`}
                color={totals.openCount === 0 ? 'success' : 'default'}
                variant={totals.openCount === 0 ? 'filled' : 'outlined'}
              />
            )}
            {reportQuery.isFetching && <CircularProgress size={16} />}
          </Stack>
          <Stack direction="row" gap={0.5}>
            {canProcess && (
              <Tooltip describeChild title="Recalculate attendance deductions for this month">
                <span>
                  <IconButton size="small" onClick={() => recalcDeductions.mutate()} disabled={recalcDeductions.isLoading} aria-label="Recalculate attendance deductions">
                    <RecalcIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            )}
            <Tooltip describeChild title="Download this month as CSV">
              <span>
                <IconButton size="small" onClick={exportCsv} disabled={!report} aria-label="Download CSV">
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Stack>

        {reportQuery.isError ? (
          <Alert severity="error">Could not load the salary report. Please try again.</Alert>
        ) : rows.length === 0 ? (
          <Box textAlign="center" py={6}>
            <GroupIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
            <Typography variant="h6" color="text.secondary" mt={1}>
              No salaries for {periodLabel}
            </Typography>
            <Typography variant="body2" color="text.disabled" mb={2}>
              Set a base salary for each employee to start.
            </Typography>
            {canProcess && (
              <Button variant="contained" startIcon={<TrendingUpIcon />} onClick={() => openBase()}>
                Set base salary
              </Button>
            )}
          </Box>
        ) : (
          <SalaryMonthTable
            rows={rows}
            totals={totals!}
            isMobile={isMobile}
            canProcess={canProcess}
            canPay={canPay}
            format={formatCurrency}
            onPay={openPay}
            onProcess={openProcess}
            onView={openView}
            onEditBase={openBase}
          />
        )}
      </Paper>

      {/* ── Dialogs ────────────────────────────────────────────── */}
      <PaySalaryDialog
        open={payOpen}
        onClose={() => setPayOpen(false)}
        periodLabel={periodLabel}
        rows={rows}
        users={users}
        initialUserId={selectedUserId ?? undefined}
        submitting={createPayout.isLoading}
        format={formatCurrency}
        onSubmit={data => createPayout.mutate({ ...data, month, year })}
      />

      <ProcessMonthDialog
        open={processOpen}
        onClose={() => setProcessOpen(false)}
        row={selectedRow}
        periodLabel={periodLabel}
        periodUnfinished={periodUnfinished}
        submitting={processMonth.isLoading}
        format={formatCurrency}
        onSubmit={data => selectedRow && processMonth.mutate({ userId: selectedRow.userId, month, year, ...data })}
      />

      <ProcessAllDialog
        open={processAllOpen}
        onClose={() => setProcessAllOpen(false)}
        rows={openRows}
        periodLabel={periodLabel}
        periodUnfinished={periodUnfinished}
        submitting={processAll.isLoading}
        format={formatCurrency}
        onConfirm={() => processAll.mutate()}
      />

      <EmployeeSalaryDialog
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        row={selectedRow}
        month={month}
        year={year}
        periodLabel={periodLabel}
        format={formatCurrency}
        canProcess={canProcess}
        canPay={canPay}
        onPay={row => { setViewOpen(false); openPay(row) }}
        onProcess={row => { setViewOpen(false); openProcess(row) }}
        onUndoProcess={confirmUndo}
        onDeletePayout={confirmDeletePayout}
        onHandOverPayout={p => handOverPayout.mutate(p.id)}
        onCancelPayout={p => cancelPayout.mutate(p.id)}
      />

      <SetBaseSalaryDialog
        open={baseOpen}
        onClose={() => setBaseOpen(false)}
        users={users}
        initial={baseInitial}
        submitting={setBaseSalary.isLoading}
        onSubmit={data => setBaseSalary.mutate(data)}
      />

      <Dialog open={confirm.open} onClose={closeConfirm} maxWidth="xs" fullWidth>
        <DialogTitle>{confirm.title}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">{confirm.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirm}>Cancel</Button>
          <Button variant="contained" color={confirm.confirmColor} onClick={confirm.onConfirm}>
            {confirm.confirmLabel}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default SalaryPage
