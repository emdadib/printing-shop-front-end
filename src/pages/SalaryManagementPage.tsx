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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  Tooltip,
  Menu,
  ListItemIcon,
  ListItemText,
  Grid,
  Autocomplete
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Payment as PaymentIcon,
  // Visibility as ViewIcon, // Unused import
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AttachMoney as MoneyIcon
} from '@mui/icons-material'
import { usePermissions } from '@/hooks/usePermissions'
import { PermissionGate } from '@/components/PermissionGate'
import { salaryApi, Salary, CreateSalaryData, UpdateSalaryData, SalarySummary } from '@/services/salaryApi'
import { userApi, User } from '@/services/userApi'
// import toast from 'react-hot-toast' // Unused import

const statusColors = {
  PENDING: 'warning',
  APPROVED: 'info',
  PAID: 'success',
  CANCELLED: 'error'
} as const

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export const SalaryManagementPage: React.FC = () => {
  const { user: _currentUser, isAdmin } = usePermissions()
  const [salaries, setSalaries] = useState<Salary[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [summary, setSummary] = useState<SalarySummary | null>(null)
  const [_loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [editingSalary, setEditingSalary] = useState<Salary | null>(null)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedSalary, setSelectedSalary] = useState<Salary | null>(null)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' })
  
  // Filter states
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [selectedStatus, setSelectedStatus] = useState<string>('')

  // Form state
  const [formData, setFormData] = useState({
    userId: '',
    amount: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    notes: '',
    deductions: '',
    bonuses: ''
  })

  useEffect(() => {
    fetchUsers()
    fetchSalaries()
  }, [])

  useEffect(() => {
    fetchSalaries()
    fetchSummary()
  }, [selectedMonth, selectedYear, selectedStatus])

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

  const fetchSalaries = async () => {
    try {
      setLoading(true)
      const params: any = {
        month: selectedMonth,
        year: selectedYear
      }
      if (selectedStatus) params.status = selectedStatus
      
      const response = await salaryApi.getAllSalaries(params)
      if (response.success) {
        setSalaries(response.data)
      } else {
        showSnackbar('Failed to fetch salaries', 'error')
      }
    } catch (error) {
      console.error('Error fetching salaries:', error)
      showSnackbar('Failed to fetch salaries', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fetchSummary = async () => {
    try {
      const response = await salaryApi.getSalarySummary({ month: selectedMonth, year: selectedYear })
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

  const handleOpenDialog = (salary?: Salary) => {
    if (salary) {
      setEditingSalary(salary)
      setFormData({
        userId: salary.userId,
        amount: salary.amount.toString(),
        month: salary.month,
        year: salary.year,
        notes: salary.notes || '',
        deductions: salary.deductions?.toString() || '',
        bonuses: salary.bonuses?.toString() || ''
      })
    } else {
      setEditingSalary(null)
      setFormData({
        userId: '',
        amount: '',
        month: selectedMonth,
        year: selectedYear,
        notes: '',
        deductions: '',
        bonuses: ''
      })
    }
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setEditingSalary(null)
  }

  const handleSubmit = async () => {
    try {
      if (editingSalary) {
        // Update salary
        const updateData: UpdateSalaryData = {
          amount: parseFloat(formData.amount),
          notes: formData.notes,
          deductions: formData.deductions ? parseFloat(formData.deductions) : undefined,
          bonuses: formData.bonuses ? parseFloat(formData.bonuses) : undefined
        }
        const response = await salaryApi.updateSalary(editingSalary.id, updateData)
        if (response.success) {
          showSnackbar('Salary updated successfully', 'success')
        } else {
          showSnackbar('Failed to update salary', 'error')
          return
        }
      } else {
        // Create salary
        const createData: CreateSalaryData = {
          userId: formData.userId,
          amount: parseFloat(formData.amount),
          month: formData.month,
          year: formData.year,
          notes: formData.notes,
          deductions: formData.deductions ? parseFloat(formData.deductions) : undefined,
          bonuses: formData.bonuses ? parseFloat(formData.bonuses) : undefined
        }
        const response = await salaryApi.createSalary(createData)
        if (response.success) {
          showSnackbar('Salary created successfully', 'success')
        } else {
          showSnackbar('Failed to create salary', 'error')
          return
        }
      }
      
      handleCloseDialog()
      fetchSalaries()
      fetchSummary()
    } catch (error) {
      console.error('Error saving salary:', error)
      showSnackbar('Failed to save salary', 'error')
    }
  }

  const handleMarkAsPaid = async (salary: Salary) => {
    try {
      const response = await salaryApi.markSalaryAsPaid(salary.id)
      if (response.success) {
        showSnackbar('Salary marked as paid successfully', 'success')
        fetchSalaries()
        fetchSummary()
      } else {
        showSnackbar('Failed to mark salary as paid', 'error')
      }
    } catch (error) {
      console.error('Error marking salary as paid:', error)
      showSnackbar('Failed to mark salary as paid', 'error')
    }
  }

  const handleDeleteSalary = async (salary: Salary) => {
    if (salary.status === 'PAID') {
      showSnackbar('Cannot delete paid salary records', 'error')
      return
    }

    if (window.confirm(`Are you sure you want to delete salary for ${salary.user.firstName} ${salary.user.lastName}?`)) {
      try {
        const response = await salaryApi.deleteSalary(salary.id)
        if (response.success) {
          showSnackbar('Salary deleted successfully', 'success')
          fetchSalaries()
          fetchSummary()
        } else {
          showSnackbar('Failed to delete salary', 'error')
        }
      } catch (error) {
        console.error('Error deleting salary:', error)
        showSnackbar('Failed to delete salary', 'error')
      }
    }
  }

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, salary: Salary) => {
    setAnchorEl(event.currentTarget)
    setSelectedSalary(salary)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setSelectedSalary(null)
  }

  const canEditSalary = (salary: Salary): boolean => {
    return isAdmin() && salary.status !== 'PAID'
  }

  const canDeleteSalary = (salary: Salary): boolean => {
    return isAdmin() && salary.status !== 'PAID'
  }

  const canMarkAsPaid = (salary: Salary): boolean => {
    return isAdmin() && salary.status !== 'PAID'
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Salary Management
        </Typography>
        <PermissionGate resource="salaries" action="create">
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Salary
          </Button>
        </PermissionGate>
      </Box>

      {/* Summary Cards */}
      {summary && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MoneyIcon color="primary" />
                  <Typography variant="h6">Total Amount</Typography>
                </Box>
                <Typography variant="h4" color="primary">
                  ${summary.totalAmount.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingUpIcon color="success" />
                  <Typography variant="h6">Bonuses</Typography>
                </Box>
                <Typography variant="h4" color="success.main">
                  ${summary.totalBonuses.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingDownIcon color="error" />
                  <Typography variant="h6">Deductions</Typography>
                </Box>
                <Typography variant="h4" color="error.main">
                  ${summary.totalDeductions.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PaymentIcon color="info" />
                  <Typography variant="h6">Paid Salaries</Typography>
                </Box>
                <Typography variant="h4" color="info.main">
                  {summary.paidSalaries}/{summary.totalSalaries}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>Month</InputLabel>
                <Select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  label="Month"
                >
                  {monthNames.map((month, index) => (
                    <MenuItem key={index} value={index + 1}>
                      {month}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                label="Year"
                type="number"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={3}>
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
                  <MenuItem value="CANCELLED">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Salaries Table */}
      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Deductions</TableCell>
                      <TableCell>Bonuses</TableCell>
                      <TableCell>Advances</TableCell>
                      <TableCell>Net Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Paid Date</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {salaries.map((salary) => {
                  const netAmount = salary.amount + (salary.bonuses || 0) - (salary.deductions || 0) - (salary.advances || 0)
                  return (
                    <TableRow key={salary.id}>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2">
                            {salary.user.firstName} {salary.user.lastName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {salary.user.email}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>${salary.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        {salary.deductions ? `$${salary.deductions.toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell>
                        {salary.bonuses ? `$${salary.bonuses.toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell>
                        {salary.advances ? `$${salary.advances.toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell>
                        <Typography variant="subtitle2" color="primary">
                          ${netAmount.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={salary.status}
                          color={statusColors[salary.status]}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {salary.paidAt ? new Date(salary.paidAt).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="More actions">
                          <IconButton
                            onClick={(e) => handleMenuOpen(e, salary)}
                            disabled={!canEditSalary(salary) && !canDeleteSalary(salary) && !canMarkAsPaid(salary)}
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  )
                })}
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
        {selectedSalary && canEditSalary(selectedSalary) && (
          <MenuItem onClick={() => { handleOpenDialog(selectedSalary); handleMenuClose(); }}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
        )}
        {selectedSalary && canMarkAsPaid(selectedSalary) && (
          <MenuItem onClick={() => { handleMarkAsPaid(selectedSalary); handleMenuClose(); }}>
            <ListItemIcon>
              <PaymentIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Mark as Paid</ListItemText>
          </MenuItem>
        )}
        {selectedSalary && canDeleteSalary(selectedSalary) && (
          <MenuItem 
            onClick={() => { handleDeleteSalary(selectedSalary); handleMenuClose(); }}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingSalary ? 'Edit Salary' : 'Create Salary'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {!editingSalary && (
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
            {!editingSalary && (
              <>
                <FormControl fullWidth>
                  <InputLabel>Month</InputLabel>
                  <Select
                    value={formData.month}
                    onChange={(e) => setFormData({ ...formData, month: Number(e.target.value) })}
                    label="Month"
                  >
                    {monthNames.map((month, index) => (
                      <MenuItem key={index} value={index + 1}>
                        {month}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="Year"
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                  fullWidth
                  required
                />
              </>
            )}
            <TextField
              label="Deductions"
              type="number"
              value={formData.deductions}
              onChange={(e) => setFormData({ ...formData, deductions: e.target.value })}
              fullWidth
            />
            <TextField
              label="Bonuses"
              type="number"
              value={formData.bonuses}
              onChange={(e) => setFormData({ ...formData, bonuses: e.target.value })}
              fullWidth
            />
            <TextField
              label="Notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingSalary ? 'Update' : 'Create'}
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

export default SalaryManagementPage
