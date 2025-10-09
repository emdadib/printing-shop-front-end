import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  // Switch, // Unused import
  // FormControlLabel, // Unused import
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  // TextField, // Unused import
  // FormControl, // Unused import
  // InputLabel, // Unused import
  // Select, // Unused import
  // MenuItem, // Unused import
  Alert,
  Snackbar,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox
} from '@mui/material'
import {
  ExpandMore as ExpandMoreIcon,
  Person as PersonIcon,
  Security as SecurityIcon,
  Menu as MenuIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material'
import { SuperAdminOnly } from '@/components/PermissionGate'
import { menuItems } from '@/components/DynamicMenu'
// import toast from 'react-hot-toast' // Unused import

interface Permission {
  id: string
  name: string
  description: string
  resource: string
  action: string
  isActive: boolean
}

interface Menu {
  id: string
  name: string
  label: string
  path: string
  icon: string
  isActive: boolean
  requiresRole?: string
}

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
}

interface UserPermission {
  id: string
  userId: string
  permissionId: string
  granted: boolean
  expiresAt?: string
  permission: Permission
  user: User
}

interface UserMenuPermission {
  id: string
  userId: string
  menuId: string
  canView: boolean
  menu: Menu
  user: User
}

export const PermissionManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [menus, setMenus] = useState<Menu[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [_userPermissions, _setUserPermissions] = useState<UserPermission[]>([])
  const [_userMenuPermissions, _setUserMenuPermissions] = useState<UserMenuPermission[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [openUserDialog, setOpenUserDialog] = useState(false)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      // TODO: Replace with actual API calls
      // const [permissionsRes, menusRes, usersRes] = await Promise.all([
      //   permissionApi.getAllPermissions(),
      //   permissionApi.getAllMenus(),
      //   userApi.getAllUsers()
      // ])
      
      // Mock data for now
      setPermissions([
        // Product permissions
        { id: '1', name: 'products.create', description: 'Create products', resource: 'products', action: 'create', isActive: true },
        { id: '2', name: 'products.read', description: 'View products', resource: 'products', action: 'read', isActive: true },
        { id: '3', name: 'products.update', description: 'Update products', resource: 'products', action: 'update', isActive: true },
        { id: '4', name: 'products.delete', description: 'Delete products', resource: 'products', action: 'delete', isActive: true },
        
        // User permissions
        { id: '5', name: 'users.create', description: 'Create users', resource: 'users', action: 'create', isActive: true },
        { id: '6', name: 'users.read', description: 'View users', resource: 'users', action: 'read', isActive: true },
        { id: '7', name: 'users.update', description: 'Update users', resource: 'users', action: 'update', isActive: true },
        { id: '8', name: 'users.delete', description: 'Delete users', resource: 'users', action: 'delete', isActive: true },
        
        // Order permissions
        { id: '9', name: 'orders.create', description: 'Create orders', resource: 'orders', action: 'create', isActive: true },
        { id: '10', name: 'orders.read', description: 'View orders', resource: 'orders', action: 'read', isActive: true },
        { id: '11', name: 'orders.update', description: 'Update orders', resource: 'orders', action: 'update', isActive: true },
        { id: '12', name: 'orders.delete', description: 'Delete orders', resource: 'orders', action: 'delete', isActive: true },
        
        // Customer permissions
        { id: '13', name: 'customers.create', description: 'Create customers', resource: 'customers', action: 'create', isActive: true },
        { id: '14', name: 'customers.read', description: 'View customers', resource: 'customers', action: 'read', isActive: true },
        { id: '15', name: 'customers.update', description: 'Update customers', resource: 'customers', action: 'update', isActive: true },
        { id: '16', name: 'customers.delete', description: 'Delete customers', resource: 'customers', action: 'delete', isActive: true },
        
        // Inventory permissions
        { id: '17', name: 'inventory.read', description: 'View inventory', resource: 'inventory', action: 'read', isActive: true },
        { id: '18', name: 'inventory.update', description: 'Update inventory', resource: 'inventory', action: 'update', isActive: true },
        
        // Reports permissions
        { id: '19', name: 'reports.read', description: 'View reports', resource: 'reports', action: 'read', isActive: true },
        
        // Settings permissions
        { id: '20', name: 'settings.read', description: 'View settings', resource: 'settings', action: 'read', isActive: true },
        { id: '21', name: 'settings.update', description: 'Update settings', resource: 'settings', action: 'update', isActive: true },
        
        // Salary permissions
        { id: '22', name: 'salary.read', description: 'View salary data', resource: 'salary', action: 'read', isActive: true },
        { id: '23', name: 'salary.update', description: 'Update salary data', resource: 'salary', action: 'update', isActive: true },
      ])
      
      // Convert menuItems to the format expected by the component
      const formattedMenus = menuItems.map((menu, index) => ({
        id: (index + 1).toString(),
        name: menu.name,
        label: menu.label,
        path: menu.path,
        icon: menu.icon,
        isActive: true,
        requiresRole: menu.requiresRole ? menu.requiresRole.join(', ') : undefined
      }))
      
      setMenus(formattedMenus)
      
      setUsers([
        { id: '1', email: 'superadmin@printingshop.com', firstName: 'Super', lastName: 'Admin', role: 'SUPER_ADMIN' },
        { id: '2', email: 'admin@printingshop.com', firstName: 'Admin', lastName: 'User', role: 'ADMIN' },
        { id: '3', email: 'manager@printingshop.com', firstName: 'Manager', lastName: 'User', role: 'MANAGER' },
        { id: '4', email: 'cashier@printingshop.com', firstName: 'Cashier', lastName: 'User', role: 'CASHIER' },
        { id: '5', email: 'operator@printingshop.com', firstName: 'Operator', lastName: 'User', role: 'OPERATOR' },
        { id: '6', email: 'staff@printingshop.com', firstName: 'Staff', lastName: 'User', role: 'STAFF' },
      ])
    } catch (error) {
      console.error('Error fetching data:', error)
      showSnackbar('Failed to fetch data', 'error')
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

  const handleUserSelect = (user: User) => {
    setSelectedUser(user)
    setOpenUserDialog(true)
    // TODO: Fetch user's specific permissions
  }

  const handlePermissionToggle = async (_permissionId: string, granted: boolean) => {
    if (!selectedUser) return

    try {
      if (granted) {
        // TODO: Grant permission
        // await permissionApi.grantPermission(selectedUser.id, permissionId)
      } else {
        // TODO: Revoke permission
        // await permissionApi.revokePermission(selectedUser.id, permissionId)
      }
      showSnackbar(`Permission ${granted ? 'granted' : 'revoked'} successfully`, 'success')
      fetchData()
    } catch (error) {
      console.error('Error updating permission:', error)
      showSnackbar('Failed to update permission', 'error')
    }
  }

  const handleMenuPermissionToggle = async (_menuId: string, canView: boolean) => {
    if (!selectedUser) return

    try {
      if (canView) {
        // TODO: Grant menu permission
        // await permissionApi.grantMenuPermission(selectedUser.id, menuId)
      } else {
        // TODO: Revoke menu permission
        // await permissionApi.revokeMenuPermission(selectedUser.id, menuId)
      }
      showSnackbar(`Menu permission ${canView ? 'granted' : 'revoked'} successfully`, 'success')
      fetchData()
    } catch (error) {
      console.error('Error updating menu permission:', error)
      showSnackbar('Failed to update menu permission', 'error')
    }
  }

  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.resource]) {
      acc[permission.resource] = []
    }
    acc[permission.resource].push(permission)
    return acc
  }, {} as Record<string, Permission[]>)

  return (
    <SuperAdminOnly>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Permission Management
          </Typography>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchData}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>

        <Card>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={activeTab} onChange={(_e, newValue) => setActiveTab(newValue)}>
              <Tab label="Users" icon={<PersonIcon />} />
              <Tab label="Permissions" icon={<SecurityIcon />} />
              <Tab label="Menus" icon={<MenuIcon />} />
            </Tabs>
          </Box>

          <CardContent>
            {activeTab === 0 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  User Permissions
                </Typography>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>User</TableCell>
                        <TableCell>Role</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <Typography variant="subtitle2">
                              {user.firstName} {user.lastName}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {user.email}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={user.role} color="primary" size="small" />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => handleUserSelect(user)}
                            >
                              Manage Permissions
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {activeTab === 1 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  System Permissions
                </Typography>
                {Object.entries(groupedPermissions).map(([resource, perms]) => (
                  <Accordion key={resource}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                        {resource}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        {perms.map((permission) => (
                          <Grid item xs={12} sm={6} md={4} key={permission.id}>
                            <Card variant="outlined">
                              <CardContent>
                                <Typography variant="subtitle2">
                                  {permission.action.toUpperCase()}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {permission.description}
                                </Typography>
                                <Chip
                                  label={permission.isActive ? 'Active' : 'Inactive'}
                                  color={permission.isActive ? 'success' : 'default'}
                                  size="small"
                                  sx={{ mt: 1 }}
                                />
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            )}

            {activeTab === 2 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  System Menus
                </Typography>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Menu</TableCell>
                        <TableCell>Path</TableCell>
                        <TableCell>Required Role</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {menus.map((menu) => (
                        <TableRow key={menu.id}>
                          <TableCell>
                            <Typography variant="subtitle2">
                              {menu.label}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {menu.path}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {menu.requiresRole ? (
                              <Chip label={menu.requiresRole} color="warning" size="small" />
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                None
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={menu.isActive ? 'Active' : 'Inactive'}
                              color={menu.isActive ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* User Permission Dialog */}
        <Dialog open={openUserDialog} onClose={() => setOpenUserDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            Manage Permissions for {selectedUser?.firstName} {selectedUser?.lastName}
          </DialogTitle>
          <DialogContent>
            {selectedUser && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Resource Permissions
                </Typography>
                {Object.entries(groupedPermissions).map(([resource, perms]) => (
                  <Accordion key={resource}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1" sx={{ textTransform: 'capitalize' }}>
                        {resource}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <List>
                        {perms.map((permission) => (
                          <ListItem key={permission.id}>
                            <ListItemIcon>
                              <Checkbox
                                checked={false} // TODO: Check actual permission status
                                onChange={(e) => handlePermissionToggle(permission.id, e.target.checked)}
                              />
                            </ListItemIcon>
                            <ListItemText
                              primary={permission.action.toUpperCase()}
                              secondary={permission.description}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </AccordionDetails>
                  </Accordion>
                ))}

                <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                  Menu Permissions
                </Typography>
                <List>
                  {menus.map((menu) => (
                    <ListItem key={menu.id}>
                      <ListItemIcon>
                        <Checkbox
                          checked={false} // TODO: Check actual menu permission status
                          onChange={(e) => handleMenuPermissionToggle(menu.id, e.target.checked)}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={menu.label}
                        secondary={menu.path}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenUserDialog(false)}>Close</Button>
            <Button variant="contained" startIcon={<SaveIcon />}>
              Save Changes
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
    </SuperAdminOnly>
  )
}

export default PermissionManagementPage
