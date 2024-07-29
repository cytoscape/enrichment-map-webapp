import React from 'react';
import PropTypes from 'prop-types';

import makeStyles from '@mui/styles/makeStyles';

import { Container, Grid, Divider, Toolbar } from '@mui/material';



const useStyles = makeStyles(theme => ({
  root: {
    marginTop: 0,
  },
  toolbar: {
    marginTop: theme.spacing(2),
    color: theme.palette.text.secondary,
  },
  copyright: {
    [theme.breakpoints.down('md')]: {
      textAlign: 'center',
      marginBottom: theme.spacing(8),
    },
  },
  logoBar: {
    paddingLeft: theme.spacing(15),
    [theme.breakpoints.down('md')]: {
      paddingLeft: 0,
    },
  },
}));

export function Footer({ mobile, tablet }) {
  const classes = useStyles();

  return (
    <Container maxWidth="lg" disableGutters className={classes.root}>
      <Divider />
      <Toolbar variant="regular" className={classes.toolbar}>
        <Grid
          container
          direction={mobile || tablet ? 'column' : 'row'}
          alignItems={mobile || tablet ? 'center' : 'flex-start'}
          justifyContent={mobile || tablet ? 'space-around' : 'center'}
        >
          <Grid item md={4} sm={12} className={classes.copyright}>
            &copy; {new Date().getFullYear()} University of Toronto
          </Grid>
          <Grid item md={8} sm={12}>
            {/* <Grid
              container
              direction={mobile ? 'column' : 'row'}
              alignItems={mobile ? 'center' : 'flex-start'}
              justifyContent={mobile || tablet ? 'space-between' : 'flex-end'}
              spacing={mobile ? 2 : 10}
              className={classes.logoBar}
            >
            
            </Grid> */}
          </Grid>
        </Grid>
      </Toolbar>
    </Container>
  );
}
Footer.propTypes = {
  mobile: PropTypes.bool,
  tablet: PropTypes.bool,
};

export default Footer;