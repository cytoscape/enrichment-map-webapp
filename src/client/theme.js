import { createTheme }  from '@material-ui/core/styles';


const theme = createTheme({
  palette: {
    type: 'dark',
    primary: {
      main: '#1E68D8',
    },
    secondary: {
      main: 'rgba(255, 255, 255, 0.7)',
    },
    background: {
      default: '#121212',
      paper: '#1E1E1E',
      focus: '#080808',
    },
    error: {
      main: '#db4f4f',
    },
    divider: 'rgba(116, 116, 116, 0.3)',
    success: {
      main: '#2FBD52',
    },
    warning: {
      main: '#FFC400',
    },
    text: {
      primary: '#E9E9E9',
    },
    link: {
      main: '#aadafa',
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
    MuiDialog: {
      root: {
        backdropFilter: 'blur(0.5px)',
      },
      paper: {
        border: '1px solid rgba(116, 116, 116, 0.1)',
      },
    },
    MuiSlider: {
      valueLabel: {
        color: 'rgba(102, 102, 102, 0.9)',
      },
    },
    MuiSvgIcon: {
      colorPrimary: {
        color: '#E9E9E9 !important',
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