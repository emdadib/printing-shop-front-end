import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Tab,
  Tabs,
  Grid,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Alert,
  Stack,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  SelectChangeEvent,
} from '@mui/material'
import {
  CheckCircleOutline,
  LunchDining,
  ExitToApp,
  Login as LoginIcon,
  Today,
  BarChart,
  Settings,
  Calculate,
  Refresh,
  PersonOff,
  EventBusy,
  Schedule,
  CheckCircle,
  FiberManualRecord,
  Warning,
  DeleteOutline,
  ThumbUp,
  ThumbDown,
  Storefront,
} from '@mui/icons-material'
import { useSelector } from 'react-redux'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import {
  attendanceApi,
  AttendanceRecord,
  AttendanceConfigData,
  MonthlySummary,
  MonthlyReportUser,
  EmployeeLeaveRow,
  ShopClosure,
} from '@/services/attendanceApi'
import { userApi } from '@/services/userApi'
import { RootState } from '@/store'

// ── helpers ──────────────────────────────────────────────────────────────────

function fmt(dt: string | null | undefined): string {
  if (!dt) return '—'
  return new Date(dt).toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function fmtDate(dt: string | null | undefined): string {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-BD', { weekday: 'short', day: 'numeric', month: 'short' })
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

type ActionState =
  | 'WEEKEND'
  | 'NOT_STARTED'
  | 'CHECKED_IN'
  | 'ON_LUNCH'
  | 'LUNCH_DONE'
  | 'CHECKED_OUT'

function deriveActionState(
  attendance: AttendanceRecord | null,
  isWeekend: boolean
): ActionState {
  if (isWeekend) return 'WEEKEND'
  if (!attendance || !attendance.checkIn) return 'NOT_STARTED'
  if (attendance.checkOut) return 'CHECKED_OUT'
  if (attendance.lunchOut && !attendance.lunchIn) return 'ON_LUNCH'
  if (attendance.lunchOut && attendance.lunchIn) return 'LUNCH_DONE'
  return 'CHECKED_IN'
}

// ── sub-components ────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: number | string
  color?: string
  icon: React.ReactElement
}

const StatCard: React.FC<StatCardProps> = ({ label, value, color = '#1976d2', icon }) => (
  <Card sx={{ flex: 1, minWidth: 0 }}>
    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, textAlign: 'center' }}>
      <Box sx={{ color, mb: 0.5 }}>{icon}</Box>
      <Typography variant="h5" fontWeight={700} sx={{ color }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
        {label}
      </Typography>
    </CardContent>
  </Card>
)

interface TimelineItemProps {
  time: string | null
  label: string
  color: string
  done: boolean
}

const TimelineItem: React.FC<TimelineItemProps> = ({ time, label, color, done }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75 }}>
    <FiberManualRecord sx={{ color: done ? color : 'grey.300', fontSize: 14 }} />
    <Box sx={{ flex: 1 }}>
      <Typography variant="body2" color={done ? 'text.primary' : 'text.disabled'} fontWeight={done ? 600 : 400}>
        {label}
      </Typography>
    </Box>
    <Typography variant="body2" color={done ? color : 'text.disabled'} fontWeight={600}>
      {time || '—'}
    </Typography>
  </Box>
)

// ── Main component ────────────────────────────────────────────────────────────

const AttendancePage: React.FC = () => {
  const queryClient = useQueryClient()
  const { user } = useSelector((state: RootState) => state.auth)
  const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user?.role || '')
  const isConfigAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(user?.role || '')

  const [activeTab, setActiveTab] = useState(0)
  const [now, setNow] = useState(new Date())
  const [historyMonth, setHistoryMonth] = useState(new Date().getMonth() + 1)
  const [historyYear, setHistoryYear] = useState(new Date().getFullYear())
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1)
  const [reportYear, setReportYear] = useState(new Date().getFullYear())
  const [timeOffMonth, setTimeOffMonth] = useState(new Date().getMonth() + 1)
  const [timeOffYear, setTimeOffYear] = useState(new Date().getFullYear())
  const [leaveReviewFilter, setLeaveReviewFilter] = useState<
    'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  >('PENDING')
  const [closureForm, setClosureForm] = useState({ startDate: '', endDate: '', reason: '' })
  const [leaveRequestForm, setLeaveRequestForm] = useState({
    startDate: '',
    endDate: '',
    leaveType: 'ANNUAL',
    reason: '',
  })
  const [markDialogOpen, setMarkDialogOpen] = useState(false)
  const [markForm, setMarkForm] = useState({
    userId: '',
    date: new Date().toISOString().split('T')[0],
    checkIn: '',
    lunchOut: '',
    lunchIn: '',
    checkOut: '',
    status: 'PRESENT',
    notes: '',
  })

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: todayData, isLoading: todayLoading, refetch: refetchToday } = useQuery(
    'attendance-today',
    () => attendanceApi.getTodayStatus(),
    { refetchInterval: 30000 }
  )

  const { data: historyData, isLoading: historyLoading } = useQuery(
    ['attendance-history', historyMonth, historyYear],
    () => attendanceApi.getMyHistory(historyMonth, historyYear),
    { enabled: activeTab === 1 }
  )

  const { data: reportData, isLoading: reportLoading, refetch: refetchReport } = useQuery(
    ['attendance-report', reportMonth, reportYear],
    () => attendanceApi.getMonthlyReport(reportMonth, reportYear),
    { enabled: activeTab === 3 && isAdmin }
  )

  // Config loaded eagerly for config admins — not tied to tab index
  const { data: configData, isLoading: configLoading, refetch: refetchConfig } = useQuery(
    'attendance-config',
    () => attendanceApi.getConfig(),
    {
      enabled: isConfigAdmin,
      staleTime: 5 * 60 * 1000,
      refetchOnMount: true,
    }
  )

  const { data: deductionsData } = useQuery(
    ['attendance-deductions', reportMonth, reportYear],
    () => attendanceApi.getDeductions(reportMonth, reportYear),
    { enabled: activeTab === 3 && isAdmin }
  )

  const { data: shopClosuresRes, refetch: refetchClosures } = useQuery(
    ['shop-closures', timeOffMonth, timeOffYear],
    () => attendanceApi.getShopClosures(timeOffMonth, timeOffYear),
    { enabled: activeTab === 2 }
  )

  const { data: myLeavesRes, refetch: refetchMyLeaves } = useQuery(
    'my-leaves',
    () => attendanceApi.getMyLeaves(),
    { enabled: activeTab === 2 }
  )

  const { data: teamLeavesRes, refetch: refetchTeamLeaves } = useQuery(
    ['team-leaves', leaveReviewFilter],
    () =>
      attendanceApi.getLeavesForManager(leaveReviewFilter === 'ALL' ? undefined : leaveReviewFilter),
    { enabled: activeTab === 2 && isAdmin }
  )

  const { data: usersData } = useQuery(
    'users-list',
    () => userApi.getAllUsers({ limit: 300 }),
    { enabled: markDialogOpen }
  )

  // ── Mutations ─────────────────────────────────────────────────────────────

  const invalidateToday = () => queryClient.invalidateQueries('attendance-today')

  const checkInMutation = useMutation(attendanceApi.checkIn, {
    onSuccess: (res) => { toast.success(res.message || 'Checked in!'); invalidateToday() },
    onError: () => {},
  })
  const lunchOutMutation = useMutation(attendanceApi.lunchOut, {
    onSuccess: (res) => { toast.success(res.message || 'Lunch break started'); invalidateToday() },
    onError: () => {},
  })
  const lunchInMutation = useMutation(attendanceApi.lunchIn, {
    onSuccess: (res) => { toast.success(res.message || 'Returned from lunch'); invalidateToday() },
    onError: () => {},
  })
  const checkOutMutation = useMutation(attendanceApi.checkOut, {
    onSuccess: (res) => { toast.success(res.message || 'Checked out!'); invalidateToday() },
    onError: () => {},
  })

  const calcDeductionsMutation = useMutation(
    () => attendanceApi.calculateDeductions(reportMonth, reportYear),
    {
      onSuccess: (res) => {
        toast.success(res.message || 'Deductions calculated')
        queryClient.invalidateQueries(['attendance-deductions', reportMonth, reportYear])
      },
    }
  )

  const [configForm, setConfigForm] = useState<Partial<Omit<AttendanceConfigData, 'id'>>>({})
  const [configChanged, setConfigChanged] = useState(false)

  // Populate form when data loads — only when no unsaved changes
  useEffect(() => {
    if (configData?.data && !configChanged) {
      setConfigForm({ ...configData.data })
    }
  }, [configData]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateConfigMutation = useMutation(
    (data: Partial<Omit<AttendanceConfigData, 'id'>>) => attendanceApi.updateConfig(data),
    {
      onSuccess: (res) => {
        toast.success('Configuration saved successfully')
        if (res?.data) {
          setConfigForm({ ...res.data })
        }
        setConfigChanged(false)
        queryClient.invalidateQueries('attendance-config')
        queryClient.invalidateQueries('attendance-today')
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.message || 'Failed to save configuration'
        toast.error(msg)
      },
    }
  )

  const adminMarkMutation = useMutation(attendanceApi.adminMarkAttendance, {
    onSuccess: () => {
      toast.success('Attendance recorded')
      setMarkDialogOpen(false)
      queryClient.invalidateQueries(['attendance-report', reportMonth, reportYear])
    },
  })

  const createClosureMutation = useMutation(attendanceApi.createShopClosure, {
    onSuccess: () => {
      toast.success('Shop closure saved')
      setClosureForm({ startDate: '', endDate: '', reason: '' })
      refetchClosures()
      queryClient.invalidateQueries(['attendance-report', reportMonth, reportYear])
      queryClient.invalidateQueries('attendance-today')
      queryClient.invalidateQueries(['attendance-history', historyMonth, historyYear])
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Could not save closure')
    },
  })

  const deleteClosureMutation = useMutation(attendanceApi.deleteShopClosure, {
    onSuccess: () => {
      toast.success('Closure removed')
      refetchClosures()
      queryClient.invalidateQueries('attendance-today')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Could not remove')
    },
  })

  const requestLeaveMutation = useMutation(attendanceApi.requestLeave, {
    onSuccess: () => {
      toast.success('Leave request submitted')
      setLeaveRequestForm((f) => ({ ...f, startDate: '', endDate: '', reason: '' }))
      refetchMyLeaves()
      refetchTeamLeaves()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Could not submit leave')
    },
  })

  const cancelLeaveMutation = useMutation(attendanceApi.cancelLeaveRequest, {
    onSuccess: () => {
      toast.success('Request withdrawn')
      refetchMyLeaves()
      refetchTeamLeaves()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Could not cancel')
    },
  })

  const reviewLeaveMutation = useMutation(
    ({ id, approved, reviewNote }: { id: string; approved: boolean; reviewNote?: string }) =>
      attendanceApi.reviewLeaveRequest(id, { approved, reviewNote }),
    {
      onSuccess: (_d, v) => {
        toast.success(v.approved ? 'Leave approved' : 'Leave rejected')
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.message || 'Review failed')
      },
      onSettled: () => {
        refetchTeamLeaves()
        refetchMyLeaves()
        queryClient.invalidateQueries('attendance-today')
      },
    }
  )

  // ── Derived state ─────────────────────────────────────────────────────────

  const todayStatus = todayData?.data
  const attendance = todayStatus?.attendance ?? null
  const isWeekend = todayStatus?.isWeekend ?? false
  const isShopClosed = Boolean(todayStatus?.isShopClosed)
  const onApprovedLeave = Boolean(todayStatus?.onApprovedLeaveToday)
  const blockedDay = isWeekend || isShopClosed || onApprovedLeave
  const todayConfig = todayStatus?.config
  const actionState = blockedDay ? 'WEEKEND' : deriveActionState(attendance, isWeekend)

  const isAnyLoading =
    checkInMutation.isLoading ||
    lunchOutMutation.isLoading ||
    lunchInMutation.isLoading ||
    checkOutMutation.isLoading

  // ── Tab setup ─────────────────────────────────────────────────────────────

  const tabs = isConfigAdmin
    ? ['Today', 'My History', 'Closures & leave', 'Monthly Report', 'Config']
    : isAdmin
    ? ['Today', 'My History', 'Closures & leave', 'Monthly Report']
    : ['Today', 'My History', 'Closures & leave']

  // ── Render helpers ────────────────────────────────────────────────────────

  const statusColor = {
    WEEKEND: '#9e9e9e',
    NOT_STARTED: '#ef5350',
    CHECKED_IN: '#66bb6a',
    ON_LUNCH: '#ffa726',
    LUNCH_DONE: '#42a5f5',
    CHECKED_OUT: '#7e57c2',
  }[actionState]

  const statusLabel = {
    WEEKEND: 'Weekend — No Attendance',
    NOT_STARTED: 'Not Checked In',
    CHECKED_IN: 'Working',
    ON_LUNCH: 'On Lunch Break',
    LUNCH_DONE: 'Back from Lunch',
    CHECKED_OUT: 'Day Completed',
  }[actionState]

  const headerAccentColor = isShopClosed
    ? '#78909c'
    : onApprovedLeave
    ? '#5c6bc0'
    : isWeekend
    ? '#9e9e9e'
    : statusColor

  const headerStatusLabel = isShopClosed
    ? `Shop closed${todayStatus?.shopClosureToday?.reason ? ` — ${todayStatus.shopClosureToday.reason}` : ''}`
    : onApprovedLeave
    ? 'On approved leave today'
    : isWeekend
    ? 'Weekend — No Attendance'
    : statusLabel

  const renderActionButton = () => {
    if (blockedDay) return null

    const btnProps = {
      variant: 'contained' as const,
      size: 'large' as const,
      fullWidth: true,
      disabled: isAnyLoading,
      sx: { py: 2, fontSize: 18, fontWeight: 700, borderRadius: 3, mt: 2 },
    }

    switch (actionState) {
      case 'NOT_STARTED':
        return (
          <Button
            {...btnProps}
            startIcon={isAnyLoading ? <CircularProgress size={20} color="inherit" /> : <LoginIcon />}
            color="success"
            onClick={() => checkInMutation.mutate()}
          >
            Check In
          </Button>
        )
      case 'CHECKED_IN':
        return (
          <Button
            {...btnProps}
            startIcon={isAnyLoading ? <CircularProgress size={20} color="inherit" /> : <LunchDining />}
            color="warning"
            onClick={() => lunchOutMutation.mutate()}
          >
            Lunch Out
          </Button>
        )
      case 'ON_LUNCH':
        return (
          <Stack spacing={1} sx={{ mt: 2 }}>
            <Button
              {...btnProps}
              sx={{ ...btnProps.sx, mt: 0 }}
              startIcon={isAnyLoading ? <CircularProgress size={20} color="inherit" /> : <LunchDining />}
              color="info"
              onClick={() => lunchInMutation.mutate()}
            >
              Lunch In
            </Button>
            <Button
              {...btnProps}
              sx={{ ...btnProps.sx, mt: 0 }}
              startIcon={isAnyLoading ? <CircularProgress size={20} color="inherit" /> : <ExitToApp />}
              color="secondary"
              onClick={() => checkOutMutation.mutate()}
            >
              Check Out (without lunch in)
            </Button>
          </Stack>
        )
      case 'LUNCH_DONE':
        return (
          <Button
            {...btnProps}
            startIcon={isAnyLoading ? <CircularProgress size={20} color="inherit" /> : <ExitToApp />}
            color="secondary"
            onClick={() => checkOutMutation.mutate()}
          >
            Check Out
          </Button>
        )
      case 'CHECKED_OUT':
        return (
          <Box
            sx={{
              mt: 2,
              py: 1.5,
              px: 2,
              bgcolor: 'success.50',
              border: '1px solid',
              borderColor: 'success.200',
              borderRadius: 3,
              textAlign: 'center',
            }}
          >
            <CheckCircle sx={{ color: 'success.main', fontSize: 32, mb: 0.5 }} />
            <Typography variant="body1" color="success.main" fontWeight={600}>
              Day Completed
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Total: {attendance?.totalHours ? `${Number(attendance.totalHours).toFixed(2)} hrs` : '—'}
            </Typography>
          </Box>
        )
    }
  }

  const renderLunchWindowHint = () => {
    if (blockedDay || !todayConfig || actionState !== 'CHECKED_IN') return null
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const lunchStartMins =
      parseInt(todayConfig.lunchBreakStartEarliest.split(':')[0]) * 60 +
      parseInt(todayConfig.lunchBreakStartEarliest.split(':')[1])
    if (currentMinutes < lunchStartMins) {
      const diff = lunchStartMins - currentMinutes
      return (
        <Alert severity="info" sx={{ mt: 1, fontSize: 12 }}>
          Lunch break opens at {todayConfig.lunchBreakStartEarliest} ({Math.floor(diff / 60)}h {diff % 60}m away)
        </Alert>
      )
    }
    return null
  }

  // ── Tab: Today ─────────────────────────────────────────────────────────────

  const renderTodayTab = () => {
    if (todayLoading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )
    }

    return (
      <Box>
        {/* Header Clock */}
        <Card sx={{ mb: 2, bgcolor: headerAccentColor, color: '#fff', borderRadius: 3 }}>
          <CardContent sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="h3" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums', letterSpacing: 2 }}>
              {now.toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9, mt: 0.5 }}>
              {now.toLocaleDateString('en-BD', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </Typography>
            <Chip
              label={headerStatusLabel}
              sx={{ mt: 1.5, bgcolor: 'rgba(255,255,255,0.25)', color: '#fff', fontWeight: 700, fontSize: 13 }}
            />
            {attendance?.isLate && (
              <Chip
                icon={<Warning sx={{ fontSize: 14, color: '#fff !important' }} />}
                label={`Late by ${attendance.lateMinutes} min`}
                sx={{ ml: 1, mt: 1.5, bgcolor: 'rgba(0,0,0,0.25)', color: '#fff', fontSize: 12 }}
              />
            )}
          </CardContent>
        </Card>

        {renderActionButton()}
        {renderLunchWindowHint()}

        {/* Timeline */}
        {!blockedDay && attendance?.checkIn && (
          <Card sx={{ mt: 2, borderRadius: 3 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Today's Timeline
              </Typography>
              <TimelineItem time={fmt(attendance?.checkIn)} label="Check In" color="#66bb6a" done={!!attendance?.checkIn} />
              <TimelineItem time={fmt(attendance?.lunchOut)} label="Lunch Out" color="#ffa726" done={!!attendance?.lunchOut} />
              <TimelineItem time={fmt(attendance?.lunchIn)} label="Lunch In" color="#42a5f5" done={!!attendance?.lunchIn} />
              <TimelineItem time={fmt(attendance?.checkOut)} label="Check Out" color="#7e57c2" done={!!attendance?.checkOut} />
            </CardContent>
          </Card>
        )}

        {isWeekend && !isShopClosed && !onApprovedLeave && (
          <Alert severity="info" sx={{ mt: 2, borderRadius: 3 }}>
            Today is a weekend ({DAY_NAMES[now.getDay()]}). Enjoy your day off!
          </Alert>
        )}

        {isShopClosed && (
          <Alert severity="warning" sx={{ mt: 2, borderRadius: 3 }} icon={<Storefront />}>
            The shop is closed today. Clock-in and other attendance actions are disabled.
          </Alert>
        )}

        {onApprovedLeave && !isShopClosed && (
          <Alert severity="info" sx={{ mt: 2, borderRadius: 3 }}>
            You have approved leave covering today. Enjoy your time off — attendance is disabled.
          </Alert>
        )}

        {todayConfig && !blockedDay && (
          <Card sx={{ mt: 2, borderRadius: 3, bgcolor: 'grey.50' }}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <span>Check-in: {todayConfig.checkInTime}</span>
                <span>Late after: {todayConfig.checkInLateThreshold}</span>
                <span>Lunch: {todayConfig.lunchBreakStartEarliest}–{todayConfig.lunchBreakEndLatest}</span>
                <span>Check-out: {todayConfig.checkOutTime}</span>
              </Typography>
            </CardContent>
          </Card>
        )}
      </Box>
    )
  }

  // ── Tab: History ────────────────────────────────────────────────────────────

  const renderHistoryTab = () => {
    const summary = historyData?.data?.summary as MonthlySummary | undefined
    const records = historyData?.data?.records ?? []

    return (
      <Box>
        <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
          <FormControl size="small" fullWidth>
            <InputLabel>Month</InputLabel>
            <Select value={historyMonth} label="Month" onChange={(e: SelectChangeEvent<number>) => setHistoryMonth(Number(e.target.value))}>
              {MONTH_NAMES.map((m, i) => <MenuItem key={i} value={i + 1}>{m}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel>Year</InputLabel>
            <Select value={historyYear} label="Year" onChange={(e: SelectChangeEvent<number>) => setHistoryYear(Number(e.target.value))}>
              {[2024, 2025, 2026].map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>

        {summary && (
          <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
            <StatCard label="Working Days" value={summary.workingDays} color="#1976d2" icon={<Today fontSize="small" />} />
            {(summary.approvedLeaveDays ?? 0) > 0 && (
              <StatCard label="Leave (approved)" value={summary.approvedLeaveDays ?? 0} color="#5c6bc0" icon={<Schedule fontSize="small" />} />
            )}
            <StatCard label="Present" value={summary.presentDays} color="#388e3c" icon={<CheckCircleOutline fontSize="small" />} />
            <StatCard label="Late" value={summary.lateDays} color="#f57c00" icon={<Schedule fontSize="small" />} />
            <StatCard label="Absent" value={summary.absentDays} color="#d32f2f" icon={<PersonOff fontSize="small" />} />
          </Stack>
        )}

        {summary && summary.totalDeductionDays > 0 && (
          <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
            <Typography variant="body2" fontWeight={600}>
              Salary Deduction: {summary.totalDeductionDays} day(s)
            </Typography>
            <Typography variant="caption">
              Late: {summary.lateDeductionDays}d · Absent: {summary.absentDeductionDays}d
              {(typeof summary.expectedPresentDays === 'number')
                ? ` · Expected attendance days: ${summary.expectedPresentDays} (working days minus approved leave).`
                : ''}
            </Typography>
          </Alert>
        )}
        {summary &&
          (((summary.shopClosureWeekdays ?? 0) > 0) || ((summary.approvedLeaveDays ?? 0) > 0)) && (
          <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
            <Typography variant="caption">
              {(summary.shopClosureWeekdays ?? 0) > 0 && (
                <>{summary.shopClosureWeekdays} weekday(s) in this month were shop closures — not counted toward working days. </>
              )}
              {(summary.approvedLeaveDays ?? 0) > 0 && (
                <>You have {(summary.approvedLeaveDays ?? 0)} approved leave day(s); those are excluded from absent days.</>
              )}
            </Typography>
          </Alert>
        )}
        {summary && summary.totalDeductionDays === 0 && summary.workingDays > 0 && (
          <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>No salary deductions this month.</Alert>
        )}

        {historyLoading ? (
          <LinearProgress />
        ) : records.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
            <EventBusy sx={{ fontSize: 48, mb: 1, opacity: 0.4 }} />
            <Typography>No attendance records found</Typography>
          </Box>
        ) : (
          <Stack spacing={1}>
            {records.map((rec) => (
              <Card key={rec.id} sx={{ borderRadius: 2 }}>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{fmtDate(rec.date)}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {fmt(rec.checkIn)} → {fmt(rec.checkOut)}
                        {rec.lunchOut && ` · Lunch: ${fmt(rec.lunchOut)}–${fmt(rec.lunchIn)}`}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      {rec.isLate && <Chip label={`+${rec.lateMinutes}m`} size="small" color="warning" />}
                      <Chip
                        label={rec.status}
                        size="small"
                        color={rec.status === 'PRESENT' ? 'success' : rec.status === 'LATE' ? 'warning' : rec.status === 'ABSENT' ? 'error' : 'default'}
                      />
                      {rec.totalHours && <Chip label={`${Number(rec.totalHours).toFixed(1)}h`} size="small" variant="outlined" />}
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Box>
    )
  }

  // ── Tab: Admin Report ───────────────────────────────────────────────────────

  const renderReportTab = () => {
    const report = reportData?.data?.report ?? []
    const deductions = deductionsData?.data ?? []

    return (
      <Box>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Month</InputLabel>
            <Select value={reportMonth} label="Month" onChange={(e: SelectChangeEvent<number>) => setReportMonth(Number(e.target.value))}>
              {MONTH_NAMES.map((m, i) => <MenuItem key={i} value={i + 1}>{m}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 90 }}>
            <InputLabel>Year</InputLabel>
            <Select value={reportYear} label="Year" onChange={(e: SelectChangeEvent<number>) => setReportYear(Number(e.target.value))}>
              {[2024, 2025, 2026].map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
            </Select>
          </FormControl>
          <Tooltip title="Refresh"><IconButton size="small" onClick={() => refetchReport()}><Refresh /></IconButton></Tooltip>
          <Button variant="outlined" size="small" startIcon={<Calculate />} onClick={() => calcDeductionsMutation.mutate()} disabled={calcDeductionsMutation.isLoading}>
            Calc Deductions
          </Button>
          <Button variant="contained" size="small" onClick={() => setMarkDialogOpen(true)}>Manual Entry</Button>
        </Stack>

        {reportData?.data && typeof reportData.data.shopClosureWeekdays === 'number' && reportData.data.shopClosureWeekdays > 0 && (
          <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
            <Typography variant="caption">
              This month includes {reportData.data.shopClosureWeekdays} weekday closure day(s).
              Deduction absent counts use working days minus approved leave for each employee.
            </Typography>
          </Alert>
        )}

        {reportLoading ? <LinearProgress /> : (
          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.100' }}>
                  <TableCell>Employee</TableCell>
                  <TableCell align="center">Working</TableCell>
                  <TableCell align="center">Leave</TableCell>
                  <TableCell align="center">Present</TableCell>
                  <TableCell align="center">Late</TableCell>
                  <TableCell align="center">Absent</TableCell>
                  <TableCell align="center">Deduct Days</TableCell>
                  <TableCell align="center">Deduct (৳)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {report.map((row: MonthlyReportUser) => {
                  const ded = deductions.find((d) => d.userId === row.user.id)
                  return (
                    <TableRow key={row.user.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{row.user.firstName} {row.user.lastName}</Typography>
                        <Typography variant="caption" color="text.secondary">{row.user.email}</Typography>
                      </TableCell>
                      <TableCell align="center">{row.workingDays}</TableCell>
                      <TableCell align="center">
                        {(row.approvedLeaveDays ?? 0) > 0 ? (
                          <Chip label={row.approvedLeaveDays} size="small" color="info" variant="outlined" />
                        ) : '0'}
                      </TableCell>
                      <TableCell align="center"><Chip label={row.presentDays} size="small" color="success" /></TableCell>
                      <TableCell align="center">{row.lateDays > 0 ? <Chip label={row.lateDays} size="small" color="warning" /> : '0'}</TableCell>
                      <TableCell align="center">{row.absentDays > 0 ? <Chip label={row.absentDays} size="small" color="error" /> : '0'}</TableCell>
                      <TableCell align="center">
                        {row.totalDeductionDays > 0
                          ? <Chip label={row.totalDeductionDays} size="small" color="error" variant="outlined" />
                          : <Chip label="0" size="small" color="success" variant="outlined" />}
                      </TableCell>
                      <TableCell align="center">
                        {ded ? `৳${Number(ded.deductionAmount).toLocaleString('en-BD', { minimumFractionDigits: 0 })}` : '—'}
                      </TableCell>
                    </TableRow>
                  )
                })}
                {report.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>No data for selected period</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {reportData?.data && (
          <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }} icon={<BarChart />}>
            <Typography variant="caption">
              <strong>Deduction Rules:</strong> Every 3 late days = 1 day deduction · Every 2 absent days = 1 day deduction ·
              Shop closures shorten “working days” for everyone · Approved leave lowers expected days per employee (not counted absent)
            </Typography>
          </Alert>
        )}
      </Box>
    )
  }

  // ── Tab: Shop closures & leave ─────────────────────────────────────────────

  const renderTimeOffTab = () => {
    const closures: ShopClosure[] = shopClosuresRes?.data ?? []
    const myLeaves: EmployeeLeaveRow[] = myLeavesRes?.data ?? []
    const teamLeaves: EmployeeLeaveRow[] = teamLeavesRes?.data ?? []

    const fmtShort = (d: string) => new Date(d).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' })

    const leaveStatusColor = (s: EmployeeLeaveRow['status']) => {
      switch (s) {
        case 'APPROVED': return 'success' as const
        case 'PENDING': return 'warning' as const
        case 'REJECTED': return 'error' as const
        case 'CANCELLED': return 'default' as const
        default: return 'default' as const
      }
    }

    return (
      <Box>
        <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
          <FormControl size="small" fullWidth>
            <InputLabel>Month</InputLabel>
            <Select
              value={timeOffMonth}
              label="Month"
              onChange={(e: SelectChangeEvent<number>) => setTimeOffMonth(Number(e.target.value))}
            >
              {MONTH_NAMES.map((m, i) => (
                <MenuItem key={i} value={i + 1}>{m}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel>Year</InputLabel>
            <Select
              value={timeOffYear}
              label="Year"
              onChange={(e: SelectChangeEvent<number>) => setTimeOffYear(Number(e.target.value))}
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <MenuItem key={y} value={y}>{y}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Tooltip title="Refresh closures">
            <IconButton size="small" onClick={() => refetchClosures()} sx={{ mt: 0.5 }}><Refresh /></IconButton>
          </Tooltip>
        </Stack>

        <Typography variant="subtitle1" fontWeight={700} gutterBottom>Shop closures</Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
          Dates the whole shop is off (renovation, holiday, etc.). Those weekdays are excluded from attendance expectations for everyone — no absent penalty.
        </Typography>

        {closures.length === 0 ? (
          <Alert severity="info" sx={{ mb: 2 }} icon={<Storefront />}>No shop closures recorded for this month.</Alert>
        ) : (
          <Stack spacing={1} sx={{ mb: 2 }}>
            {closures.map((c) => (
              <Card key={c.id} sx={{ borderRadius: 2 }}>
                <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 }, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={600}>
                      {fmtShort(c.startDate)} → {fmtShort(c.endDate)}
                    </Typography>
                    {c.reason && (
                      <Typography variant="caption" color="text.secondary">{c.reason}</Typography>
                    )}
                  </Box>
                  {isAdmin && (
                    <Tooltip title="Remove closure">
                      <IconButton
                        size="small"
                        color="error"
                        disabled={deleteClosureMutation.isLoading}
                        onClick={() => deleteClosureMutation.mutate(c.id)}
                      >
                        <DeleteOutline fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}

        {isAdmin && (
          <Card sx={{ mb: 3, borderRadius: 2, bgcolor: 'grey.50' }}>
            <CardContent sx={{ pb: '16px !important' }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>Add closure</Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth size="small" type="date" label="Start" InputLabelProps={{ shrink: true }}
                    value={closureForm.startDate}
                    onChange={(e) => setClosureForm((f) => ({ ...f, startDate: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth size="small" type="date" label="End" InputLabelProps={{ shrink: true }}
                    value={closureForm.endDate}
                    onChange={(e) => setClosureForm((f) => ({ ...f, endDate: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth size="small" label="Reason (optional)"
                    value={closureForm.reason}
                    onChange={(e) => setClosureForm((f) => ({ ...f, reason: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    size="small"
                    disabled={
                      createClosureMutation.isLoading ||
                      !closureForm.startDate ||
                      !closureForm.endDate
                    }
                    onClick={() =>
                      createClosureMutation.mutate({
                        startDate: closureForm.startDate,
                        endDate: closureForm.endDate,
                        ...(closureForm.reason.trim() ? { reason: closureForm.reason.trim() } : {}),
                      })
                    }
                  >
                    Save shop closure
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle1" fontWeight={700} gutterBottom>My leave</Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
          Request time off — a manager admin must approve. Approved leave dates are excluded from absent-day calculations (only on working weekdays that are not shop closures).
        </Typography>

        <Card sx={{ mb: 2, borderRadius: 2, bgcolor: 'grey.50' }}>
          <CardContent sx={{ pb: '16px !important' }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>New request</Typography>
            <Grid container spacing={1.5}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth size="small" type="date" label="From" InputLabelProps={{ shrink: true }}
                  value={leaveRequestForm.startDate}
                  onChange={(e) => setLeaveRequestForm((f) => ({ ...f, startDate: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth size="small" type="date" label="To" InputLabelProps={{ shrink: true }}
                  value={leaveRequestForm.endDate}
                  onChange={(e) => setLeaveRequestForm((f) => ({ ...f, endDate: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth size="small" label="Type (e.g. ANNUAL)"
                  value={leaveRequestForm.leaveType}
                  onChange={(e) => setLeaveRequestForm((f) => ({ ...f, leaveType: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth size="small" multiline rows={2} label="Reason (optional)"
                  value={leaveRequestForm.reason}
                  onChange={(e) => setLeaveRequestForm((f) => ({ ...f, reason: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  size="small"
                  disabled={
                    requestLeaveMutation.isLoading ||
                    !leaveRequestForm.startDate ||
                    !leaveRequestForm.endDate
                  }
                  onClick={() =>
                    requestLeaveMutation.mutate({
                      startDate: leaveRequestForm.startDate,
                      endDate: leaveRequestForm.endDate,
                      leaveType: leaveRequestForm.leaveType || 'ANNUAL',
                      ...(leaveRequestForm.reason.trim() ? { reason: leaveRequestForm.reason.trim() } : {}),
                    })
                  }
                >
                  Submit leave request
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {myLeaves.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>You have no leave requests yet.</Typography>
        ) : (
          <Stack spacing={1} sx={{ mb: 3 }}>
            {myLeaves.map((L) => (
              <Card key={L.id} sx={{ borderRadius: 2 }}>
                <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {fmtShort(L.startDate)} → {fmtShort(L.endDate)} · {L.leaveType}
                      </Typography>
                      {L.reason && <Typography variant="caption" color="text.secondary" display="block">{L.reason}</Typography>}
                      {L.status === 'REJECTED' && L.reviewNote && (
                        <Typography variant="caption" color="error" display="block">Note: {L.reviewNote}</Typography>
                      )}
                    </Box>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Chip label={L.status} size="small" color={leaveStatusColor(L.status)} />
                      {L.status === 'PENDING' && (
                        <Button size="small" color="inherit" onClick={() => cancelLeaveMutation.mutate(L.id)}>
                          Withdraw
                        </Button>
                      )}
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}

        {isAdmin && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>Team leave (review)</Typography>
            <FormControl size="small" sx={{ minWidth: 160, mb: 1 }}>
              <InputLabel>Filter</InputLabel>
              <Select
                value={leaveReviewFilter}
                label="Filter"
                onChange={(e) =>
                  setLeaveReviewFilter(e.target.value as typeof leaveReviewFilter)
                }
              >
                <MenuItem value="ALL">All</MenuItem>
                <MenuItem value="PENDING">Pending</MenuItem>
                <MenuItem value="APPROVED">Approved</MenuItem>
                <MenuItem value="REJECTED">Rejected</MenuItem>
                <MenuItem value="CANCELLED">Cancelled</MenuItem>
              </Select>
            </FormControl>

            <Stack spacing={1}>
              {teamLeaves.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No requests.</Typography>
              ) : (
                teamLeaves.map((L) => (
                  <Card key={L.id} sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
                      <Typography variant="body2" fontWeight={600}>
                        {L.user?.firstName} {L.user?.lastName}
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>{L.user?.email}</Typography>
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary">
                        {fmtShort(L.startDate)} → {fmtShort(L.endDate)} · {L.leaveType}
                      </Typography>
                      {L.reason && <Typography variant="caption" display="block">{L.reason}</Typography>}
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }} flexWrap="wrap">
                        <Chip label={L.status} size="small" color={leaveStatusColor(L.status)} />
                        {L.status === 'PENDING' && (
                          <>
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              startIcon={<ThumbUp />}
                              disabled={reviewLeaveMutation.isLoading}
                              onClick={() => reviewLeaveMutation.mutate({ id: L.id, approved: true })}
                            >
                              Approve
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              startIcon={<ThumbDown />}
                              disabled={reviewLeaveMutation.isLoading}
                              onClick={() => reviewLeaveMutation.mutate({ id: L.id, approved: false })}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                ))
              )}
            </Stack>
          </>
        )}
      </Box>
    )
  }

  // ── Tab: Config ─────────────────────────────────────────────────────────────

  const renderConfigTab = () => {
    if (configLoading) {
      return (
        <Box sx={{ py: 4 }}>
          <LinearProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
            Loading configuration…
          </Typography>
        </Box>
      )
    }

    if (!configData?.data) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Could not load configuration. The database migration may not have been applied yet.
          </Alert>
          <Button variant="outlined" startIcon={<Refresh />} onClick={() => refetchConfig()}>Retry</Button>
        </Box>
      )
    }

    const handleChange = (key: keyof typeof configForm, value: unknown) => {
      setConfigForm((prev) => ({ ...prev, [key]: value }))
      setConfigChanged(true)
    }

    return (
      <Box>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="h6" fontWeight={700}>Attendance Rules Configuration</Typography>
          <Tooltip title="Reload from server">
            <IconButton size="small" onClick={() => { refetchConfig(); setConfigChanged(false) }}><Refresh /></IconButton>
          </Tooltip>
        </Stack>
        <Alert severity="info" sx={{ mb: 2 }}>
          All time values use 24-hour format (HH:MM). Changes apply immediately to all employees.
        </Alert>

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Work Hours</Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Check-In Time" value={configForm.checkInTime || ''} onChange={(e) => handleChange('checkInTime', e.target.value)} helperText="Standard arrival time (e.g. 10:00)" size="small" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Late Threshold" value={configForm.checkInLateThreshold || ''} onChange={(e) => handleChange('checkInLateThreshold', e.target.value)} helperText="Arriving after this time counts as late (e.g. 10:30)" size="small" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Check-Out Time" value={configForm.checkOutTime || ''} onChange={(e) => handleChange('checkOutTime', e.target.value)} helperText="Standard departure time (e.g. 20:30)" size="small" />
          </Grid>

          <Grid item xs={12} sx={{ mt: 1 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Lunch Break</Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Lunch Window — Start" value={configForm.lunchBreakStartEarliest || ''} onChange={(e) => handleChange('lunchBreakStartEarliest', e.target.value)} helperText="Earliest time lunch break can start (e.g. 13:00)" size="small" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Lunch Window — End" value={configForm.lunchBreakEndLatest || ''} onChange={(e) => handleChange('lunchBreakEndLatest', e.target.value)} helperText="Latest time for lunch break (e.g. 15:00)" size="small" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={<Switch checked={!!configForm.lunchBreakMandatory} onChange={(e) => handleChange('lunchBreakMandatory', e.target.checked)} color="primary" />}
              label="Lunch Break Mandatory"
            />
          </Grid>

          <Grid item xs={12} sx={{ mt: 1 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Salary Deduction Rules</Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth type="number" label="Late Days per Deduction"
              value={configForm.lateCountThreshold ?? ''}
              onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 1) handleChange('lateCountThreshold', v) }}
              helperText="Every N late days = 1 full day salary deduction (default: 3)"
              size="small" inputProps={{ min: 1 }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth type="number" label="Absent Days per Deduction"
              value={configForm.absentDaysThreshold ?? ''}
              onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 1) handleChange('absentDaysThreshold', v) }}
              helperText="Every N absent days = 1 full day salary deduction (default: 2)"
              size="small" inputProps={{ min: 1 }}
            />
          </Grid>

          <Grid item xs={12} sx={{ mt: 1 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Weekend Days</Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>
          <Grid item xs={12}>
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
              {DAY_NAMES.map((day, idx) => {
                const selected = (configForm.weekendDays ?? []).includes(idx)
                return (
                  <Chip
                    key={idx} label={day} clickable
                    color={selected ? 'primary' : 'default'}
                    variant={selected ? 'filled' : 'outlined'}
                    onClick={() => {
                      const current: number[] = configForm.weekendDays ?? []
                      const updated = selected ? current.filter((d) => d !== idx) : [...current, idx].sort()
                      handleChange('weekendDays', updated)
                    }}
                  />
                )
              })}
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Selected days are treated as weekend (no attendance required)
            </Typography>
          </Grid>

          <Grid item xs={12} sx={{ mt: 1 }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Button
                variant="contained" size="large"
                disabled={!configChanged || updateConfigMutation.isLoading}
                onClick={() => {
                  const payload = { ...configForm }
                  delete (payload as any).id
                  delete (payload as any).createdAt
                  delete (payload as any).updatedAt
                  updateConfigMutation.mutate(payload)
                }}
                startIcon={updateConfigMutation.isLoading ? <CircularProgress size={16} color="inherit" /> : <Settings />}
              >
                {updateConfigMutation.isLoading ? 'Saving…' : 'Save Configuration'}
              </Button>
              {configChanged && !updateConfigMutation.isLoading && (
                <Chip label="Unsaved changes" color="warning" size="small" />
              )}
              {updateConfigMutation.isSuccess && !configChanged && (
                <Chip label="Saved" color="success" size="small" icon={<CheckCircle sx={{ fontSize: 14 }} />} />
              )}
            </Stack>
          </Grid>
        </Grid>
      </Box>
    )
  }

  // ── Manual Entry Dialog ─────────────────────────────────────────────────────

  const renderMarkDialog = () => (
    <Dialog open={markDialogOpen} onClose={() => setMarkDialogOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Manual Attendance Entry</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Employee</InputLabel>
              <Select value={markForm.userId} label="Employee" onChange={(e: SelectChangeEvent) => setMarkForm((f) => ({ ...f, userId: e.target.value }))}>
                {(usersData?.data ?? []).map((u: { id: string; firstName: string; lastName: string }) => (
                  <MenuItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth type="date" label="Date" size="small" value={markForm.date} onChange={(e) => setMarkForm((f) => ({ ...f, date: e.target.value }))} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select value={markForm.status} label="Status" onChange={(e: SelectChangeEvent) => setMarkForm((f) => ({ ...f, status: e.target.value }))}>
                {['PRESENT', 'LATE', 'ABSENT', 'HALF_DAY', 'HOLIDAY', 'ON_LEAVE'].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth type="time" label="Check In" size="small" value={markForm.checkIn} onChange={(e) => setMarkForm((f) => ({ ...f, checkIn: e.target.value }))} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth type="time" label="Lunch Out" size="small" value={markForm.lunchOut} onChange={(e) => setMarkForm((f) => ({ ...f, lunchOut: e.target.value }))} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth type="time" label="Lunch In" size="small" value={markForm.lunchIn} onChange={(e) => setMarkForm((f) => ({ ...f, lunchIn: e.target.value }))} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth type="time" label="Check Out" size="small" value={markForm.checkOut} onChange={(e) => setMarkForm((f) => ({ ...f, checkOut: e.target.value }))} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth multiline rows={2} label="Notes" size="small" value={markForm.notes} onChange={(e) => setMarkForm((f) => ({ ...f, notes: e.target.value }))} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setMarkDialogOpen(false)}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!markForm.userId || !markForm.date || adminMarkMutation.isLoading}
          onClick={() => {
            const dateStr = markForm.date
            const toISO = (t: string) => t ? `${dateStr}T${t}:00` : undefined
            adminMarkMutation.mutate({
              userId: markForm.userId,
              date: dateStr,
              status: markForm.status as any,
              checkIn: toISO(markForm.checkIn),
              lunchOut: toISO(markForm.lunchOut),
              lunchIn: toISO(markForm.lunchIn),
              checkOut: toISO(markForm.checkOut),
              notes: markForm.notes || undefined,
            })
          }}
        >
          {adminMarkMutation.isLoading ? <CircularProgress size={16} /> : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  )

  // ── Root render ────────────────────────────────────────────────────────────

  return (
    <Box sx={{ maxWidth: 680, mx: 'auto', p: { xs: 1, sm: 2 } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>Attendance</Typography>
        <Tooltip title="Refresh">
          <IconButton size="small" onClick={() => refetchToday()}><Refresh /></IconButton>
        </Tooltip>
      </Stack>

      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        {tabs.map((label) => (
          <Tab key={label} label={label} sx={{ fontWeight: 600, textTransform: 'none' }} />
        ))}
      </Tabs>

      {activeTab === 0 && renderTodayTab()}
      {activeTab === 1 && renderHistoryTab()}
      {activeTab === 2 && renderTimeOffTab()}
      {activeTab === 3 && isAdmin && renderReportTab()}
      {activeTab === 4 && isConfigAdmin && renderConfigTab()}

      {renderMarkDialog()}
    </Box>
  )
}

export default AttendancePage
