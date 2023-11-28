import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import chroma from 'chroma-js';

import { HEADER_HEIGHT, RIGHT_DRAWER_WIDTH } from '../defaults';

import { makeStyles } from '@material-ui/core/styles';

import { Drawer, Button, IconButton, MenuItem, Toolbar, Tooltip, Typography } from '@material-ui/core';

import CloseIcon from '@material-ui/icons/Close';
import ArrowBackIcon from '@material-ui/icons/ArrowBack';


const useStyles = makeStyles((theme) => ({
  paper: {
    width: RIGHT_DRAWER_WIDTH,
    background: chroma(theme.palette.background.default).alpha(0.66).hex(),
    backdropFilter: 'blur(8px)',
    borderLeft: `1px solid ${theme.palette.divider}`,
  },
  header: {
    flex: '0 1 auto',
  },
  toolbar: {
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(0.5),
    minHeight: HEADER_HEIGHT,
  },
  content: {
    flex: '1 1 auto',
    overflowY: 'auto',
    borderColor: theme.palette.divider,
    borderWidth: '1px',
    borderStyle: 'solid solid hidden hidden',
    borderRadius: 4,
  },
  title: {
    paddingLeft: theme.spacing(0.5),
  },
  grow: {
    flexGrow: 1,
  },
  closeButton: {
    width: 41,
    height: 41,
  },
}));


const RightDrawer = ({ menu, open, onClose }) => {
  const [ menuStack, setMenuStack ] = useState([ menu ]);
  const classes = useStyles();

  useEffect(() => {
    if (!open) { // Reset to original state when menu is closed
      setMenuStack([ menu ]);
    }
  }, [open]);

  const goBack = () => {
    if (menuStack.length > 1) {
      menuStack.pop();
      setMenuStack([ ...menuStack ]);
    }
  };
  const goTo = (subMenu) => {
    if (subMenu) {
      menuStack.push(subMenu);
      setMenuStack([ ...menuStack ]);
    }
  };
  const handleClick = (fn, subMenu) => {
    if (subMenu) {
      goTo(subMenu);
    } else if (fn) {
      onClose();
      fn();
    }
  };

  const currentMenu = menuStack[menuStack.length - 1];
  
  return (
    <Drawer
      variant="temporary"
      anchor="right"
      open={open}
      classes={{
        paper: classes.paper,
      }}
    >
      <div className={classes.header}>
        <Toolbar variant="dense" className={classes.toolbar}>
          <IconButton className={classes.closeButton} onClick={onClose}>
            <CloseIcon />
          </IconButton>
          <div className={classes.grow} />
          <Typography display="block" variant="subtitle2" color="textPrimary" className={classes.title}>
          {menuStack.length > 1 && (
            <Tooltip title="Previous Menu">
              <Button
                size="small"
                startIcon={<ArrowBackIcon size="small" />}
                onClick={() => goBack()}
              >
                Back
              </Button>
            </Tooltip>
          )}
          </Typography>
        </Toolbar>
      </div>
      <div className={classes.content}>
      { currentMenu.map(({title, icon, onClick, subMenu}, idx) =>
        <MenuItem key={idx} onClick={() => handleClick(onClick, subMenu)}>
          <IconButton>{ icon }</IconButton>
          <p>{ title }</p>
        </MenuItem>
      )}
      </div>
    </Drawer>
  );
};

RightDrawer.propTypes = {
  menu: PropTypes.array.isRequired,
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default RightDrawer;