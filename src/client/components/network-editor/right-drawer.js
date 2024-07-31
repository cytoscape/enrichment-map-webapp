import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';

import { HEADER_HEIGHT, RIGHT_DRAWER_WIDTH } from '../defaults';

import makeStyles from '@mui/styles/makeStyles';
import Grow from '@mui/material/Grow';
import Slide from '@mui/material/Slide';

import { Drawer, Button, IconButton, MenuItem, Toolbar, Tooltip, Typography } from '@mui/material';

import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckIcon from '@mui/icons-material/Check';


const useStyles = makeStyles((theme) => ({
  paper: {
    width: RIGHT_DRAWER_WIDTH,
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
  checkIcon: {
    color: theme.palette.primary.main,
  },
}));


const RightDrawer = ({ menu, open, onClose }) => {
  const [ menuStack, setMenuStack ] = useState([ menu ]);
  const [ forward, setForward ] = useState(true);
  const [ exit, setExit ] = useState(false);
  const [ animatedSelect, setAnimatedSelect ] = useState({});

  const exitedRef = useRef(true); // Will indicate whether or not the slide transition has exited
  const forwardSubMenu = useRef(null); // Save the next sub-menu to be rendered after exiting the transition
  const goForwardRef = useRef(null);
  const goBackwardRef = useRef(null);
  
  const classes = useStyles();

  useEffect(() => {
    if (open) { // Reset to original state when the menu is reopened...
      setMenuStack([ menu ]);
    }
  }, [open]);

  const goBackward = () => {
    if (exitedRef.current) {
      // The transition has already exited, so it can enter again...
      if (menuStack.length > 1) {
        setExit(false); // Reset this flag
        setForward(false);
        menuStack.pop();
        setMenuStack([ ...menuStack ]);
      }
    } else {
      // The transition has not exited yet, so just force it to exit first...
      goBackwardRef.current = goBackward; // ...but save the next function to be called on the exited event
      goForwardRef.current = null;
      forwardSubMenu.current = null;
      setExit(true);
    }
  };
  const goForward = (subMenu) => {
    if (exitedRef.current) {
      // The transition has already exited, so it can enter again...
      if (subMenu) {
        setExit(false); // Reset this flag
        setForward(true);
        menuStack.push(subMenu);
        setMenuStack([ ...menuStack ]);
      }
    } else {
      // The transition has not exited yet, so just force it to exit first...
      goBackwardRef.current = null;
      goForwardRef.current = goForward; // ...but save the next function to be called on the exited event
      forwardSubMenu.current = subMenu; // ...and the next sub-menu
      setExit(true);
    }
  };
  const handleClick = (title, fn, subMenu, isSelected) => {
    if (isSelected != null) {
      setAnimatedSelect({ title, selected: !isSelected() });
      fn();
      setTimeout(() => {
        // Give some time for the user to see the menu selection animation before closing the menu...
        onClose();
      }, 250);
    } else {
      setAnimatedSelect({});
      if (subMenu) {
        goForward(subMenu);
      } else if (fn) {
        onClose();
        fn();
      }
    }
  };

  // The transition must always exit before it enters again,
  // so we need to use this 'exitedRef' flag to trigger an 'exited' event before another 'entered'.
  const onEntered = () => {
    exitedRef.current = false;
  };
  const onExited = () => {
    // Make sure this is set to true before calling the next function
    exitedRef.current = true;
    // Now the next function can be executed and the transition can run (enter) again
    goBackwardRef.current?.();
    goForwardRef.current?.(forwardSubMenu.current);
  };

  const currentMenu = menuStack[menuStack.length - 1];
  const hasToggle = currentMenu.some(el => el.isSelected != null);
  
  return (
    <Drawer
      variant="temporary"
      anchor="right"
      open={open}
      onClose={onClose}
      classes={{
        paper: classes.paper,
      }}
    >
      <div className={classes.header}>
        <Toolbar variant="dense" className={classes.toolbar}>
          <IconButton
            color="inherit"
            size="large"
            className={classes.closeButton}
            onClick={onClose}
          >
            <CloseIcon />
          </IconButton>
          <div className={classes.grow} />
          <Typography display="block" variant="subtitle2" color="textPrimary" className={classes.title}>
          {menuStack.length > 1 && (
            <Tooltip title="Previous Menu">
              <Button
                size="small"
                startIcon={<ArrowBackIcon size="small" />}
                onClick={() => goBackward()}
              >
                Back
              </Button>
            </Tooltip>
          )}
          </Typography>
        </Toolbar>
      </div>
      <Slide
        in={!exit}
        direction={forward ? 'left' : 'right'}
        timeout={{ enter: (exit ? 0 : 250) }} // To look like we turned off the animation when just exiting the transition
        onEntered={onEntered}
        onExited={onExited}
      >
        <div className={classes.content}>
        {currentMenu.map(({title, icon, onClick, subMenu, isSelected}, idx) =>
          <MenuItem key={idx} onClick={() => handleClick(title, onClick, subMenu, isSelected)}>
          {animatedSelect.title === title && (
            <Grow in={animatedSelect.selected} timeout={250}>
              <CheckIcon className={classes.checkIcon} />
            </Grow>
          )}
          {animatedSelect.title !== title && hasToggle && (
            isSelected?.() ? <CheckIcon className={classes.checkIcon} /> : <span style={{width: 24}} />
          )}
            <IconButton color="inherit" size="large">{ icon }</IconButton>
            <p>{ title }</p>
          </MenuItem>
        )}
        </div>
      </Slide>
    </Drawer>
  );
};

RightDrawer.propTypes = {
  menu: PropTypes.array.isRequired,
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default RightDrawer;