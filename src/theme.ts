import { createTheme, alpha } from '@mui/material/styles'

/**
 * App theme.
 *
 * Tuned for people who are not comfortable with software: slightly larger
 * text, 44px touch targets, calm surfaces with thin borders instead of heavy
 * shadows, and no shouting uppercase buttons.
 *
 * The primary blue is kept at #1976d2 because a few pages and charts still
 * hard-code that value.
 */

const PRIMARY = '#1976d2'
const BORDER = '#e3e8ef'
const SURFACE = '#f4f6fa'

export const theme = createTheme({
  palette: {
    primary: {
      main: PRIMARY,
      light: '#5aa0e6',
      dark: '#125ca8',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#00897b',
      light: '#4ebaaa',
      dark: '#005b4f',
      contrastText: '#ffffff',
    },
    success: {
      main: '#2e7d32',
      light: '#4caf50',
      dark: '#1b5e20',
    },
    warning: {
      main: '#ed6c02',
      light: '#ff9800',
      dark: '#e65100',
    },
    error: {
      main: '#d32f2f',
      light: '#ef5350',
      dark: '#c62828',
    },
    info: {
      main: '#0288d1',
      light: '#03a9f4',
      dark: '#01579b',
    },
    background: {
      default: SURFACE,
      paper: '#ffffff',
    },
    text: {
      primary: '#1f2933',
      secondary: '#5f6b7a',
    },
    divider: BORDER,
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: 15,
    h1: { fontSize: '2.25rem', fontWeight: 700, lineHeight: 1.2 },
    h2: { fontSize: '1.9rem', fontWeight: 700, lineHeight: 1.25 },
    h3: { fontSize: '1.6rem', fontWeight: 700, lineHeight: 1.3 },
    // Pages use h4 as their title.
    h4: { fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.3 },
    h5: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.35 },
    h6: { fontSize: '1.05rem', fontWeight: 600, lineHeight: 1.4 },
    subtitle1: { fontWeight: 600 },
    body1: { fontSize: '1rem', lineHeight: 1.55 },
    body2: { fontSize: '0.9rem', lineHeight: 1.5 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: SURFACE,
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 10,
          minHeight: 42,
          padding: '8px 18px',
        },
        sizeSmall: {
          minHeight: 34,
          padding: '4px 12px',
        },
        sizeLarge: {
          minHeight: 50,
          padding: '12px 24px',
          fontSize: '1.05rem',
        },
        contained: {
          '&:hover': {
            boxShadow: `0 4px 12px ${alpha(PRIMARY, 0.25)}`,
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 12,
        },
        elevation1: {
          boxShadow: '0 1px 2px rgba(16, 24, 40, 0.06), 0 1px 3px rgba(16, 24, 40, 0.1)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          border: `1px solid ${BORDER}`,
          boxShadow: 'none',
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: 20,
          '&:last-child': { paddingBottom: 20 },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: '#ffffff',
        },
        notchedOutline: {
          borderColor: BORDER,
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: 'none',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${BORDER}`,
          padding: '12px 16px',
        },
        head: {
          fontWeight: 700,
          fontSize: '0.8rem',
          color: '#5f6b7a',
          backgroundColor: '#f7f9fc',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: '#f7f9fc',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontWeight: 700,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          minHeight: 46,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 46,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          fontSize: '0.8rem',
          borderRadius: 8,
        },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          minWidth: 0,
          '&.Mui-selected': {
            fontWeight: 700,
          },
        },
        label: {
          fontSize: '0.72rem',
          '&.Mui-selected': {
            fontSize: '0.75rem',
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: alpha(PRIMARY, 0.1),
          },
        },
      },
    },
  },
})
