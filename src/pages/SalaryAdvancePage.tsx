import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar,
  Tooltip,
  Menu,
  ListItemIcon,
  ListItemText,
  Grid,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material'
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  CheckCircle as ApproveIcon,
  Payment as PayIcon,
  Cancel as RejectIcon,
  Delete as DeleteIcon,
  TrendingUp as TrendingUpIcon,
  AccountBalanceWallet as WalletIcon
} from '@mui/icons-material'
import { usePermissions } from '@/hooks/usePermissions'
// import { PermissionGate } from '@/components/PermissionGate' // Unused import
import { salaryAdvanceApi, SalaryAdvance, CreateSalaryAdvanceData, AdvanceSummary } from '@/services/salaryAdvanceApi'
import { userApi, User } from '@/services/userApi'
// import toast from 'react-hot-toast' // Unused import

const statusColors = {
  PENDING: 'warning',
  APPROVED: 'info',
  PAID: 'success',
  REJECTED: 'error',
  CANCELLED: 'default'
} as const

export const SalaryAdvancePage: React.FC = () => {
  const { user: currentUser, isAdmin } = usePermissions()
  const [advances, setAdvances] = useState<SalaryAdvance[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [summary, setSummary] = useState<AdvanceSummary | null>(null)
  const [_loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedAdvance, setSelectedAdvance] = useState<SalaryAdvance | null>(null)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' })
  
  // Filter states
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')

  // Form state
  const [formData, setFormData] = useState({
    userId: '',
    amount: '',
    reason: '',
    notes: ''
  })

  useEffect(() => {
    fetchUsers()
    fetchAdvances()
  }, [])

  useEffect(() => {
    fetchAdvances()
  }, [selectedUser, selectedStatus])

  const fetchUsers = async () => {
    try {
      const response = await userApi.getAllUsers()
      if (response.success) {
        setUsers(response.data.filter(user => user.isActive))
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchAdvances = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (selectedUser) params.userId = selectedUser
      if (selectedStatus) params.status = selectedStatus
      
      const response = await salaryAdvanceApi.getAllSalaryAdvances(params)
      if (response.success) {
        setAdvances(response.data)
      } else {
        showSnackbar('Failed to fetch salary advances', 'error')
      }
    } catch (error) {
      console.error('Error fetching salary advances:', error)
      showSnackbar('Failed to fetch salary advances', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fetchSummary = async (userId: string) => {
    try {
      const response = await salaryAdvanceApi.getEmployeeAdvanceSummary(userId)
      if (response.success) {
        setSummary(response.data)
      }
    } catch (error) {
      console.error('Error fetching summary:', error)
    }
  }

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity })
  }

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false })
  }

  const handleOpenDialog = () => {
    setFormData({
      userId: currentUser?.id || '',
      amount: '',
      reason: '',
      notes: ''
    })
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
  }

  const handleSubmit = async () => {
    try {
      const createData: CreateSalaryAdvanceData = {
        userId: formData.userId,
        amount: parseFloat(formData.amount),
        reason: formData.reason,
        notes: formData.notes
      }
      
      const response = await salaryAdvanceApi.createSalaryAdvance(createData)
      if (response.success) {
        showSnackbar('Salary advance request created successfully', 'success')
        handleCloseDialog()
        fetchAdvances()
      } else {
        showSnackbar('Failed to create salary advance request', 'error')
      }
    } catch (error) {
      console.error('Error creating salary advance:', error)
      showSnackbar('Failed to create salary advance request', 'error')
    }
  }

  const handleApprove = async (advance: SalaryAdvance) => {
    try {
      const response = await salaryAdvanceApi.approveSalaryAdvance(advance.id)
      if (response.success) {
        showSnackbar('Salary advance approved successfully', 'success')
        fetchAdvances()
      } else {
        showSnackbar('Failed to approve salary advance', 'error')
      }
    } catch (error) {
      console.error('Error approving salary advance:', error)
      showSnackbar('Failed to approve salary advance', 'error')
    }
  }

  const handlePay = async (advance: SalaryAdvance) => {
    try {
      const response = await salaryAdvanceApi.paySalaryAdvance(advance.id)
      if (response.success) {
        showSnackbar('Salary advance paid successfully', 'success')
        fetchAdvances()
      } else {
        showSnackbar('Failed to pay salary advance', 'error')
      }
    } catch (error) {
      console.error('Error paying salary advance:', error)
      showSnackbar('Failed to pay salary advance', 'error')
    }
  }

  const handleReject = async (advance: SalaryAdvance) => {
    const reason = window.prompt('Reason for rejection:')
    if (reason) {
      try {
        const response = await salaryAdvanceApi.rejectSalaryAdvance(advance.id, reason)
        if (response.success) {
          showSnackbar('Salary advance rejected successfully', 'success')
          fetchAdvances()
        } else {
          showSnackbar('Failed to reject salary advance', 'error')
        }
      } catch (error) {
        console.error('Error rejecting salary advance:', error)
        showSnackbar('Failed to reject salary advance', 'error')
      }
    }
  }

  const handleDelete = async (advance: SalaryAdvance) => {
    if (window.confirm(`Are you sure you want to delete this advance request?`)) {
      try {
        const response = await salaryAdvanceApi.deleteSalaryAdvance(advance.id)
        if (response.success) {
          showSnackbar('Salary advance deleted successfully', 'success')
          fetchAdvances()
        } else {
          showSnackbar('Failed to delete salary advance', 'error')
        }
      } catch (error) {
        console.error('Error deleting salary advance:', error)
        showSnackbar('Failed to delete salary advance', 'error')
      }
    }
  }

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, advance: SalaryAdvance) => {
    setAnchorEl(event.currentTarget)
    setSelectedAdvance(advance)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setSelectedAdvance(null)
  }

  const canApprove = (advance: SalaryAdvance): boolean => {
    return isAdmin() && advance.status === 'PENDING'
  }

  const canPay = (advance: SalaryAdvance): boolean => {
    return isAdmin() && advance.status === 'APPROVED'
  }

  const canReject = (advance: SalaryAdvance): boolean => {
    return isAdmin() && advance.status === 'PENDING'
  }

  const canDelete = (advance: SalaryAdvance): boolean => {
    return advance.status === 'PENDING' && (advance.userId === currentUser?.id || isAdmin())
  }

  const handleUserChange = (userId: string) => {
    setSelectedUser(userId)
    if (userId) {
      fetchSummary(userId)
    } else {
      setSummary(null)
    }
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Salary Advances
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
        >
          Request Advance
        </Button>
      </Box>

      {/* Summary Card */}
      {summary && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Advance Summary for {users.find(u => u.id === summary.userId)?.firstName} {users.find(u => u.id === summary.userId)?.lastName}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WalletIcon color="primary" />
                  <Typography variant="h6">Total Amount</Typography>
                </Box>
                <Typography variant="h4" color="primary">
                  ${summary.totalAmount.toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingUpIcon color="warning" />
                  <Typography variant="h6">Pending</Typography>
                </Box>
                <Typography variant="h4" color="warning.main">
                  ${summary.pendingAmount.toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ApproveIcon color="info" />
                  <Typography variant="h6">Approved</Typography>
                </Box>
                <Typography variant="h4" color="info.main">
                  ${summary.approvedAmount.toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PayIcon color="success" />
                  <Typography variant="h6">Paid</Typography>
                </Box>
                <Typography variant="h4" color="success.main">
                  ${summary.paidAmount.toLocaleString()}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <Autocomplete
                options={users}
                getOptionLabel={(user) => `${user.firstName} ${user.lastName} (${user.email})`}
                value={users.find(user => user.id === selectedUser) || null}
                onChange={(_, user) => handleUserChange(user?.id || '')}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Employee"
                    placeholder="All employees"
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="PENDING">Pending</MenuItem>
                  <MenuItem value="APPROVED">Approved</MenuItem>
                  <MenuItem value="PAID">Paid</MenuItem>
                  <MenuItem value="REJECTED">Rejected</MenuItem>
                  <MenuItem value="CANCELLED">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Advances Table */}
      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Request Date</TableCell>
                  <TableCell>Approved Date</TableCell>
                  <TableCell>Paid Date</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {advances.map((advance) => (
                  <TableRow key={advance.id}>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2">
                          {advance.user.firstName} {advance.user.lastName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {advance.user.email}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>${advance.amount.toLocaleString()}</TableCell>
                    <TableCell>{advance.reason || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={advance.status}
                        color={statusColors[advance.status]}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(advance.requestDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {advance.approvedAt ? new Date(advance.approvedAt).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>
                      {advance.paidAt ? new Date(advance.paidAt).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="More actions">
                        <IconButton
                          onClick={(e) => handleMenuOpen(e, advance)}
                          disabled={!canApprove(advance) && !canPay(advance) && !canReject(advance) && !canDelete(advance)}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {selectedAdvance && canApprove(selectedAdvance) && (
          <MenuItem onClick={() => { handleApprove(selectedAdvance); handleMenuClose(); }}>
            <ListItemIcon>
              <ApproveIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Approve</ListItemText>
          </MenuItem>
        )}
        {selectedAdvance && canPay(selectedAdvance) && (
          <MenuItem onClick={() => { handlePay(selectedAdvance); handleMenuClose(); }}>
            <ListItemIcon>
              <PayIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Pay</ListItemText>
          </MenuItem>
        )}
        {selectedAdvance && canReject(selectedAdvance) && (
          <MenuItem onClick={() => { handleReject(selectedAdvance); handleMenuClose(); }}>
            <ListItemIcon>
              <RejectIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Reject</ListItemText>
          </MenuItem>
        )}
        {selectedAdvance && canDelete(selectedAdvance) && (
          <MenuItem 
            onClick={() => { handleDelete(selectedAdvance); handleMenuClose(); }}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Create Advance Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Request Salary Advance
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {isAdmin() && (
              <Autocomplete
                options={users}
                getOptionLabel={(user) => `${user.firstName} ${user.lastName} (${user.email})`}
                value={users.find(user => user.id === formData.userId) || null}
                onChange={(_, user) => setFormData({ ...formData, userId: user?.id || '' })}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Employee"
                    required
                  />
                )}
              />
            )}
            <TextField
              label="Amount"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Reason"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              label="Notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            Request Advance
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default SalaryAdvancePage
