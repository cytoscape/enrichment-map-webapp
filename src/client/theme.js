import { createTheme } from '@mui/material/styles';

const _breakpoints = {
  values: {
    xs: 0,
    sm: 600,
    md: 960,  // MUI 4 value
    lg: 1280, // MUI 4 value
    xl: 1920, // MUI 4 value
  },
};

const _tooltipOverrides = {
  styleOverrides: {
    tooltip: {
      fontSize: "0.85em",
      maxWidth: 340,
    },
  },
};
const _touchRippleOverrides = {
  styleOverrides: {
    root: {
      display: 'none !important',
    },
  },
};

//==[ Light ]=========================================================================================================

export const lightTheme = createTheme({
  breakpoints: _breakpoints,
  palette: {
    mode: 'light',
    primary: {
      main: '#1f78b4',
      light: '#e9f2f8',
    },
    secondary: {
      main: '#1f78b4',
      light: '#e9f2f8',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
      field: '#ffffff',
      header: '#e6eaed',
      accent: '#f6faf5',
      network: '#ffffff',
    },
    action: {
      hover: 'rgba(31, 120, 180, 0.1)',
      selected: 'rgba(31, 120, 180, 0.2)',
    },
    table: {
      divider: 'rgba(0, 0, 0, 0.08)',
    },
    text: {
      secondary: 'rgba(0, 0, 0, 0.7)',
      accent: '#33a02c',
    },
  },
  typography: {
    fontFamily: 'Open Sans, Helvetica Neue, Helvetica, sans-serif',
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#e6eaed',
          backgroundImage: 'none',
        },
      },
    },
    MuiBackdrop: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(0, 0, 0, 0.25)',
          backdropFilter: 'blur(1px)',
        },
        invisible: {
          backgroundColor: 'transparent',
          backdropFilter: 'none',
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          color: '#1f78b4',
          textDecoration: 'none',
          "&:hover": {
            textDecoration: 'underline',
          },
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: 'rgba(0, 0, 0, 0.12)',
          },
        },
      },
    },
    MuiTooltip: _tooltipOverrides,
    MuiTouchRipple: _touchRippleOverrides,
  },
});

//==[ Dark ]==========================================================================================================

/*
 * See https://v4.mui.com/customization/palette/#dark-mode
 *
 * You can use these tools to customize the app's theme:
 *   https://colorffy.com/dark-theme-generator
 *   https://v4.mui.com/customization/color/#picking-colors
 */
export const darkTheme = createTheme({
  breakpoints: _breakpoints,
  palette: {
    mode: 'dark',
    primary: {
      main: '#1f78b4',
      light: '#a7c1de',
    },
    secondary: {
      main: '#1f78b4',
    },
    background: {
      default: '#121212',
      paper: '#242424',
      field: '#464646',
      header: '#242424',
      accent: 'rgba(45, 52, 43, 0.25)',
      network: '#e8e8e8',
    },
    action: {
      hover: 'rgba(167, 193, 222, 0.1)',
      selected: 'rgba(167, 193, 222, 0.2)',
    },
    divider: 'rgba(116, 116, 116, 0.4)',
    table: {
      divider: 'rgba(255, 255, 255, 0.08)',
    },
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255, 255, 255, 0.8)',
      disabled: 'rgba(255, 255, 255, 0.5)',
      accent: '#acd5a1',
    },
  },
  typography: {
    fontFamily: 'Open Sans, Helvetica Neue, Helvetica, sans-serif'
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#242424',
          backgroundImage: 'none',
        },
      },
    },
    MuiBackdrop: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(1px)',
        },
        invisible: {
          backdropFilter: 'none',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
          border: '1px solid rgba(116, 116, 116, 0.1)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paperAnchorTop: {
          background: 'rgba(18, 18, 18, 0.66)',
          backdropFilter: 'blur(8px)',
        },
        paperAnchorRight: {
          background: 'rgba(18, 18, 18, 0.66)',
          backdropFilter: 'blur(8px)',
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          color: '#6194c5',
          textDecoration: 'none',
          "&:hover": {
            textDecoration: 'underline',
          },
        },
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: {
          background: 'rgba(30, 30, 30, 0.8)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(116, 116, 116, 0.3)',
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        valueLabel: {
          color: 'rgba(102, 102, 102, 0.9)',
        },
      },
    },
    MuiSnackbarContent: {
      styleOverrides: {
        root: {
          backgroundColor: '#e5e5e5',
          border: '1px solid rgba(116, 116, 116, 0.4)',
        },
      },
    },
    // MuiSvgIcon: {
    //   styleOverrides: {
    //     colorPrimary: {
    //       color: '#e3e3e3 !important',
    //     },
    //     colorSecondary: {
    //       color: 'rgba(255, 255, 255, 0.7) !important',
    //     },
    //     colorDisabled: {
    //       color: 'rgba(255, 255, 255, 0.3) !important',
    //     },
    //   },
    // },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: 'rgba(167, 193, 222, 0.2)',
          },
        },
      },
    },
    MuiTooltip: _tooltipOverrides,
    MuiTouchRipple: _touchRippleOverrides,
  },
});

export function currentTheme() {
  // Check the user's OS/browser theme preference
  const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDarkMode ? darkTheme : lightTheme;
}