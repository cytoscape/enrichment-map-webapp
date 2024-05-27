import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import Content from './content';
import { ThemeProvider } from '@material-ui/core/styles';
import CssBaseline from '@material-ui/core/CssBaseline';
import { currentTheme } from '../../theme';
import { RecentNetworksController } from '../recent-networks-controller';


export function Home({ recentNetworksController }) {
  const [ theme, setTheme ] = useState(currentTheme);

  useEffect(() => {
    // Listen for changes in the user's theme preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleThemeChange = () => setTheme(currentTheme());
    mediaQuery.addEventListener('change', handleThemeChange);
    return () => {
      mediaQuery.removeEventListener('change', handleThemeChange);
    };
  }, []);

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