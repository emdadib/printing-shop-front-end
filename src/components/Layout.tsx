import React, { useEffect, useState } from 'react'
import {
  AppBar,
  Avatar,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Button,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
  alpha,
} from '@mui/material'
import {
  MenuRounded,
  LogoutRounded,
  PersonRounded,
  ExpandMoreRounded,
  ExpandLessRounded,
  PointOfSaleRounded,
} from '@mui/icons-material'
import { useNavigate, useLocation } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { RootState } from '@/store'
import { logout } from '@/store/slices/authSlice'
import { useCompany } from '@/contexts/CompanyContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useNavigation } from '@/hooks/useNavigation'
import { mobileNavKeys, roleLabels, type NavGroup, type NavItem } from '@/config/navigation'

interface LayoutProps {
  children: React.ReactNode
}

const DRAWER_WIDTH = 272
const BOTTOM_NAV_HEIGHT = 64
const OPEN_GROUPS_KEY = 'printshop.nav.openGroups'

type OpenGroups = Record<string, boolean>

const readOpenGroups = (): OpenGroups => {
  try {
    const raw = localStorage.getItem(OPEN_GROUPS_KEY)
    return raw ? (JSON.parse(raw) as OpenGroups) : {}
  } catch {
    return {}
  }
}

const writeOpenGroups = (value: OpenGroups) => {
  try {
    localStorage.setItem(OPEN_GROUPS_KEY, JSON.stringify(value))
  } catch {
    // Storage may be unavailable (private mode); the menu still works.
  }
}

const getInitials = (first?: string, last?: string) =>
  `${first?.charAt(0) ?? ''}${last?.charAt(0) ?? ''}`.toUpperCase() || 'U'

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

interface NavRowProps {
  item: NavItem
  active: boolean
  onClick: (item: NavItem) => void
}

const NavRow: React.FC<NavRowProps> = ({ item, active, onClick }) => {
  const Icon = item.icon
  return (
    <ListItemButton
      selected={active}
      onClick={() => onClick(item)}
      sx={{
        borderRadius: 2,
        minHeight: 44,
        mb: 0.25,
        px: 1.5,
        color: 'text.primary',
        '& .MuiListItemIcon-root': { minWidth: 38, color: 'text.secondary' },
        '&.Mui-selected': {
          bgcolor: theme => alpha(theme.palette.primary.main, 0.12),
          color: 'primary.main',
          '& .MuiListItemIcon-root': { color: 'primary.main' },
          '&:hover': { bgcolor: theme => alpha(theme.palette.primary.main, 0.18) },
        },
      }}
    >
      <ListItemIcon>
        <Icon fontSize="small" />
      </ListItemIcon>
      <ListItemText
        primary={item.label}
        primaryTypographyProps={{ fontWeight: active ? 700 : 500, noWrap: true }}
      />
    </ListItemButton>
  )
}

interface SideNavProps {
  groups: NavGroup[]
  currentKey?: string
  currentGroupKey?: string
  onNavigate: (item: NavItem) => void
  onProfile: () => void
  onLogout: () => void
}

const SideNav: React.FC<SideNavProps> = ({
  groups,
  currentKey,
  currentGroupKey,
  onNavigate,
  onProfile,
  onLogout,
}) => {
  const { companyInfo } = useCompany()
  const { user } = useSelector((state: RootState) => state.auth)
  const [openGroups, setOpenGroups] = useState<OpenGroups>(readOpenGroups)

  // Always reveal the group that holds the page the user is on.
  useEffect(() => {
    if (!currentGroupKey) return
    setOpenGroups(prev => (prev[currentGroupKey] ? prev : { ...prev, [currentGroupKey]: true }))
  }, [currentGroupKey])

  const toggleGroup = (key: string) => {
    setOpenGroups(prev => {
      const next = { ...prev, [key]: !(prev[key] ?? key === currentGroupKey) }
      writeOpenGroups(next)
      return next
    })
  }

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username || 'User'
  const roleLabel = user?.role ? roleLabels[user.role] ?? user.role : ''

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.paper' }}>
      {/* Brand */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 2, minHeight: 64 }}>
        {companyInfo.logo ? (
          <Box
            component="img"
            src={companyInfo.logo}
            alt={`${companyInfo.name} logo`}
            sx={{ height: 36, width: 36, objectFit: 'contain', borderRadius: 1.5 }}
          />
        ) : (
          <Avatar
            variant="rounded"
            sx={{ bgcolor: 'primary.main', width: 36, height: 36, fontWeight: 700 }}
          >
            {companyInfo.name.charAt(0).toUpperCase()}
          </Avatar>
        )}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={700} noWrap lineHeight={1.2}>
            {companyInfo.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Shop manager
          </Typography>
        </Box>
      </Box>
      <Divider />

      {/* Grouped menu */}
      <Box component="nav" aria-label="Main menu" sx={{ flex: 1, overflowY: 'auto', px: 1.5, py: 1.5 }}>
        <List disablePadding>
          {groups.map(group => {
            const isHome = group.key === 'home'
            if (isHome) {
              return group.items.map(item => (
                <NavRow key={item.key} item={item} active={item.key === currentKey} onClick={onNavigate} />
              ))
            }

            const open = openGroups[group.key] ?? group.key === currentGroupKey
            const containsActive = group.items.some(item => item.key === currentKey)
            const GroupIcon = group.icon

            return (
              <Box key={group.key} sx={{ mt: 1 }}>
                <ListItemButton
                  onClick={() => toggleGroup(group.key)}
                  aria-expanded={open}
                  sx={{
                    borderRadius: 2,
                    minHeight: 44,
                    px: 1.5,
                    color: containsActive && !open ? 'primary.main' : 'text.secondary',
                    '& .MuiListItemIcon-root': { minWidth: 38, color: 'inherit' },
                  }}
                >
                  <ListItemIcon>
                    <GroupIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={group.label}
                    primaryTypographyProps={{ fontWeight: 700, fontSize: '0.9rem' }}
                  />
                  {open ? <ExpandLessRounded fontSize="small" /> : <ExpandMoreRounded fontSize="small" />}
                </ListItemButton>
                <Collapse in={open} timeout="auto">
                  <List disablePadding sx={{ pl: 1 }}>
                    {group.items.map(item => (
                      <NavRow
                        key={item.key}
                        item={item}
                        active={item.key === currentKey}
                        onClick={onNavigate}
                      />
                    ))}
                  </List>
                </Collapse>
              </Box>
            )
          })}
        </List>
      </Box>

      {/* Signed-in user */}
      <Divider />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5 }}>
        <Avatar sx={{ bgcolor: 'primary.main', width: 38, height: 38, fontSize: '0.95rem', fontWeight: 700 }}>
          {getInitials(user?.firstName, user?.lastName)}
        </Avatar>
        <Box
          role="button"
          tabIndex={0}
          onClick={onProfile}
          onKeyDown={event => event.key === 'Enter' && onProfile()}
          sx={{ minWidth: 0, flex: 1, cursor: 'pointer' }}
        >
          <Typography variant="body2" fontWeight={600} noWrap>
            {fullName}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap display="block">
            {roleLabel}
          </Typography>
        </Box>
        <Tooltip title="Log out">
          <IconButton onClick={onLogout} aria-label="Log out" size="small">
            <LogoutRounded fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'), { noSsr: true })
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()

  const { user } = useSelector((state: RootState) => state.auth)
  const { companyInfo } = useCompany()
  const { groups, current, pageTitle, isVisible, getItem } = useNavigation()

  useDocumentTitle(pageTitle)

  const [mobileOpen, setMobileOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  // Close the phone drawer whenever the page changes.
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const handleNavigate = (item: NavItem) => {
    navigate(item.path)
    setMobileOpen(false)
  }

  const handleProfile = () => {
    setAnchorEl(null)
    navigate('/profile')
  }

  const handleLogout = () => {
    setAnchorEl(null)
    dispatch(logout())
    navigate('/login')
  }

  const title = pageTitle ?? companyInfo.name
  const groupLabel = current && current.group.key !== 'home' ? current.group.label : undefined
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username || 'User'

  const bottomItems = mobileNavKeys
    .map(key => getItem(key))
    .filter((item): item is NavItem => Boolean(item))
  const bottomValue = mobileOpen ? 'menu' : current?.item.key ?? ''

  const sideNav = (
    <SideNav
      groups={groups}
      currentKey={current?.item.key}
      currentGroupKey={current?.group.key}
      onNavigate={handleNavigate}
      onProfile={handleProfile}
      onLogout={handleLogout}
    />
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Top bar */}
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
        }}
      >
        <Toolbar sx={{ gap: 1 }}>
          {isMobile && (
            <IconButton
              edge="start"
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
              sx={{ mr: 0.5 }}
            >
              <MenuRounded />
            </IconButton>
          )}

          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            {groupLabel && !isMobile && (
              <Typography variant="caption" color="text.secondary" display="block" lineHeight={1.2}>
                {groupLabel}
              </Typography>
            )}
            <Typography variant="h6" component="h1" noWrap fontWeight={700} lineHeight={1.3}>
              {title}
            </Typography>
          </Box>

          {!isMobile && isVisible('pos') && current?.item.key !== 'pos' && (
            <Button
              variant="contained"
              startIcon={<PointOfSaleRounded />}
              onClick={() => navigate('/pos')}
              sx={{ mr: 1, whiteSpace: 'nowrap' }}
            >
              New Sale
            </Button>
          )}

          <Tooltip title="Account">
            <IconButton
              onClick={event => setAnchorEl(event.currentTarget)}
              aria-label="Account menu"
              size="small"
            >
              <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: '0.9rem', fontWeight: 700 }}>
                {getInitials(user?.firstName, user?.lastName)}
              </Avatar>
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* Sidebar: drawer on phones, always visible on larger screens */}
      <Box component="aside" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        {isMobile ? (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            ModalProps={{ keepMounted: true }}
            sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' } }}
          >
            {sideNav}
          </Drawer>
        ) : (
          <Drawer
            variant="permanent"
            open
            sx={{
              '& .MuiDrawer-paper': {
                width: DRAWER_WIDTH,
                boxSizing: 'border-box',
                borderRight: 1,
                borderColor: 'divider',
              },
            }}
          >
            {sideNav}
          </Drawer>
        )}
      </Box>

      {/* Page content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          pb: { xs: `${BOTTOM_NAV_HEIGHT + 8}px`, md: 0 },
        }}
      >
        <Toolbar />
        <Box sx={{ flex: 1 }}>{children}</Box>
      </Box>

      {/* Phone bottom bar */}
      {isMobile && (
        <Paper
          className="app-bottom-nav"
          elevation={0}
          square
          sx={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: theme.zIndex.appBar,
            borderTop: 1,
            borderColor: 'divider',
            pb: 'env(safe-area-inset-bottom)',
          }}
        >
          <BottomNavigation
            showLabels
            value={bottomValue}
            onChange={(_event, value: string) => {
              if (value === 'menu') {
                setMobileOpen(true)
                return
              }
              const item = getItem(value)
              if (item) handleNavigate(item)
            }}
            sx={{ height: BOTTOM_NAV_HEIGHT }}
          >
            {bottomItems.map(item => {
              const Icon = item.icon
              return <BottomNavigationAction key={item.key} value={item.key} label={item.label} icon={<Icon />} />
            })}
            <BottomNavigationAction value="menu" label="Menu" icon={<MenuRounded />} />
          </BottomNavigation>
        </Paper>
      )}

      {/* Account menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{ paper: { sx: { minWidth: 220, mt: 1 } } }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2" fontWeight={700} noWrap>
            {fullName}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap display="block">
            {user?.email}
          </Typography>
        </Box>
        <Divider />
        <MenuItem onClick={handleProfile}>
          <ListItemIcon>
            <PersonRounded fontSize="small" />
          </ListItemIcon>
          My profile
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutRounded fontSize="small" />
          </ListItemIcon>
          Log out
        </MenuItem>
      </Menu>
    </Box>
  )
}
