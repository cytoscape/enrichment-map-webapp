import { createTheme }  from '@material-ui/core/styles';


export const lightTheme = createTheme({
  palette: {
    type: 'light',
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
    },
    action: {
      hover: 'rgba(31, 120, 180, 0.1)',
      selected: 'rgba(31, 120, 180, 0.2)',
    },
    error: {
      main: '#d23434',
      light: '#fbebeb',
      dark: '#932424',
    },
    info: {
      main: '#358cbf',
      light: '#ebf4f9',
      dark: '#256286',
    },
    success: {
      main: '#47aa41',
      light: '#edf7ec',
      dark: '#32772e',
    },
    warning: {
      main: '#e9a735',
      light: '#fdf6eb',
      dark: '#a37525',
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
    fontFamily: 'Open Sans, Helvetica Neue, Helvetica, sans-serif'
  },
  props: {
    MuiAppBar: {
      color: 'transparent',
    },
    MuiSlider: {
      color: 'secondary',
    },
    props: {
      MuiButtonBase: {
        disableRipple: true // no more ripple, on the whole application
      }
    },
  },
  overrides: {
    MuiTouchRipple:{
      root: {
        display: 'none !important',
      },
    },
    MuiTooltip: {
      tooltip: {
        fontSize: "0.85em",
        maxWidth: 340,
      },
    },
    MuiPopover: {
      paper: {
        backdropFilter: 'blur(8px)',
      },
    },
    MuiBackdrop: {
      root: {
        backdropFilter: 'blur(1px)',
      },
    },
    MuiLink: {
      root: {
        color: '#1f78b4',
      },
    },
  },
});

/*
 * See https://v4.mui.com/customization/palette/#dark-mode
 *
 * You can use these tools to customize the app's theme:
 *   https://colorffy.com/dark-theme-generator
 *   https://v4.mui.com/customization/color/#picking-colors
 */
export const darkTheme = createTheme({
  palette: {
    type: 'dark',
    primary: {
      main: '#1f78b4',
      light: '#A7c1de',
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
    },
    action: {
      hover: 'rgba(167, 193, 222, 0.1)',
      selected: 'rgba(167, 193, 222, 0.2)',
    },
    divider: 'rgba(116, 116, 116, 0.4)',
    error: {
      main: '#ef5350',
    },
    info: {
      main: '#42a5f5',
    },
    success: {
      main: '#66bb6a',
    },
    warning: {
      main: '#ffb74d',
    },
    table: {
      divider: 'rgba(255, 255, 255, 0.08)',
    },
    text: {
      primary: '#f5f5f5',
      secondary: 'rgba(255, 255, 255, 0.8)',
      disabled: 'rgba(255, 255, 255, 0.5)',
      accent: '#Acd5a1',
    },
  },
  typography: {
    fontFamily: 'Open Sans, Helvetica Neue, Helvetica, sans-serif'
  },
  props: {
    MuiAppBar: {
      color: 'transparent',
    },
    MuiSlider: {
      color: 'secondary',
    },
    props: {
      MuiButtonBase: {
        disableRipple: true // no more ripple, on the whole application
      }
    },
  },
  overrides: {
    MuiTouchRipple:{
      root: {
        display: 'none !important',
      },
    },
    MuiTooltip: {
      tooltip: {
        fontSize: "0.85em",
        maxWidth: 340,
      },
    },
    MuiPopover: {
      paper: {
        background: 'rgba(30, 30, 30, 0.8)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(116, 116, 116, 0.3)',
      },
    },
    MuiBackdrop: {
      root: {
        backdropFilter: 'blur(1px)',
      },
    },
    MuiDialog: {
      paper: {
        border: '1px solid rgba(116, 116, 116, 0.1)',
      },
    },
    MuiLink: {
      root: {
        color: '#6194c5',
      },
    },
    MuiSlider: {
      valueLabel: {
        color: 'rgba(102, 102, 102, 0.9)',
      },
    },
    MuiToggleButton: {
      root: {
        '&.Mui-selected': {
          backgroundColor: 'rgba(167, 193, 222, 0.2)',
        },
      },
    },
    MuiSvgIcon: {
      colorPrimary: {
        color: '#e3e3e3 !important',
      },
      colorSecondary: {
        color: 'rgba(255, 255, 255, 0.7) !important',
      },
      colorDisabled: {
        color: 'rgba(255, 255, 255, 0.3) !important',
      },
    },
  },
});

export function currentTheme() {
  // Check the user's OS/browser theme preference
  const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDarkMode ? darkTheme : lightTheme;
}