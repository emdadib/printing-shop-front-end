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
  Switch,
  FormControlLabel,
  Alert,
  Snackbar,
  Tooltip,
  Menu,
  ListItemIcon,
  ListItemText
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  // Person as PersonIcon, // Unused import
  AdminPanelSettings as AdminIcon,
  SupervisorAccount as ManagerIcon,
  PointOfSale as CashierIcon,
  Build as OperatorIcon,
  PersonPin as StaffIcon,
  Security as SuperAdminIcon
} from '@mui/icons-material'
import { usePermissions } from '@/hooks/usePermissions'
import { PermissionGate, SuperAdminOnly, AdminOnly } from '@/components/PermissionGate'
import { userApi, User, CreateUserData, UpdateUserData } from '@/services/userApi'
// import toast from 'react-hot-toast' // Unused import

// User interface is now imported from userApi

const roleIcons = {
  SUPER_ADMIN: <SuperAdminIcon color="error" />,
  ADMIN: <AdminIcon color="warning" />,
  MANAGER: <ManagerIcon color="info" />,
  CASHIER: <CashierIcon color="success" />,
  OPERATOR: <OperatorIcon color="secondary" />,
  STAFF: <StaffIcon color="action" />
}

const roleColors = {
  SUPER_ADMIN: 'error',
  ADMIN: 'warning',
  MANAGER: 'info',
  CASHIER: 'success',
  OPERATOR: 'secondary',
  STAFF: 'default'
} as const

export const UserManagementPage: React.FC = () => {
  const { user: currentUser, isSuperAdmin, isAdmin } = usePermissions()
  const [users, setUsers] = useState<User[]>([])
  const [_loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' })

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    firstName: '',
    lastName: '',
    password: '',
    role: 'STAFF' as User['role'],
    isActive: true
  })

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await userApi.getAllUsers()
      if (response.success) {
        setUsers(response.data)
      } else {
        showSnackbar('Failed to fetch users', 'error')
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      showSnackbar('Failed to fetch users', 'error')
    } finally {
      setLoading(false)
    }
  }

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity })
  }

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false })
  }

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(user)
      setFormData({
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        password: '',
        role: user.role,
        isActive: user.isActive
      })
    } else {
      setEditingUser(null)
      setFormData({
        email: '',
        username: '',
        firstName: '',
        lastName: '',
        password: '',
        role: 'STAFF',
        isActive: true
      })
    }
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setEditingUser(null)
  }

  const handleSubmit = async () => {
    try {
      if (editingUser) {
        // Update user
        const updateData: UpdateUserData = {
          email: formData.email,
          username: formData.username,
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: formData.role,
          isActive: formData.isActive
        }
        const response = await userApi.updateUser(editingUser.id, updateData)
        if (response.success) {
          showSnackbar('User updated successfully', 'success')
        } else {
          showSnackbar('Failed to update user', 'error')
          return
        }
      } else {
        // Create user
        const createData: CreateUserData = {
          email: formData.email,
          username: formData.username,
          firstName: formData.firstName,
          lastName: formData.lastName,
          password: formData.password,
          role: formData.role,
          isActive: formData.isActive
        }
        const response = await userApi.createUser(createData)
        if (response.success) {
          showSnackbar('User created successfully', 'success')
        } else {
          showSnackbar('Failed to create user', 'error')
          return
        }
      }
      
      handleCloseDialog()
      fetchUsers()
    } catch (error) {
      console.error('Error saving user:', error)
      showSnackbar('Failed to save user', 'error')
    }
  }

  const handleDeleteUser = async (user: User) => {
    if (user.id === currentUser?.id) {
      showSnackbar('Cannot delete your own account', 'error')
      return
    }

    if (user.role === 'SUPER_ADMIN' && !isSuperAdmin()) {
      showSnackbar('Only SuperAdmin can delete SuperAdmin users', 'error')
      return
    }

    if (window.confirm(`Are you sure you want to delete ${user.firstName} ${user.lastName}?`)) {
      try {
        const response = await userApi.deleteUser(user.id)
        if (response.success) {
          showSnackbar('User deleted successfully', 'success')
          fetchUsers()
        } else {
          showSnackbar('Failed to delete user', 'error')
        }
      } catch (error) {
        console.error('Error deleting user:', error)
        showSnackbar('Failed to delete user', 'error')
      }
    }
  }

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, user: User) => {
    setAnchorEl(event.currentTarget)
    setSelectedUser(user)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setSelectedUser(null)
  }

  const canEditUser = (user: User): boolean => {
    if (isSuperAdmin()) return true
    if (user.role === 'SUPER_ADMIN') return false
    if (isAdmin() && user.role !== 'ADMIN') return true
    return false
  }

  const canDeleteUser = (user: User): boolean => {
    if (user.id === currentUser?.id) return false
    if (isSuperAdmin()) return true
    if (user.role === 'SUPER_ADMIN') return false
    if (isAdmin() && user.role !== 'ADMIN') return true
    return false
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          User Management
        </Typography>
        <PermissionGate resource="users" action="create">
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add User
          </Button>
        </PermissionGate>
      </Box>

      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last Login</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {roleIcons[user.role]}
                        <Box>
                          <Typography variant="subtitle2">
                            {user.firstName} {user.lastName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {user.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.role.replace('_', ' ')}
                        color={roleColors[user.role]}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.isActive ? 'Active' : 'Inactive'}
                        color={user.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                    </TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="More actions">
                        <IconButton
                          onClick={(e) => handleMenuOpen(e, user)}
                          disabled={!canEditUser(user) && !canDeleteUser(user)}
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
        {selectedUser && canEditUser(selectedUser) && (
          <MenuItem onClick={() => { handleOpenDialog(selectedUser); handleMenuClose(); }}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
        )}
        {selectedUser && canDeleteUser(selectedUser) && (
          <MenuItem 
            onClick={() => { handleDeleteUser(selectedUser); handleMenuClose(); }}
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
          {editingUser ? 'Edit User' : 'Create User'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              fullWidth
              required
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="First Name"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label="Last Name"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                fullWidth
                required
              />
            </Box>
            {!editingUser && (
              <TextField
                label="Password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                fullWidth
                required
              />
            )}
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as User['role'] })}
                label="Role"
              >
                <SuperAdminOnly>
                  <MenuItem value="SUPER_ADMIN">Super Admin</MenuItem>
                </SuperAdminOnly>
                <AdminOnly>
                  <MenuItem value="ADMIN">Admin</MenuItem>
                </AdminOnly>
                <MenuItem value="MANAGER">Manager</MenuItem>
                <MenuItem value="CASHIER">Cashier</MenuItem>
                <MenuItem value="OPERATOR">Operator</MenuItem>
                <MenuItem value="STAFF">Staff</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
              }
              label="Active"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingUser ? 'Update' : 'Create'}
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

export default UserManagementPage
