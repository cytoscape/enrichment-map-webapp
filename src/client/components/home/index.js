import React from 'react';
// import PropTypes from 'prop-types';
import theme from '../../theme';
import Content from './content';
import { ThemeProvider } from '@material-ui/core/styles';
import CssBaseline from '@material-ui/core/CssBaseline';


export function Home() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Content />
    </ThemeProvider>
  );
}

Home.propTypes = {
};

export default Home;