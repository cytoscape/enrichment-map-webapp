import React from 'react';
import PropTypes from 'prop-types';

import { makeStyles } from '@material-ui/core/styles';

import { Toolbar, Divider, Drawer, MenuItem } from '@material-ui/core';
import { Button, Typography } from '@material-ui/core';

import KeyboardArrowUpIcon from '@material-ui/icons/KeyboardArrowUp';
import { AppLogoIcon } from '../svg-icons.js';
import { openPageLink } from '../util.js';


const useStyles = makeStyles((theme) => ({
  paper: {
    padding: theme.spacing(0.5, 2.5, 2, 2.5),
    borderRadius: '0 0 16px 16px',
    borderBottom: `1px solid ${theme.palette.divider}`,
    [theme.breakpoints.down('sm')]: {
      paddingLeft: theme.spacing(1),
      paddingRight: theme.spacing(1),
    },
  },
  toolbar: {
    marginBottom: theme.spacing(2),
  },
  logo: {
    marginLeft: theme.spacing(1.25),
    marginRight: theme.spacing(2),
    fontSize: 48,
    [theme.breakpoints.down('xs')]: {
      marginRight: theme.spacing(1),
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
  button: {
    minWidth: 36,
    width: 36,
    height: 36,
    marginRight: theme.spacing(1),
  },
  menuItem: {
    paddingLeft: theme.spacing(1.25),
    paddingRight: theme.spacing(1.25),
    borderRadius: '8px',
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
}));

export function MobileMenu({ menuDef, open, onClose }) {
  const classes = useStyles();

  const handleClick = (href, target) => {
    openPageLink(href, target);

    // setTimeout(() => window.location.href = href, 100);
    onClose();
  };

  return (
    <Drawer
      variant="temporary"
      anchor="top"
      open={open}
      onClose={onClose}
      classes={{ paper: classes.paper }}
    >
      <Toolbar variant="regular" className={classes.toolbar} disableGutters>
        <AppLogoIcon className={classes.logo} />
        <Typography variant="inherit" className={classes.title}>EnrichmentMap:RNA-Seq</Typography>
        <Divider orientation="vertical" flexItem variant="middle" className={classes.divider} />
        <Button className={classes.button} onClick={onClose}>
          <KeyboardArrowUpIcon fontSize="large" />
        </Button>
      </Toolbar>
    {menuDef.map((menu, idx) => (
      <MenuItem key={idx} onClick={() => handleClick(menu.href, menu.target)} className={classes.menuItem}>
        { menu.label }
      </MenuItem>
    ))}
    </Drawer>
  );
}
MobileMenu.propTypes = {
  menuDef: PropTypes.array.isRequired,
  open: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
};

export default MobileMenu;