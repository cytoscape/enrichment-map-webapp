import React from 'react';
// import PropTypes from 'prop-types';
import theme from '../../theme';
import Content from './content';
import { ThemeProvider, StyledEngineProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';


export function Home() {
  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Content />
      </ThemeProvider>
    </StyledEngineProvider>
  );
}

Home.propTypes = {
};

export default Home;