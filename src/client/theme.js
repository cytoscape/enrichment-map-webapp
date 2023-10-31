import { createTheme }  from '@material-ui/core/styles';

const theme = createTheme({
  palette: {
    type: 'dark',
    primary: {
      main: '#1E68D8',
    },
    secondary: {
      main: '#B4B4B4',
    },
    background: {
      default: '#121212',
      paper: '#1E1E1E',
      focus: '#080808',
    },
    error: {
      main: '#db4f4f',
    },
    divider: '#3A393A',
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
    MuiTooltip: {
        tooltip: {
            fontSize: "0.85em",
            maxWidth: 340,
        },
    },
  },
});

export default theme;