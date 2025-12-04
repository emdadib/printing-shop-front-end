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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
  Checkbox,
  CircularProgress
} from '@mui/material'
import {
  ExpandMore as ExpandMoreIcon,
  Person as PersonIcon,
  Security as SecurityIcon,
  Menu as MenuIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material'
import { useQueryClient } from 'react-query'
import { useSelector } from 'react-redux'
import { RootState } from '@/store'
import { SuperAdminOnly } from '@/components/PermissionGate'
import { permissionApi, type Permission, type Menu, type UserPermission, type UserMenuPermission } from '@/services/permissionApi'
import { userApi, type User } from '@/services/userApi'

export const PermissionManagementPage: React.FC = () => {
  const queryClient = useQueryClient()
  const { user: currentUser } = useSelector((state: RootState) => state.auth)
  const [activeTab, setActiveTab] = useState(0)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [menus, setMenus] = useState<Menu[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([])
  const [userMenuPermissions, setUserMenuPermissions] = useState<UserMenuPermission[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogLoading, setDialogLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [openUserDialog, setOpenUserDialog] = useState(false)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [permissionsRes, menusRes, usersRes] = await Promise.all([
        permissionApi.getAllPermissions(),
        permissionApi.getAllMenus(),
        userApi.getAllUsers()
      ])
      
      if (permissionsRes.success) {
        setPermissions(permissionsRes.data)
      } else {
        console.error('Failed to fetch permissions:', permissionsRes)
      }
      
      if (menusRes.success) {
        // Flatten menu structure to include parent and children
        const allMenus: Menu[] = []
        if (menusRes.data && menusRes.data.length > 0) {
          menusRes.data.forEach(menu => {
            allMenus.push(menu)
            if (menu.children && menu.children.length > 0) {
              allMenus.push(...menu.children)
            }
          })
        }
        setMenus(allMenus)
        
        if (allMenus.length === 0) {
          console.warn('No menus found in database. Please run the setup script to seed menus.')
        }
      } else {
        console.error('Failed to fetch menus:', menusRes)
        showSnackbar('Failed to fetch menus. Please ensure menus are seeded in the database.', 'error')
      }
      
      if (usersRes.success) {
        setUsers(usersRes.data)
      } else {
        console.error('Failed to fetch users:', usersRes)
      }
    } catch (error: any) {
      console.error('Error fetching data:', error)
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to fetch data'
      showSnackbar(errorMessage, 'error')
    } finally {
      setLoading(false)
    }
  }

  const fetchUserPermissions = async (userId: string) => {
    try {
      setDialogLoading(true)
      const [permissionsRes, menuPermissionsRes] = await Promise.all([
        permissionApi.getUserPermissions(userId),
        permissionApi.getUserMenuPermissions(userId)
      ])
      
      if (permissionsRes.success) {
        setUserPermissions(permissionsRes.data)
      }
      
      if (menuPermissionsRes.success) {
        setUserMenuPermissions(menuPermissionsRes.data)
      }
    } catch (error) {
      console.error('Error fetching user permissions:', error)
      showSnackbar('Failed to fetch user permissions', 'error')
    } finally {
      setDialogLoading(false)
    }
  }

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity })
  }

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false })
  }

  const handleUserSelect = async (user: User) => {
    setSelectedUser(user)
    setOpenUserDialog(true)
    await fetchUserPermissions(user.id)
  }

  const handlePermissionToggle = async (permissionId: string, granted: boolean) => {
    if (!selectedUser) return

    try {
      if (granted) {
        await permissionApi.grantPermission({
          userId: selectedUser.id,
          permissionId
        })
        showSnackbar('Permission granted successfully', 'success')
      } else {
        await permissionApi.revokePermission({
          userId: selectedUser.id,
          permissionId
        })
        showSnackbar('Permission revoked successfully', 'success')
      }
      // Refresh user permissions
      await fetchUserPermissions(selectedUser.id)
    } catch (error: any) {
      console.error('Error updating permission:', error)
      const errorMessage = error?.response?.data?.message || 'Failed to update permission'
      showSnackbar(errorMessage, 'error')
    }
  }

  const handleMenuPermissionToggle = async (menuId: string, canView: boolean) => {
    if (!selectedUser) return

    try {
      if (canView) {
        await permissionApi.grantMenuPermission({
          userId: selectedUser.id,
          menuId
        })
        showSnackbar('Menu permission granted successfully', 'success')
      } else {
        await permissionApi.revokeMenuPermission({
          userId: selectedUser.id,
          menuId
        })
        showSnackbar('Menu permission revoked successfully', 'success')
      }
      // Refresh user menu permissions
      await fetchUserPermissions(selectedUser.id)
      
      // Invalidate accessible menus cache to refresh the menu immediately
      // Invalidate for the selected user
      queryClient.invalidateQueries(['accessibleMenus', selectedUser.id])
      
      // Also invalidate for current logged-in user if they're viewing their own permissions
      // This ensures the menu updates immediately if admin is viewing their own permissions
      if (currentUser?.id) {
        queryClient.invalidateQueries(['accessibleMenus', currentUser.id])
      }
    } catch (error: any) {
      console.error('Error updating menu permission:', error)
      const errorMessage = error?.response?.data?.message || 'Failed to update menu permission'
      showSnackbar(errorMessage, 'error')
    }
  }

  const hasPermission = (permissionId: string): boolean => {
    return userPermissions.some(
      up => up.permissionId === permissionId && up.granted
    )
  }

  const hasMenuPermission = (menuId: string): boolean => {
    return userMenuPermissions.some(
      ump => ump.menuId === menuId && ump.canView
    )
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
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                {activeTab === 0 && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      User Permissions
                    </Typography>
                    {users.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                        No users found
                      </Typography>
                    ) : (
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
                    )}
                  </Box>
                )}

                {activeTab === 1 && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      System Permissions
                    </Typography>
                    {permissions.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                        No permissions found
                      </Typography>
                    ) : (
                      Object.entries(groupedPermissions).map(([resource, perms]) => (
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
                                        {permission.description || permission.name}
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
                      ))
                    )}
                  </Box>
                )}

                {activeTab === 2 && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      System Menus
                    </Typography>
                    {menus.length === 0 ? (
                      <Box sx={{ p: 3, textAlign: 'center' }}>
                        <Alert severity="warning" sx={{ mb: 2 }}>
                          No menus found in the database.
                        </Alert>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          To seed menus, run the following command in the server directory:
                        </Typography>
                        <Box
                          component="pre"
                          sx={{
                            bgcolor: 'grey.100',
                            p: 2,
                            borderRadius: 1,
                            overflow: 'auto',
                            textAlign: 'left',
                            fontFamily: 'monospace',
                            fontSize: '0.875rem'
                          }}
                        >
                          cd server{'\n'}node scripts/setup-permissions.js
                        </Box>
                        <Button
                          variant="outlined"
                          startIcon={<RefreshIcon />}
                          onClick={fetchData}
                          sx={{ mt: 2 }}
                        >
                          Refresh
                        </Button>
                      </Box>
                    ) : (
                      <TableContainer component={Paper}>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Menu</TableCell>
                              <TableCell>Name</TableCell>
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
                                    {menu.name}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" color="text.secondary">
                                    {menu.path || 'N/A'}
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
                    )}
                  </Box>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* User Permission Dialog */}
        <Dialog open={openUserDialog} onClose={() => setOpenUserDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            Manage Permissions for {selectedUser?.firstName} {selectedUser?.lastName}
          </DialogTitle>
          <DialogContent>
            {dialogLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : selectedUser ? (
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
                                checked={hasPermission(permission.id)}
                                onChange={(e) => handlePermissionToggle(permission.id, e.target.checked)}
                              />
                            </ListItemIcon>
                            <ListItemText
                              primary={permission.action.toUpperCase()}
                              secondary={permission.description || permission.name}
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
                {menus.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                    No menus available
                  </Typography>
                ) : (
                  <List>
                    {menus.map((menu) => (
                      <ListItem key={menu.id}>
                        <ListItemIcon>
                          <Checkbox
                            checked={hasMenuPermission(menu.id)}
                            onChange={(e) => handleMenuPermissionToggle(menu.id, e.target.checked)}
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={menu.label}
                          secondary={menu.path || 'N/A'}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
            ) : null}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setOpenUserDialog(false)
              setSelectedUser(null)
              setUserPermissions([])
              setUserMenuPermissions([])
            }}>
              Close
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
