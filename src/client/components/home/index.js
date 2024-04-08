import React from 'react';
import PropTypes from 'prop-types';
import theme from '../../theme';
import Content from './content';
import { ThemeProvider } from '@material-ui/core/styles';
import CssBaseline from '@material-ui/core/CssBaseline';
import { RecentNetworksController } from '../recent-networks-controller';


export function Home({ recentNetworksController }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Content recentNetworksController={recentNetworksController} />
    </ThemeProvider>
  );
}

Home.propTypes = {
  recentNetworksController: PropTypes.instanceOf(RecentNetworksController).isRequired,
};

export default Home;