import React from 'react';
import PropTypes from 'prop-types';

import { makeStyles } from '@material-ui/core/styles';

import { AppBar, Toolbar, MenuItem } from '@material-ui/core';
import { Container, Divider } from '@material-ui/core';
import { Button, Typography } from '@material-ui/core';

import MenuIcon from '@material-ui/icons/Menu';
import { AppLogoIcon } from '../svg-icons';


const useHeaderStyles = makeStyles(theme => ({
  appBar: {
    boxShadow: 'none',
  },
  toolbar: {
    borderBottom: `1px solid ${theme.palette.divider}`,
    [theme.breakpoints.down('sm')]: {
      paddingLeft: theme.spacing(1.5),
      paddingRight: theme.spacing(1.5),
    },
  },
  logo: {
    fontSize: 48,
    [theme.breakpoints.down('xs')]: {
      fontSize: 36,
    },
  },
  title: {
    fontSize: '1.5em',
    fontWeight: 'bold',
    flexGrow: 1,
    [theme.breakpoints.down('xs')]: {
      fontSize: '1.25em',
      textOverflow: 'ellipsis',
      overflow: 'hidden',
      textWrap: 'nowrap',
    },
  },
  menuItem: {
    borderRadius: 8,
  },
  menuButton: {
    minWidth: 36,
    width: 36,
    height: 36,
  },
  divider: {
    marginLeft: theme.spacing(1),
    marginRight: theme.spacing(1),
    width: 0,
    [theme.breakpoints.down('xs')]: {
      marginLeft: theme.spacing(0.5),
      marginRight: theme.spacing(0.5),
    },
  },
  unrelatedDivider: {
    marginLeft: theme.spacing(4),
    marginRight: theme.spacing(4),
    width: 0,
    [theme.breakpoints.down('xs')]: {
      marginLeft: theme.spacing(2),
      marginRight: theme.spacing(2),
    },
  },
}));

export function Header({ menuDef, showRecentNetworks, mobile, tablet, onClickGetStarted, onOpenMobileMenu }) {
  const classes = useHeaderStyles();

  const handleClick = (href) => {
    window.location.href = href;
  };

  const ToolbarDivider = ({ unrelated }) => {
    return <Divider orientation="vertical" flexItem variant="middle" className={unrelated ? classes.unrelatedDivider : classes.divider} />;
  };
  ToolbarDivider.propTypes = {
    unrelated: PropTypes.bool
  };

  return (
    <AppBar position="static" color="transparent" className={classes.appBar}>
      <Container maxWidth="lg" disableGutters>
        <Toolbar variant="regular" className={classes.toolbar}>
          <AppLogoIcon className={classes.logo} />
          <ToolbarDivider />
          <Typography variant="inherit" className={classes.title}>EnrichmentMap:RNA-Seq</Typography>
        {!mobile && !tablet && menuDef.map((menu, idx) => (
          <MenuItem key={idx} className={classes.menuItem} onClick={() => handleClick(menu.href)}>
            { menu.label }
          </MenuItem>
        ))}
        {showRecentNetworks && !mobile && (
          <>
            <ToolbarDivider />
            <Button
              variant="contained"
              color="primary"
              size="small"
              onClick={onClickGetStarted}
            >
              Get Started
            </Button>
          </>
        )}
        {(mobile || tablet) && (
          <>
            <ToolbarDivider />
            <Button className={classes.menuButton} onClick={onOpenMobileMenu}>
              <MenuIcon />
            </Button>
          </>
        )}
        </Toolbar>
      </Container>
    </AppBar>
  );
}
Header.propTypes = {
  menuDef: PropTypes.array.isRequired,
  showRecentNetworks: PropTypes.bool,
  mobile: PropTypes.bool,
  tablet: PropTypes.bool,
  onClickGetStarted: PropTypes.func,
  onOpenMobileMenu: PropTypes.func,
};

export default Header;