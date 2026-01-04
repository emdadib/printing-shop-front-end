import React, { useState } from 'react';
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
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  AccountBalanceWallet as WalletIcon,
  TrendingUp as TrendingUpIcon,
  CalendarMonth as CalendarIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { salaryAdvanceApi, SalaryAdvance, CreateSalaryAdvanceData } from '@/services/salaryAdvanceApi';
import { improvedSalaryApi, EmployeeSalaryProfile } from '@/services/improvedSalaryApi';
import { userApi, User } from '@/services/userApi';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`salary-tabpanel-${index}`}
      aria-labelledby={`salary-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const CombinedSalaryPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [advanceDialogOpen, setAdvanceDialogOpen] = useState(false);
  const [_editingAdvance, _setEditingAdvance] = useState<SalaryAdvance | null>(null);
  const [advanceForm, setAdvanceForm] = useState({
    userId: '',
    amount: '',
    reason: '',
    notes: ''
  });

  // Improved Salary states
  const [improvedSalaryDialog, setImprovedSalaryDialog] = useState(false);
  const [processPaymentDialog, setProcessPaymentDialog] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<EmployeeSalaryProfile | null>(null);
  const [improvedSalaryForm, setImprovedSalaryForm] = useState({
    userId: '',
    baseSalary: '',
    notes: ''
  });
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    deductions: '',
    bonuses: '',
    notes: ''
  });

  const queryClient = useQueryClient();

  // Fetch users
  const { data: usersResponse, isLoading: usersLoading } = useQuery('users', () => userApi.getAllUsers());
  const users = usersResponse?.data || [];

  // Fetch salary advances
  const { data: advancesResponse, isLoading: advancesLoading } = useQuery(
    'salary-advances',
    () => salaryAdvanceApi.getAllSalaryAdvances()
  );
  
  const advances = advancesResponse?.data || [];

  // Fetch improved salary profiles
  const { data: profilesResponse } = useQuery(
    'employee-salary-profiles',
    () => improvedSalaryApi.getEmployeeSalaryProfiles(),
    {
      onError: (error: any) => {
        console.error('Failed to load salary profiles:', error);
      }
    }
  );
  
  const profiles = profilesResponse?.data || [];

  // Fetch monthly summary for improved salary
  const { data: monthlySummaryResponse } = useQuery(
    ['monthly-salary-summary', selectedMonth, selectedYear],
    () => improvedSalaryApi.getMonthlySalarySummary({ month: selectedMonth, year: selectedYear }),
    {
      onError: (error: any) => {
        console.error('Failed to load monthly summary:', error);
      }
    }
  );
  
  const monthlySummary = monthlySummaryResponse?.data;

  // Mutations
  const createAdvanceMutation = useMutation(salaryAdvanceApi.createSalaryAdvance, {
    onSuccess: () => {
      queryClient.invalidateQueries('salary-advances');
      setAdvanceDialogOpen(false);
      resetAdvanceForm();
    }
  });

  const approveAdvanceMutation = useMutation(salaryAdvanceApi.approveSalaryAdvance, {
    onSuccess: () => {
      queryClient.invalidateQueries('salary-advances');
    }
  });

  const payAdvanceMutation = useMutation(salaryAdvanceApi.paySalaryAdvance, {
    onSuccess: () => {
      queryClient.invalidateQueries('salary-advances');
    }
  });

  const rejectAdvanceMutation = useMutation(salaryAdvanceApi.rejectSalaryAdvance, {
    onSuccess: () => {
      queryClient.invalidateQueries('salary-advances');
    }
  });

  const deleteAdvanceMutation = useMutation(salaryAdvanceApi.deleteSalaryAdvance, {
    onSuccess: () => {
      queryClient.invalidateQueries('salary-advances');
    }
  });

  // Improved Salary mutations
  const setSalaryMutation = useMutation(
    (data: { userId: string; baseSalary: number; notes?: string }) =>
      improvedSalaryApi.setEmployeeSalary(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('employee-salary-profiles');
        setImprovedSalaryDialog(false);
        resetImprovedSalaryForm();
      }
    }
  );

  const processPaymentMutation = useMutation(
    (data: any) => improvedSalaryApi.processMonthlyPayment(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('monthly-salary-summary');
        queryClient.invalidateQueries('employee-salary-profiles');
        setProcessPaymentDialog(false);
        resetPaymentForm();
      }
    }
  );

  const markPaidMutation = useMutation(
    (id: string) => improvedSalaryApi.markPaymentAsPaid(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('monthly-salary-summary');
      }
    }
  );

  const resetAdvanceForm = () => {
    setAdvanceForm({
      userId: '',
      amount: '',
      reason: '',
      notes: ''
    });
    _setEditingAdvance(null);
  };

  const resetImprovedSalaryForm = () => {
    setImprovedSalaryForm({
      userId: '',
      baseSalary: '',
      notes: ''
    });
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      amount: '',
      deductions: '',
      bonuses: '',
      notes: ''
    });
    setSelectedProfile(null);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Improved Salary handlers
  const handleSetSalary = () => {
    if (!improvedSalaryForm.userId || !improvedSalaryForm.baseSalary) {
      return;
    }

    setSalaryMutation.mutate({
      userId: improvedSalaryForm.userId,
      baseSalary: parseFloat(improvedSalaryForm.baseSalary),
      notes: improvedSalaryForm.notes
    });
  };

  const handleProcessPayment = () => {
    if (!selectedProfile) {
      return;
    }

    const amount = paymentForm.amount || selectedProfile.baseSalary.toString();

    processPaymentMutation.mutate({
      userId: selectedProfile.userId,
      month: selectedMonth,
      year: selectedYear,
      amount: parseFloat(amount),
      deductions: paymentForm.deductions ? parseFloat(paymentForm.deductions) : undefined,
      bonuses: paymentForm.bonuses ? parseFloat(paymentForm.bonuses) : undefined,
      notes: paymentForm.notes
    });
  };

  const handleMarkAsPaid = (paymentId: string) => {
    markPaidMutation.mutate(paymentId);
  };

  // Utility functions for improved salary
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getMonthName = (month: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1];
  };

  const getImprovedStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'CANCELLED':
        return 'error';
      default:
        return 'default';
    }
  };

  const handleAdvanceSubmit = () => {
    const advanceData: CreateSalaryAdvanceData = {
      userId: advanceForm.userId,
      amount: parseFloat(advanceForm.amount),
      reason: advanceForm.reason,
      notes: advanceForm.notes
    };

    createAdvanceMutation.mutate(advanceData);
  };

  const handleApproveAdvance = (advanceId: string) => {
    approveAdvanceMutation.mutate(advanceId);
  };

  const handlePayAdvance = (advanceId: string) => {
    payAdvanceMutation.mutate(advanceId);
  };

  const handleRejectAdvance = (advanceId: string) => {
    rejectAdvanceMutation.mutate(advanceId);
  };

  const handleDeleteAdvance = (advanceId: string) => {
    if (window.confirm('Are you sure you want to delete this advance request?')) {
      deleteAdvanceMutation.mutate(advanceId);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'warning';
      case 'APPROVED': return 'info';
      case 'PAID': return 'success';
      case 'REJECTED': return 'error';
      case 'CANCELLED': return 'default';
      default: return 'default';
    }
  };

  const getUserName = (userId: string) => {
    const user = Array.isArray(users) ? users.find(u => u.id === userId) : null;
    return user ? `${user.firstName} ${user.lastName}` : 'Unknown User';
  };

  const getPendingAdvances = () => {
    return Array.isArray(advances) ? advances.filter(advance => advance.status === 'PENDING') : [];
  };

  const getApprovedAdvances = () => {
    return Array.isArray(advances) ? advances.filter(advance => advance.status === 'APPROVED') : [];
  };

  // const getPaidAdvances = () => {
  //   return Array.isArray(advances) ? advances.filter(advance => advance.status === 'PAID') : [];
  // };

  if (usersLoading || advancesLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        💰 Salary & Advance Management
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Pending Advances
              </Typography>
              <Typography variant="h5" color="warning.main">
                {getPendingAdvances().length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Approved Advances
              </Typography>
              <Typography variant="h5" color="info.main">
                {getApprovedAdvances().length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Advances
              </Typography>
              <Typography variant="h5" color="primary.main">
                {Array.isArray(advances) ? advances.length : 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Month/Year Selector */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Month</InputLabel>
          <Select
            value={selectedMonth}
            label="Month"
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <MenuItem key={i + 1} value={i + 1}>
                {new Date(0, i).toLocaleString('default', { month: 'long' })}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Year</InputLabel>
          <Select
            value={selectedYear}
            label="Year"
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {Array.from({ length: 5 }, (_, i) => {
              const year = new Date().getFullYear() - 2 + i;
              return (
                <MenuItem key={year} value={year}>
                  {year}
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>
        <Button
          variant="outlined"
          startIcon={<WalletIcon />}
          onClick={() => {
            resetAdvanceForm();
            setAdvanceDialogOpen(true);
          }}
        >
          Request Advance
        </Button>
      </Box>

      {/* Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="salary management tabs">
          <Tab label="Salary Advances" icon={<WalletIcon />} />
          <Tab label="Improved Salary" icon={<TrendingUpIcon />} />
        </Tabs>

        {/* Salary Advances Tab */}
        <TabPanel value={tabValue} index={0}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Request Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Array.isArray(advances) && advances.map((advance) => (
                  <TableRow key={advance.id}>
                    <TableCell>{getUserName(advance.userId)}</TableCell>
                    <TableCell>${advance.amount}</TableCell>
                    <TableCell>{advance.reason || 'N/A'}</TableCell>
                    <TableCell>
                      {new Date(advance.requestDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={advance.status}
                        color={getStatusColor(advance.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {advance.status === 'PENDING' && (
                        <>
                          <Tooltip title="Approve">
                            <IconButton
                              size="small"
                              onClick={() => handleApproveAdvance(advance.id)}
                              color="success"
                            >
                              <CheckIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Reject">
                            <IconButton
                              size="small"
                              onClick={() => handleRejectAdvance(advance.id)}
                              color="error"
                            >
                              <CancelIcon />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      {advance.status === 'APPROVED' && (
                        <Tooltip title="Mark as Paid">
                          <IconButton
                            size="small"
                            onClick={() => handlePayAdvance(advance.id)}
                            color="success"
                          >
                            <CheckIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteAdvance(advance.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Improved Salary Tab */}
        <TabPanel value={tabValue} index={1}>
          {/* Action Buttons */}
          <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                resetImprovedSalaryForm();
                setImprovedSalaryDialog(true);
              }}
            >
              Set Employee Salary
            </Button>
            <Button
              variant="outlined"
              startIcon={<CalendarIcon />}
              onClick={() => {
                resetPaymentForm();
                setProcessPaymentDialog(true);
              }}
            >
              Process Monthly Payments
            </Button>
          </Box>

          {/* Summary Cards */}
          {monthlySummary && (
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h4" color="primary">
                      {monthlySummary.summary.totalEmployees}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Employees
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h4" color="warning.main">
                      {formatCurrency(monthlySummary.summary.totalPending)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pending Payments
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h4" color="success.main">
                      {formatCurrency(monthlySummary.summary.totalPaid)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Paid This Month
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h4" color="info.main">
                      {formatCurrency(monthlySummary.summary.totalAmount)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Amount
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Employee Salary Profiles */}
          <Paper sx={{ mb: 3 }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6">Employee Salary Profiles</Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Employee</TableCell>
                    <TableCell>Base Salary</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Last Payment</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {profiles.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2">
                            {profile.user.firstName} {profile.user.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {profile.user.email} • {profile.user.role}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="subtitle2" color="primary">
                          {formatCurrency(profile.baseSalary)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={profile.isActive ? 'Active' : 'Inactive'}
                          color={profile.isActive ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {profile.salaryPayments.length > 0 ? (
                          <Typography variant="body2">
                            {getMonthName(profile.salaryPayments[0].month)} {profile.salaryPayments[0].year}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No payments yet
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Edit Salary">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedProfile(profile);
                              setImprovedSalaryForm({
                                userId: profile.userId,
                                baseSalary: profile.baseSalary.toString(),
                                notes: profile.notes || ''
                              });
                              setImprovedSalaryDialog(true);
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Monthly Payments */}
          {monthlySummary && (
            <Paper>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6">
                  {getMonthName(selectedMonth)} {selectedYear} Payments
                </Typography>
              </Box>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Employee</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Deductions</TableCell>
                      <TableCell>Bonuses</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Paid Date</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[...monthlySummary.pendingPayments, ...monthlySummary.paidPayments].map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <Typography variant="subtitle2">
                            {payment.user.firstName} {payment.user.lastName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="subtitle2" color="primary">
                            {formatCurrency(payment.amount)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {payment.deductions ? (
                            <Typography variant="body2" color="error">
                              -{formatCurrency(payment.deductions)}
                            </Typography>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              No deductions
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {payment.bonuses ? (
                            <Typography variant="body2" color="success.main">
                              +{formatCurrency(payment.bonuses)}
                            </Typography>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              No bonuses
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={payment.status}
                            color={getImprovedStatusColor(payment.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {payment.paidAt ? (
                            <Typography variant="body2">
                              {new Date(payment.paidAt).toLocaleDateString()}
                            </Typography>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              Not paid
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {payment.status === 'PENDING' && (
                            <Tooltip title="Mark as Paid">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => handleMarkAsPaid(payment.id)}
                              >
                                <CheckIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </TabPanel>
      </Paper>

      {/* Advance Dialog */}
      <Dialog open={advanceDialogOpen} onClose={() => setAdvanceDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Request Salary Advance</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Employee</InputLabel>
                <Select
                  value={advanceForm.userId}
                  label="Employee"
                  onChange={(e) => setAdvanceForm({ ...advanceForm, userId: e.target.value })}
                >
                  {Array.isArray(users) && users.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Amount"
                type="number"
                value={advanceForm.amount}
                onChange={(e) => setAdvanceForm({ ...advanceForm, amount: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Reason"
                value={advanceForm.reason}
                onChange={(e) => setAdvanceForm({ ...advanceForm, reason: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={advanceForm.notes}
                onChange={(e) => setAdvanceForm({ ...advanceForm, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdvanceDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleAdvanceSubmit}
            variant="contained"
            disabled={createAdvanceMutation.isLoading}
          >
            Request Advance
          </Button>
        </DialogActions>
      </Dialog>

      {/* Improved Salary Dialog */}
      <Dialog open={improvedSalaryDialog} onClose={() => setImprovedSalaryDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Set Employee Salary</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Select Employee</InputLabel>
              <Select
                value={improvedSalaryForm.userId}
                onChange={(e) => setImprovedSalaryForm({ ...improvedSalaryForm, userId: e.target.value })}
                label="Select Employee"
              >
                {users.map((user: User) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} ({user.email})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Base Monthly Salary"
              type="number"
              value={improvedSalaryForm.baseSalary}
              onChange={(e) => setImprovedSalaryForm({ ...improvedSalaryForm, baseSalary: e.target.value })}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>৳</Typography>
              }}
            />
            <TextField
              fullWidth
              label="Notes (Optional)"
              multiline
              rows={3}
              value={improvedSalaryForm.notes}
              onChange={(e) => setImprovedSalaryForm({ ...improvedSalaryForm, notes: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImprovedSalaryDialog(false)}>Cancel</Button>
          <Button
            onClick={handleSetSalary}
            variant="contained"
            disabled={setSalaryMutation.isLoading}
          >
            {setSalaryMutation.isLoading ? <CircularProgress size={20} /> : 'Set Salary'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Process Payment Dialog */}
      <Dialog open={processPaymentDialog} onClose={() => setProcessPaymentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Process Monthly Payments</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Select Employee</InputLabel>
              <Select
                value={selectedProfile?.id || ''}
                onChange={(e) => {
                  const profile = profiles.find(p => p.id === e.target.value);
                  setSelectedProfile(profile || null);
                  if (profile) {
                    setPaymentForm({ ...paymentForm, amount: profile.baseSalary.toString() });
                  }
                }}
                label="Select Employee"
              >
                {profiles.map((profile) => (
                  <MenuItem key={profile.id} value={profile.id}>
                    {profile.user.firstName} {profile.user.lastName} - {formatCurrency(profile.baseSalary)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Payment Amount"
              type="number"
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>৳</Typography>
              }}
              helperText={selectedProfile ? `Base salary: ${formatCurrency(selectedProfile.baseSalary)}` : ''}
            />
            <TextField
              fullWidth
              label="Deductions (Optional)"
              type="number"
              value={paymentForm.deductions}
              onChange={(e) => setPaymentForm({ ...paymentForm, deductions: e.target.value })}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>৳</Typography>
              }}
            />
            <TextField
              fullWidth
              label="Bonuses (Optional)"
              type="number"
              value={paymentForm.bonuses}
              onChange={(e) => setPaymentForm({ ...paymentForm, bonuses: e.target.value })}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>৳</Typography>
              }}
            />
            <TextField
              fullWidth
              label="Notes (Optional)"
              multiline
              rows={3}
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProcessPaymentDialog(false)}>Cancel</Button>
          <Button
            onClick={handleProcessPayment}
            variant="contained"
            disabled={processPaymentMutation.isLoading}
          >
            {processPaymentMutation.isLoading ? <CircularProgress size={20} /> : 'Process Payment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CombinedSalaryPage;
