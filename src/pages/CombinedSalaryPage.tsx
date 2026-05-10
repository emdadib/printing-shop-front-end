import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Tooltip,
  Snackbar,
  Alert,
  Divider,
  InputAdornment,
  Stack,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  AccountBalanceWallet as WalletIcon,
  TrendingUp as TrendingUpIcon,
  CalendarMonth as CalendarIcon,
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  Search as SearchIcon,
  Receipt as ReceiptIcon,
  Group as GroupIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  salaryAdvanceApi,
  SalaryAdvance,
  CreateSalaryAdvanceData,
} from '@/services/salaryAdvanceApi';
import {
  improvedSalaryApi,
  EmployeeSalaryProfile,
  SalaryPayment,
} from '@/services/improvedSalaryApi';
import { userApi } from '@/services/userApi';

// ─────────────────────────── constants & helpers ────────────────────────────

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const formatBDT = (amount: number) =>
  new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

const ADVANCE_STATUS_LABELS: Record<string, string> = {
  PENDING:   'Waiting for Approval',
  APPROVED:  'Approved',
  PAID:      'Paid',
  REJECTED:  'Rejected',
  CANCELLED: 'Cancelled',
};

const ADVANCE_STATUS_COLORS: Record<
  string,
  'warning' | 'info' | 'success' | 'error' | 'default'
> = {
  PENDING:   'warning',
  APPROVED:  'info',
  PAID:      'success',
  REJECTED:  'error',
  CANCELLED: 'default',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING:   'Awaiting Payment',
  PAID:      'Paid',
  CANCELLED: 'Cancelled',
};

const PAYMENT_STATUS_COLORS: Record<string, 'warning' | 'success' | 'default'> = {
  PENDING:   'warning',
  PAID:      'success',
  CANCELLED: 'default',
};

// ─────────────────────────── local types ────────────────────────────────────

type SnackbarState = {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
};

type ConfirmDialogState = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmColor: 'error' | 'success' | 'primary' | 'warning';
  onConfirm: () => void;
};

type AdvanceStatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED' | 'CANCELLED';

// ─────────────────────────── component ──────────────────────────────────────

const CombinedSalaryPage: React.FC = () => {
  const queryClient = useQueryClient();

  // ── month/year navigation
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear]   = useState(now.getFullYear());

  // ── tabs
  const [tabValue, setTabValue] = useState(0);

  // ── advance filters
  const [advanceFilter, setAdvanceFilter] = useState<AdvanceStatusFilter>('ALL');
  const [advanceSearch, setAdvanceSearch] = useState('');

  // ── dialogs
  const [advanceDialogOpen,        setAdvanceDialogOpen]        = useState(false);
  const [setSalaryDialogOpen,      setSetSalaryDialogOpen]      = useState(false);
  const [processPaymentDialogOpen, setProcessPaymentDialogOpen] = useState(false);
  const [payslipDialogOpen,        setPayslipDialogOpen]        = useState(false);
  const [selectedPayslip,          setSelectedPayslip]          = useState<SalaryPayment | null>(null);
  const [selectedProfile,          setSelectedProfile]          = useState<EmployeeSalaryProfile | null>(null);

  // ── forms
  const [advanceForm, setAdvanceForm] = useState({ userId: '', amount: '', reason: '', notes: '' });
  const [salaryForm,  setSalaryForm]  = useState({ userId: '', baseSalary: '', notes: '' });
  const [paymentForm, setPaymentForm] = useState({ amount: '', deductions: '', bonuses: '', notes: '' });

  // ── snackbar / confirm
  const [snackbar, setSnackbar] = useState<SnackbarState>({ open: false, message: '', severity: 'success' });
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    open: false, title: '', message: '', confirmLabel: 'Confirm', confirmColor: 'primary', onConfirm: () => {},
  });

  const showSnackbar = (message: string, severity: SnackbarState['severity'] = 'success') =>
    setSnackbar({ open: true, message, severity });

  const openConfirm = (config: Omit<ConfirmDialogState, 'open'>) =>
    setConfirmDialog({ open: true, ...config });

  const closeConfirm = () => setConfirmDialog(d => ({ ...d, open: false }));

  // ── month navigation
  const navigateMonth = (direction: -1 | 1) => {
    let m = selectedMonth + direction;
    let y = selectedYear;
    if (m < 1)  { m = 12; y -= 1; }
    if (m > 12) { m = 1;  y += 1; }
    setSelectedMonth(m);
    setSelectedYear(y);
  };

  // ── queries
  const { data: usersData, isLoading: usersLoading } = useQuery(
    'users', () => userApi.getAllUsers()
  );
  const users = usersData?.data || [];

  const { data: advancesData, isLoading: advancesLoading } = useQuery(
    'salary-advances', () => salaryAdvanceApi.getAllSalaryAdvances()
  );
  const advances = (advancesData?.data || []) as SalaryAdvance[];

  const { data: profilesData, isLoading: profilesLoading } = useQuery(
    'employee-salary-profiles', () => improvedSalaryApi.getEmployeeSalaryProfiles()
  );
  const profiles = profilesData?.data || [];

  const { data: monthlySummaryData, isLoading: summaryLoading } = useQuery(
    ['monthly-salary-summary', selectedMonth, selectedYear],
    () => improvedSalaryApi.getMonthlySalarySummary({ month: selectedMonth, year: selectedYear })
  );
  const monthlySummary = monthlySummaryData?.data;

  // ── mutations
  const createAdvanceMutation = useMutation(
    (data: CreateSalaryAdvanceData) => salaryAdvanceApi.createSalaryAdvance(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('salary-advances');
        setAdvanceDialogOpen(false);
        setAdvanceForm({ userId: '', amount: '', reason: '', notes: '' });
        showSnackbar('Advance request submitted successfully');
      },
      onError: () => showSnackbar('Failed to submit advance request', 'error'),
    }
  );

  const approveAdvanceMutation = useMutation(
    (id: string) => salaryAdvanceApi.approveSalaryAdvance(id),
    {
      onSuccess: () => { queryClient.invalidateQueries('salary-advances'); showSnackbar('Advance approved'); },
      onError:   () => showSnackbar('Failed to approve advance', 'error'),
    }
  );

  const payAdvanceMutation = useMutation(
    (id: string) => salaryAdvanceApi.paySalaryAdvance(id),
    {
      onSuccess: () => { queryClient.invalidateQueries('salary-advances'); showSnackbar('Advance marked as paid'); },
      onError:   () => showSnackbar('Failed to mark advance as paid', 'error'),
    }
  );

  const rejectAdvanceMutation = useMutation(
    (id: string) => salaryAdvanceApi.rejectSalaryAdvance(id),
    {
      onSuccess: () => { queryClient.invalidateQueries('salary-advances'); showSnackbar('Advance rejected'); },
      onError:   () => showSnackbar('Failed to reject advance', 'error'),
    }
  );

  const deleteAdvanceMutation = useMutation(
    (id: string) => salaryAdvanceApi.deleteSalaryAdvance(id),
    {
      onSuccess: () => { queryClient.invalidateQueries('salary-advances'); showSnackbar('Advance request deleted'); },
      onError:   () => showSnackbar('Failed to delete advance', 'error'),
    }
  );

  const setSalaryMutation = useMutation(
    (data: { userId: string; baseSalary: number; notes?: string }) =>
      improvedSalaryApi.setEmployeeSalary(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('employee-salary-profiles');
        setSetSalaryDialogOpen(false);
        setSalaryForm({ userId: '', baseSalary: '', notes: '' });
        setSelectedProfile(null);
        showSnackbar('Base salary updated successfully');
      },
      onError: () => showSnackbar('Failed to update salary', 'error'),
    }
  );

  const processPaymentMutation = useMutation(
    (data: {
      userId: string; month: number; year: number;
      amount: number; deductions?: number; bonuses?: number; notes?: string;
    }) => improvedSalaryApi.processMonthlyPayment(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['monthly-salary-summary', selectedMonth, selectedYear]);
        queryClient.invalidateQueries('employee-salary-profiles');
        setProcessPaymentDialogOpen(false);
        setPaymentForm({ amount: '', deductions: '', bonuses: '', notes: '' });
        setSelectedProfile(null);
        showSnackbar('Salary record created for this month');
      },
      onError: () => showSnackbar('Failed to process salary payment', 'error'),
    }
  );

  const markPaidMutation = useMutation(
    (id: string) => improvedSalaryApi.markPaymentAsPaid(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['monthly-salary-summary', selectedMonth, selectedYear]);
        showSnackbar('Salary marked as paid');
      },
      onError: () => showSnackbar('Failed to mark salary as paid', 'error'),
    }
  );

  // ── derived / computed values
  const allMonthPayments = useMemo(() => [
    ...(monthlySummary?.pendingPayments || []),
    ...(monthlySummary?.paidPayments    || []),
  ], [monthlySummary]);

  const profilesWithStatus = useMemo(() =>
    profiles.map(profile => ({
      profile,
      payment: allMonthPayments.find(p => p.userId === profile.userId) || null,
    })),
  [profiles, allMonthPayments]);

  const filteredAdvances = useMemo(() => {
    let list = advances;
    if (advanceFilter !== 'ALL') list = list.filter(a => a.status === advanceFilter);
    if (advanceSearch) {
      const q = advanceSearch.toLowerCase();
      list = list.filter(a =>
        `${a.user.firstName} ${a.user.lastName}`.toLowerCase().includes(q) ||
        (a.reason || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [advances, advanceFilter, advanceSearch]);

  const totalMonthlyBudget = useMemo(
    () => profiles.reduce((sum, p) => sum + Number(p.baseSalary), 0),
    [profiles]
  );

  const pendingAdvancesCount = useMemo(
    () => advances.filter(a => a.status === 'PENDING').length,
    [advances]
  );

  const pendingPaymentsCount = monthlySummary?.pendingPayments.length || 0;

  // ── net pay preview (live calculator inside process-payment dialog)
  const netPay = useMemo(() => {
    const base   = parseFloat(paymentForm.amount)     || Number(selectedProfile?.baseSalary || 0);
    const deduct = parseFloat(paymentForm.deductions) || 0;
    const bonus  = parseFloat(paymentForm.bonuses)    || 0;
    return base - deduct + bonus;
  }, [paymentForm, selectedProfile]);

  // ── handlers
  const handleSetSalaryOpen = (profile?: EmployeeSalaryProfile) => {
    if (profile) {
      setSelectedProfile(profile);
      setSalaryForm({ userId: profile.userId, baseSalary: String(profile.baseSalary), notes: profile.notes || '' });
    } else {
      setSelectedProfile(null);
      setSalaryForm({ userId: '', baseSalary: '', notes: '' });
    }
    setSetSalaryDialogOpen(true);
  };

  const handleProcessPaymentOpen = (profile?: EmployeeSalaryProfile) => {
    if (profile) {
      setSelectedProfile(profile);
      setPaymentForm({ amount: String(profile.baseSalary), deductions: '', bonuses: '', notes: '' });
    } else {
      setSelectedProfile(null);
      setPaymentForm({ amount: '', deductions: '', bonuses: '', notes: '' });
    }
    setProcessPaymentDialogOpen(true);
  };

  const handleSetSalarySubmit = () => {
    const uid = selectedProfile?.userId || salaryForm.userId;
    if (!uid || !salaryForm.baseSalary) return;
    setSalaryMutation.mutate({ userId: uid, baseSalary: parseFloat(salaryForm.baseSalary), notes: salaryForm.notes || undefined });
  };

  const handleProcessPaymentSubmit = () => {
    if (!selectedProfile) return;
    processPaymentMutation.mutate({
      userId:     selectedProfile.userId,
      month:      selectedMonth,
      year:       selectedYear,
      amount:     parseFloat(paymentForm.amount) || Number(selectedProfile.baseSalary),
      deductions: paymentForm.deductions ? parseFloat(paymentForm.deductions) : undefined,
      bonuses:    paymentForm.bonuses    ? parseFloat(paymentForm.bonuses)    : undefined,
      notes:      paymentForm.notes     || undefined,
    });
  };

  const handleAdvanceSubmit = () => {
    if (!advanceForm.userId || !advanceForm.amount) return;
    createAdvanceMutation.mutate({
      userId: advanceForm.userId,
      amount: parseFloat(advanceForm.amount),
      reason: advanceForm.reason || undefined,
      notes:  advanceForm.notes  || undefined,
    });
  };

  const handlePayAllPending = () => {
    const pending = monthlySummary?.pendingPayments || [];
    if (!pending.length) return;
    openConfirm({
      title:        'Pay All Pending Salaries',
      message:      `This will mark all ${pending.length} pending payment(s) for ${MONTHS[selectedMonth - 1]} ${selectedYear} as paid. Are you sure?`,
      confirmLabel: 'Pay All',
      confirmColor: 'success',
      onConfirm: async () => {
        closeConfirm();
        try {
          await Promise.all(pending.map(p => improvedSalaryApi.markPaymentAsPaid(p.id)));
          queryClient.invalidateQueries(['monthly-salary-summary', selectedMonth, selectedYear]);
          showSnackbar(`${pending.length} salary payment(s) marked as paid`);
        } catch {
          showSnackbar('Some payments failed. Please retry individually.', 'error');
        }
      },
    });
  };

  // ── loading guard
  if (usersLoading || advancesLoading || profilesLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  // ════════════════════════════════ RENDER ════════════════════════════════

  return (
    <Box sx={{ p: 3 }}>

      {/* ── Page Header ───────────────────────────────────────────────── */}
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 3 }} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Payroll Management</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage employee salaries, advances, and monthly payments
          </Typography>
        </Box>
        <Stack direction="row" gap={1} flexWrap="wrap">
          <Button variant="outlined"  startIcon={<AddIcon />}        onClick={() => { setAdvanceForm({ userId: '', amount: '', reason: '', notes: '' }); setAdvanceDialogOpen(true); }}>
            New Advance
          </Button>
          <Button variant="outlined"  startIcon={<TrendingUpIcon />} onClick={() => handleSetSalaryOpen()}>
            Set Base Salary
          </Button>
          <Button variant="contained" startIcon={<CalendarIcon />}   onClick={() => handleProcessPaymentOpen()}>
            Process Salary
          </Button>
        </Stack>
      </Stack>

      {/* ── Month Navigator ───────────────────────────────────────────── */}
      <Paper
        elevation={2}
        sx={{
          p: 2, mb: 3, display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 2,
          bgcolor: 'primary.main', color: 'white', borderRadius: 2,
        }}
      >
        <Tooltip title="Previous month">
          <IconButton onClick={() => navigateMonth(-1)} sx={{ color: 'white' }}>
            <PrevIcon />
          </IconButton>
        </Tooltip>
        <Typography variant="h5" fontWeight={700} sx={{ minWidth: 220, textAlign: 'center' }}>
          {MONTHS[selectedMonth - 1]} {selectedYear}
        </Typography>
        <Tooltip title="Next month">
          <IconButton onClick={() => navigateMonth(1)} sx={{ color: 'white' }}>
            <NextIcon />
          </IconButton>
        </Tooltip>
      </Paper>

      {/* ── Summary Cards ─────────────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: 4, borderColor: 'primary.main', height: '100%' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <GroupIcon sx={{ fontSize: 44, color: 'primary.main', opacity: 0.8 }} />
              <Box>
                <Typography variant="h4" fontWeight={700}>{profiles.length}</Typography>
                <Typography variant="body2" color="text.secondary">Total Employees</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: 4, borderColor: 'info.main', height: '100%' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <WalletIcon sx={{ fontSize: 44, color: 'info.main', opacity: 0.8 }} />
              <Box>
                <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                  {formatBDT(totalMonthlyBudget)}
                </Typography>
                <Typography variant="body2" color="text.secondary">Monthly Payroll Budget</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: 4, borderColor: 'success.main', height: '100%' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <CheckCircleIcon sx={{ fontSize: 44, color: 'success.main', opacity: 0.8 }} />
              <Box>
                <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                  {formatBDT(monthlySummary?.summary.totalPaid || 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">Paid This Month</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: 4, borderColor: 'warning.main', height: '100%' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <WarningIcon sx={{ fontSize: 44, color: 'warning.main', opacity: 0.8 }} />
              <Box>
                <Typography variant="h4" fontWeight={700}>{pendingAdvancesCount}</Typography>
                <Typography variant="body2" color="text.secondary">Advances Awaiting Approval</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Main Tabs ─────────────────────────────────────────────────── */}
      <Paper>
        <Tabs
          value={tabValue}
          onChange={(_, v) => setTabValue(v)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab
            icon={<CalendarIcon fontSize="small" />}
            iconPosition="start"
            label={
              pendingPaymentsCount > 0
                ? `Monthly Payroll  (${pendingPaymentsCount} pending)`
                : 'Monthly Payroll'
            }
          />
          <Tab
            icon={<WalletIcon fontSize="small" />}
            iconPosition="start"
            label={
              pendingAdvancesCount > 0
                ? `Salary Advances  (${pendingAdvancesCount} waiting)`
                : 'Salary Advances'
            }
          />
        </Tabs>

        {/* ══ Tab 0: Monthly Payroll ═══════════════════════════════════ */}
        {tabValue === 0 && (
          <Box sx={{ p: 3 }}>
            {summaryLoading ? (
              <Box display="flex" justifyContent="center" p={5}>
                <CircularProgress />
              </Box>
            ) : profiles.length === 0 ? (
              /* ── empty state */
              <Box textAlign="center" py={7}>
                <GroupIcon sx={{ fontSize: 72, color: 'text.disabled' }} />
                <Typography variant="h6" color="text.secondary" mt={2}>
                  No employees have a salary profile yet
                </Typography>
                <Typography variant="body2" color="text.disabled" mb={3}>
                  Set up a base salary for each employee to start processing monthly payments.
                </Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleSetSalaryOpen()}>
                  Set First Employee Salary
                </Button>
              </Box>
            ) : (
              <>
                {/* Pay-all action bar */}
                {pendingPaymentsCount > 0 && (
                  <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircleIcon />}
                      onClick={handlePayAllPending}
                    >
                      Pay All Pending ({pendingPaymentsCount})
                    </Button>
                  </Box>
                )}

                {/* Payroll table */}
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.50' }}>
                        <TableCell><strong>Employee</strong></TableCell>
                        <TableCell align="right"><strong>Base Salary</strong></TableCell>
                        <TableCell align="right"><strong>Deductions</strong></TableCell>
                        <TableCell align="right"><strong>Bonuses</strong></TableCell>
                        <TableCell align="right"><strong>Net Pay</strong></TableCell>
                        <TableCell align="center"><strong>Status</strong></TableCell>
                        <TableCell align="center"><strong>Actions</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {profilesWithStatus.map(({ profile, payment }) => {
                        const net = payment
                          ? Number(payment.amount) + Number(payment.bonuses || 0) - Number(payment.deductions || 0)
                          : null;

                        const rowBg = payment?.status === 'PAID'
                          ? alpha('#4caf50', 0.04)
                          : payment?.status === 'PENDING'
                          ? alpha('#ff9800', 0.04)
                          : 'transparent';

                        return (
                          <TableRow
                            key={profile.id}
                            sx={{ bgcolor: rowBg, '&:hover': { bgcolor: 'action.hover' } }}
                          >
                            <TableCell>
                              <Typography variant="subtitle2" fontWeight={600}>
                                {profile.user.firstName} {profile.user.lastName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {profile.user.role}
                              </Typography>
                            </TableCell>

                            <TableCell align="right">
                              <Typography variant="body2" fontWeight={500}>
                                {formatBDT(Number(profile.baseSalary))}
                              </Typography>
                            </TableCell>

                            <TableCell align="right">
                              {payment?.deductions && Number(payment.deductions) > 0 ? (
                                <Typography variant="body2" color="error.main" fontWeight={500}>
                                  -{formatBDT(Number(payment.deductions))}
                                </Typography>
                              ) : (
                                <Typography variant="body2" color="text.disabled">—</Typography>
                              )}
                            </TableCell>

                            <TableCell align="right">
                              {payment?.bonuses && Number(payment.bonuses) > 0 ? (
                                <Typography variant="body2" color="success.main" fontWeight={500}>
                                  +{formatBDT(Number(payment.bonuses))}
                                </Typography>
                              ) : (
                                <Typography variant="body2" color="text.disabled">—</Typography>
                              )}
                            </TableCell>

                            <TableCell align="right">
                              {net !== null ? (
                                <Typography
                                  variant="subtitle2"
                                  fontWeight={700}
                                  color={payment?.status === 'PAID' ? 'success.main' : 'primary.main'}
                                >
                                  {formatBDT(net)}
                                </Typography>
                              ) : (
                                <Typography variant="body2" color="text.disabled">Not processed</Typography>
                              )}
                            </TableCell>

                            <TableCell align="center">
                              {!payment ? (
                                <Chip label="Not Processed" size="small" variant="outlined" />
                              ) : (
                                <Chip
                                  label={PAYMENT_STATUS_LABELS[payment.status] || payment.status}
                                  size="small"
                                  color={PAYMENT_STATUS_COLORS[payment.status] || 'default'}
                                />
                              )}
                            </TableCell>

                            <TableCell align="center">
                              <Stack direction="row" justifyContent="center" gap={0.5}>
                                {!payment && (
                                  <Tooltip title="Create this month's salary record">
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      onClick={() => handleProcessPaymentOpen(profile)}
                                    >
                                      Process
                                    </Button>
                                  </Tooltip>
                                )}

                                {payment?.status === 'PENDING' && (
                                  <Tooltip title="Mark salary as paid">
                                    <Button
                                      size="small"
                                      variant="contained"
                                      color="success"
                                      onClick={() =>
                                        openConfirm({
                                          title:        'Mark Salary as Paid',
                                          message:      `Mark ${profile.user.firstName}'s salary for ${MONTHS[selectedMonth - 1]} ${selectedYear} as paid?`,
                                          confirmLabel: 'Mark Paid',
                                          confirmColor: 'success',
                                          onConfirm:    () => { closeConfirm(); markPaidMutation.mutate(payment.id); },
                                        })
                                      }
                                    >
                                      Mark Paid
                                    </Button>
                                  </Tooltip>
                                )}

                                {payment?.status === 'PAID' && (
                                  <Tooltip title="View payslip">
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      onClick={() => { setSelectedPayslip(payment); setPayslipDialogOpen(true); }}
                                    >
                                      <ReceiptIcon />
                                    </IconButton>
                                  </Tooltip>
                                )}

                                <Tooltip title="Edit base salary">
                                  <IconButton size="small" onClick={() => handleSetSalaryOpen(profile)}>
                                    <EditIcon />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Month totals footer */}
                {monthlySummary && (
                  <Box
                    sx={{
                      mt: 2, p: 2, bgcolor: 'grey.50',
                      borderRadius: 1, display: 'flex',
                      justifyContent: 'flex-end', gap: 4, flexWrap: 'wrap',
                    }}
                  >
                    <Box textAlign="center">
                      <Typography variant="caption" color="text.secondary">Pending</Typography>
                      <Typography variant="subtitle1" fontWeight={700} color="warning.main">
                        {formatBDT(monthlySummary.summary.totalPending)}
                      </Typography>
                    </Box>
                    <Box textAlign="center">
                      <Typography variant="caption" color="text.secondary">Paid</Typography>
                      <Typography variant="subtitle1" fontWeight={700} color="success.main">
                        {formatBDT(monthlySummary.summary.totalPaid)}
                      </Typography>
                    </Box>
                    <Box textAlign="center">
                      <Typography variant="caption" color="text.secondary">Total This Month</Typography>
                      <Typography variant="subtitle1" fontWeight={700} color="primary.main">
                        {formatBDT(monthlySummary.summary.totalAmount)}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </>
            )}
          </Box>
        )}

        {/* ══ Tab 1: Salary Advances ═══════════════════════════════════ */}
        {tabValue === 1 && (
          <Box sx={{ p: 3 }}>
            {/* Filter chips + New button row */}
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              flexWrap="wrap"
              gap={1}
              sx={{ mb: 2 }}
            >
              <Stack direction="row" gap={1} flexWrap="wrap">
                {(['ALL', 'PENDING', 'APPROVED', 'PAID', 'REJECTED'] as AdvanceStatusFilter[]).map(status => {
                  const count = status === 'ALL'
                    ? advances.length
                    : advances.filter(a => a.status === status).length;
                  return (
                    <Chip
                      key={status}
                      label={`${status === 'ALL' ? 'All' : ADVANCE_STATUS_LABELS[status]} (${count})`}
                      onClick={() => setAdvanceFilter(status)}
                      color={
                        advanceFilter === status
                          ? (ADVANCE_STATUS_COLORS[status] as 'warning' | 'info' | 'success' | 'error' | 'default' || 'primary')
                          : 'default'
                      }
                      variant={advanceFilter === status ? 'filled' : 'outlined'}
                      size="small"
                      sx={{ cursor: 'pointer' }}
                    />
                  );
                })}
              </Stack>

              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => { setAdvanceForm({ userId: '', amount: '', reason: '', notes: '' }); setAdvanceDialogOpen(true); }}
              >
                New Advance Request
              </Button>
            </Stack>

            {/* Search */}
            <TextField
              fullWidth
              size="small"
              placeholder="Search by employee name or reason…"
              value={advanceSearch}
              onChange={e => setAdvanceSearch(e.target.value)}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />

            {filteredAdvances.length === 0 ? (
              <Box textAlign="center" py={7}>
                <WalletIcon sx={{ fontSize: 72, color: 'text.disabled' }} />
                <Typography variant="h6" color="text.secondary" mt={2}>
                  No advance requests found
                </Typography>
                <Typography variant="body2" color="text.disabled">
                  {advanceSearch || advanceFilter !== 'ALL'
                    ? 'Try adjusting your filter or search term.'
                    : 'No salary advance requests have been made yet.'}
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell><strong>Employee</strong></TableCell>
                      <TableCell align="right"><strong>Amount</strong></TableCell>
                      <TableCell><strong>Reason</strong></TableCell>
                      <TableCell><strong>Requested On</strong></TableCell>
                      <TableCell align="center"><strong>Status</strong></TableCell>
                      <TableCell align="center"><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredAdvances.map(advance => {
                      const rowBg =
                        advance.status === 'PAID'     ? alpha('#4caf50', 0.04) :
                        advance.status === 'PENDING'  ? alpha('#ff9800', 0.04) :
                        advance.status === 'REJECTED' ? alpha('#f44336', 0.04) : 'transparent';

                      return (
                        <TableRow
                          key={advance.id}
                          sx={{ bgcolor: rowBg, '&:hover': { bgcolor: 'action.hover' } }}
                        >
                          <TableCell>
                            <Typography variant="subtitle2" fontWeight={600}>
                              {advance.user.firstName} {advance.user.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {advance.user.role}
                            </Typography>
                          </TableCell>

                          <TableCell align="right">
                            <Typography variant="subtitle2" fontWeight={700} color="primary.main">
                              {formatBDT(Number(advance.amount))}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2">
                              {advance.reason || <span style={{ color: '#9e9e9e' }}>—</span>}
                            </Typography>
                            {advance.notes && (
                              <Typography variant="caption" color="text.secondary">
                                Note: {advance.notes}
                              </Typography>
                            )}
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2">
                              {new Date(advance.requestDate).toLocaleDateString('en-BD', {
                                day: 'numeric', month: 'short', year: 'numeric',
                              })}
                            </Typography>
                            {advance.paidAt && (
                              <Typography variant="caption" color="success.main">
                                Paid: {new Date(advance.paidAt).toLocaleDateString('en-BD', {
                                  day: 'numeric', month: 'short', year: 'numeric',
                                })}
                              </Typography>
                            )}
                          </TableCell>

                          <TableCell align="center">
                            <Chip
                              label={ADVANCE_STATUS_LABELS[advance.status] || advance.status}
                              size="small"
                              color={ADVANCE_STATUS_COLORS[advance.status] || 'default'}
                            />
                          </TableCell>

                          <TableCell align="center">
                            <Stack direction="row" justifyContent="center" gap={0.5}>
                              {advance.status === 'PENDING' && (
                                <>
                                  <Tooltip title="Approve this advance">
                                    <IconButton
                                      size="small"
                                      color="success"
                                      onClick={() =>
                                        openConfirm({
                                          title:        'Approve Advance',
                                          message:      `Approve ${formatBDT(Number(advance.amount))} advance for ${advance.user.firstName} ${advance.user.lastName}?`,
                                          confirmLabel: 'Approve',
                                          confirmColor: 'success',
                                          onConfirm:    () => { closeConfirm(); approveAdvanceMutation.mutate(advance.id); },
                                        })
                                      }
                                    >
                                      <CheckCircleIcon />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Reject this advance">
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() =>
                                        openConfirm({
                                          title:        'Reject Advance',
                                          message:      `Reject ${advance.user.firstName}'s advance request for ${formatBDT(Number(advance.amount))}?`,
                                          confirmLabel: 'Reject',
                                          confirmColor: 'error',
                                          onConfirm:    () => { closeConfirm(); rejectAdvanceMutation.mutate(advance.id); },
                                        })
                                      }
                                    >
                                      <CancelIcon />
                                    </IconButton>
                                  </Tooltip>
                                </>
                              )}

                              {advance.status === 'APPROVED' && (
                                <Tooltip title="Disburse advance to employee">
                                  <Button
                                    size="small"
                                    variant="contained"
                                    color="primary"
                                    onClick={() =>
                                      openConfirm({
                                        title:        'Pay Advance',
                                        message:      `Disburse ${formatBDT(Number(advance.amount))} to ${advance.user.firstName} ${advance.user.lastName}?`,
                                        confirmLabel: 'Pay Now',
                                        confirmColor: 'primary',
                                        onConfirm:    () => { closeConfirm(); payAdvanceMutation.mutate(advance.id); },
                                      })
                                    }
                                  >
                                    Pay Now
                                  </Button>
                                </Tooltip>
                              )}

                              {(advance.status === 'PENDING' || advance.status === 'REJECTED' || advance.status === 'CANCELLED') && (
                                <Tooltip title="Delete this request">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() =>
                                      openConfirm({
                                        title:        'Delete Advance Request',
                                        message:      'Are you sure you want to delete this advance request? This cannot be undone.',
                                        confirmLabel: 'Delete',
                                        confirmColor: 'error',
                                        onConfirm:    () => { closeConfirm(); deleteAdvanceMutation.mutate(advance.id); },
                                      })
                                    }
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}
      </Paper>

      {/* ══════════════════════════ DIALOGS ══════════════════════════════ */}

      {/* ── New Advance Request ──────────────────────────────────────── */}
      <Dialog open={advanceDialogOpen} onClose={() => setAdvanceDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" gap={1}>
            <WalletIcon color="primary" />
            New Salary Advance Request
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Stack gap={2} sx={{ pt: 1 }}>
            <FormControl fullWidth required>
              <InputLabel>Employee</InputLabel>
              <Select
                value={advanceForm.userId}
                label="Employee"
                onChange={e => setAdvanceForm({ ...advanceForm, userId: e.target.value })}
              >
                {Array.isArray(users) && users.map(user => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} — {user.role}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              required
              label="Advance Amount"
              type="number"
              value={advanceForm.amount}
              onChange={e => setAdvanceForm({ ...advanceForm, amount: e.target.value })}
              InputProps={{ startAdornment: <InputAdornment position="start">৳</InputAdornment> }}
              inputProps={{ min: 0 }}
            />

            <TextField
              fullWidth
              label="Reason for Advance"
              placeholder="e.g. Medical emergency, personal expense…"
              value={advanceForm.reason}
              onChange={e => setAdvanceForm({ ...advanceForm, reason: e.target.value })}
            />

            <TextField
              fullWidth
              label="Additional Notes (Optional)"
              multiline
              rows={2}
              value={advanceForm.notes}
              onChange={e => setAdvanceForm({ ...advanceForm, notes: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setAdvanceDialogOpen(false)} variant="outlined">Cancel</Button>
          <Button
            onClick={handleAdvanceSubmit}
            variant="contained"
            disabled={!advanceForm.userId || !advanceForm.amount || createAdvanceMutation.isLoading}
            startIcon={createAdvanceMutation.isLoading ? <CircularProgress size={16} /> : <AddIcon />}
          >
            Submit Request
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Set Base Salary ──────────────────────────────────────────── */}
      <Dialog open={setSalaryDialogOpen} onClose={() => setSetSalaryDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" gap={1}>
            <TrendingUpIcon color="primary" />
            {selectedProfile ? 'Update Base Salary' : 'Set Employee Base Salary'}
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Stack gap={2} sx={{ pt: 1 }}>
            {selectedProfile ? (
              <Alert severity="info">
                Updating salary for <strong>{selectedProfile.user.firstName} {selectedProfile.user.lastName}</strong>.
                {' '}Current base: <strong>{formatBDT(Number(selectedProfile.baseSalary))}</strong>
              </Alert>
            ) : (
              <FormControl fullWidth required>
                <InputLabel>Select Employee</InputLabel>
                <Select
                  value={salaryForm.userId}
                  label="Select Employee"
                  onChange={e => setSalaryForm({ ...salaryForm, userId: e.target.value })}
                >
                  {Array.isArray(users) && users.map(user => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} — {user.role}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <TextField
              fullWidth
              required
              label="Monthly Base Salary"
              type="number"
              value={salaryForm.baseSalary}
              onChange={e => setSalaryForm({ ...salaryForm, baseSalary: e.target.value })}
              InputProps={{ startAdornment: <InputAdornment position="start">৳</InputAdornment> }}
              helperText="This is the standard monthly salary before any deductions or bonuses."
              inputProps={{ min: 0 }}
            />

            <TextField
              fullWidth
              label="Notes (Optional)"
              multiline
              rows={2}
              value={salaryForm.notes}
              onChange={e => setSalaryForm({ ...salaryForm, notes: e.target.value })}
              placeholder="e.g. Updated after annual review"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setSetSalaryDialogOpen(false)} variant="outlined">Cancel</Button>
          <Button
            onClick={handleSetSalarySubmit}
            variant="contained"
            disabled={(!selectedProfile && !salaryForm.userId) || !salaryForm.baseSalary || setSalaryMutation.isLoading}
            startIcon={setSalaryMutation.isLoading ? <CircularProgress size={16} /> : <TrendingUpIcon />}
          >
            Save Salary
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Process Monthly Salary Payment ───────────────────────────── */}
      <Dialog open={processPaymentDialogOpen} onClose={() => setProcessPaymentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" gap={1}>
            <CalendarIcon color="primary" />
            Process Salary — {MONTHS[selectedMonth - 1]} {selectedYear}
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Stack gap={2} sx={{ pt: 1 }}>
            {selectedProfile ? (
              <Alert severity="info" icon={false}>
                <Typography variant="subtitle2" fontWeight={600}>
                  {selectedProfile.user.firstName} {selectedProfile.user.lastName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Base Salary: <strong>{formatBDT(Number(selectedProfile.baseSalary))}</strong>
                </Typography>
              </Alert>
            ) : (
              <FormControl fullWidth required>
                <InputLabel>Select Employee</InputLabel>
                <Select
                  value={selectedProfile ? (selectedProfile as EmployeeSalaryProfile).id : ''}
                  label="Select Employee"
                  onChange={e => {
                    const p = profiles.find(pr => pr.id === e.target.value) || null;
                    setSelectedProfile(p);
                    if (p) setPaymentForm(f => ({ ...f, amount: String(p.baseSalary) }));
                  }}
                >
                  {profiles.map(p => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.user.firstName} {p.user.lastName} — {formatBDT(Number(p.baseSalary))}/month
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <TextField
              fullWidth
              label="Payment Amount"
              type="number"
              value={paymentForm.amount}
              onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              InputProps={{ startAdornment: <InputAdornment position="start">৳</InputAdornment> }}
              helperText={selectedProfile ? `Default: ${formatBDT(Number(selectedProfile.baseSalary))} (base salary)` : ''}
              inputProps={{ min: 0 }}
            />

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Deductions"
                  type="number"
                  value={paymentForm.deductions}
                  onChange={e => setPaymentForm({ ...paymentForm, deductions: e.target.value })}
                  InputProps={{ startAdornment: <InputAdornment position="start">-৳</InputAdornment> }}
                  inputProps={{ min: 0 }}
                  placeholder="0"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Bonuses"
                  type="number"
                  value={paymentForm.bonuses}
                  onChange={e => setPaymentForm({ ...paymentForm, bonuses: e.target.value })}
                  InputProps={{ startAdornment: <InputAdornment position="start">+৳</InputAdornment> }}
                  inputProps={{ min: 0 }}
                  placeholder="0"
                />
              </Grid>
            </Grid>

            <TextField
              fullWidth
              label="Notes (Optional)"
              multiline
              rows={2}
              value={paymentForm.notes}
              onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })}
            />

            {/* ── Live Net Pay Calculator */}
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                Net Pay Calculation
              </Typography>
              <Stack gap={0.5}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">Base Amount</Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {formatBDT(parseFloat(paymentForm.amount) || Number(selectedProfile?.baseSalary || 0))}
                  </Typography>
                </Stack>

                {parseFloat(paymentForm.deductions) > 0 && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="error.main">Deductions</Typography>
                    <Typography variant="body2" color="error.main">
                      − {formatBDT(parseFloat(paymentForm.deductions))}
                    </Typography>
                  </Stack>
                )}

                {parseFloat(paymentForm.bonuses) > 0 && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="success.main">Bonuses</Typography>
                    <Typography variant="body2" color="success.main">
                      + {formatBDT(parseFloat(paymentForm.bonuses))}
                    </Typography>
                  </Stack>
                )}

                <Divider sx={{ my: 0.5 }} />

                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle1" fontWeight={700}>Net Pay</Typography>
                  <Typography variant="subtitle1" fontWeight={700} color="primary.main">
                    {formatBDT(netPay)}
                  </Typography>
                </Stack>
              </Stack>
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setProcessPaymentDialogOpen(false)} variant="outlined">Cancel</Button>
          <Button
            onClick={handleProcessPaymentSubmit}
            variant="contained"
            disabled={!selectedProfile || processPaymentMutation.isLoading}
            startIcon={processPaymentMutation.isLoading ? <CircularProgress size={16} /> : <CalendarIcon />}
          >
            Create Salary Record
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Payslip Preview ──────────────────────────────────────────── */}
      {selectedPayslip && (
        <Dialog open={payslipDialogOpen} onClose={() => setPayslipDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>
            <Stack direction="row" alignItems="center" gap={1}>
              <ReceiptIcon color="primary" />
              Payslip
            </Stack>
          </DialogTitle>
          <DialogContent dividers>
            {/* Header */}
            <Box textAlign="center" mb={2}>
              <Typography variant="h6" fontWeight={700}>
                {selectedPayslip.user.firstName} {selectedPayslip.user.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary">{selectedPayslip.user.role}</Typography>
              <Chip
                label={`${MONTHS[selectedPayslip.month - 1]} ${selectedPayslip.year}`}
                color="primary"
                variant="outlined"
                size="small"
                sx={{ mt: 1 }}
              />
            </Box>

            <Divider sx={{ mb: 2 }} />

            {/* Breakdown */}
            <Stack gap={1.5}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body1">Basic Salary</Typography>
                <Typography variant="body1" fontWeight={500}>{formatBDT(Number(selectedPayslip.amount))}</Typography>
              </Stack>

              {Number(selectedPayslip.bonuses || 0) > 0 && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body1" color="success.main">Bonuses</Typography>
                  <Typography variant="body1" color="success.main" fontWeight={500}>
                    + {formatBDT(Number(selectedPayslip.bonuses))}
                  </Typography>
                </Stack>
              )}

              {Number(selectedPayslip.deductions || 0) > 0 && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body1" color="error.main">Deductions</Typography>
                  <Typography variant="body1" color="error.main" fontWeight={500}>
                    − {formatBDT(Number(selectedPayslip.deductions))}
                  </Typography>
                </Stack>
              )}

              {Number(selectedPayslip.advances || 0) > 0 && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body1" color="warning.main">Advance Recovery</Typography>
                  <Typography variant="body1" color="warning.main" fontWeight={500}>
                    − {formatBDT(Number(selectedPayslip.advances))}
                  </Typography>
                </Stack>
              )}

              <Divider />

              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ bgcolor: alpha('#4caf50', 0.08), p: 1.5, borderRadius: 1 }}
              >
                <Typography variant="h6" fontWeight={700}>Net Pay</Typography>
                <Typography variant="h6" fontWeight={700} color="success.main">
                  {formatBDT(
                    Number(selectedPayslip.amount) +
                    Number(selectedPayslip.bonuses    || 0) -
                    Number(selectedPayslip.deductions || 0) -
                    Number(selectedPayslip.advances   || 0)
                  )}
                </Typography>
              </Stack>
            </Stack>

            <Divider sx={{ my: 2 }} />

            {/* Meta info */}
            <Stack gap={0.5}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary">Status</Typography>
                <Chip
                  label={PAYMENT_STATUS_LABELS[selectedPayslip.status] || selectedPayslip.status}
                  size="small"
                  color={PAYMENT_STATUS_COLORS[selectedPayslip.status] || 'default'}
                />
              </Stack>

              {selectedPayslip.paidAt && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Payment Date</Typography>
                  <Typography variant="body2">
                    {new Date(selectedPayslip.paidAt).toLocaleDateString('en-BD', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </Typography>
                </Stack>
              )}

              {selectedPayslip.paidByUser && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Processed By</Typography>
                  <Typography variant="body2">
                    {selectedPayslip.paidByUser.firstName} {selectedPayslip.paidByUser.lastName}
                  </Typography>
                </Stack>
              )}

              {selectedPayslip.notes && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Notes</Typography>
                  <Typography variant="body2" sx={{ maxWidth: '60%', textAlign: 'right' }}>
                    {selectedPayslip.notes}
                  </Typography>
                </Stack>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setPayslipDialogOpen(false)} variant="outlined">Close</Button>
          </DialogActions>
        </Dialog>
      )}

      {/* ── Confirm Dialog ───────────────────────────────────────────── */}
      <Dialog open={confirmDialog.open} onClose={closeConfirm} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" gap={1}>
            <WarningIcon color={confirmDialog.confirmColor === 'error' ? 'error' : 'warning'} />
            {confirmDialog.title}
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">{confirmDialog.message}</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={closeConfirm} variant="outlined">Cancel</Button>
          <Button onClick={confirmDialog.onConfirm} variant="contained" color={confirmDialog.confirmColor}>
            {confirmDialog.confirmLabel}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Snackbar notifications ───────────────────────────────────── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          elevation={6}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CombinedSalaryPage;
