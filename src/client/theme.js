import { createTheme }  from '@material-ui/core/styles';

/*
 * See https://v4.mui.com/customization/palette/#dark-mode
 *
 * You can use these tools to customize the app's theme:
 *   https://colorffy.com/dark-theme-generator
 *   https://v4.mui.com/customization/color/#picking-colors
 */
const theme = createTheme({
  palette: {
    type: 'dark',
    primary: {
      main: '#1F78B4',
      light: '#A7C1DE',
    },
    secondary: {
      main: 'rgba(255, 255, 255, 0.75)',
    },
    background: {
      default: '#121212',
      paper: '#242424',
      field: '#363636',
      accent: 'rgba(45, 52, 43, 0.25)',
      hover: '#43464b',
    },
    action: {
      hover: 'rgba(167, 193, 222, 0.1)',
      selected: 'rgba(167, 193, 222, 0.2)',
    },
    divider: 'rgba(116, 116, 116, 0.3)',
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
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255, 255, 255, 0.8)',
      disabled: 'rgba(255, 255, 255, 0.5)',
      accent: '#ACD5A1',
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
        color: '#6194C5',
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
        color: '#E3E3E3 !important',
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

export default theme;