import React from 'react';
import PropTypes from 'prop-types';

import makeStyles from '@mui/styles/makeStyles';
import { MenuList, MenuItem, ListItemIcon, ListItemText, Popover } from '@mui/material';


const useStyles = makeStyles(() => ({
  root: {
    // Disable Text Selection:
    WebkitTouchCallout: 'none', /* iOS Safari */
    WebkitUserSelect: 'none', /* Safari */
    MozUserSelect: 'none', /* Firefox */
    msUserSelect: 'none', /* Internet Explorer/Edge */
    userSelect: 'none', /* Non-prefixed version (Chrome and Opera) */
    // -----------------------
  },
}));

export function PopoverMenu({ open, target, menu, onClose=() => null }) {
  const classes = useStyles();

  const handleClick = (fn) => {
    onClose();
    fn?.();
  };

  return (
    <Popover
      id="menu-popover"
      anchorEl={target}
      className={classes.root}
      open={open && Boolean(target)}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}
      onClose={onClose}
    >
      <MenuList>
      { menu.map(({ title, icon, disabled, onClick }, idx) =>
        <MenuItem key={idx} onClick={() => handleClick(onClick)} disabled={disabled}>
          <ListItemIcon>{ icon }</ListItemIcon>
          <ListItemText>{ title }</ListItemText>
        </MenuItem>
      )}
      </MenuList>
    </Popover>
  );
}
PopoverMenu.propTypes = {
  open: PropTypes.bool.isRequired,
  target: PropTypes.any.isRequired,
  menu: PropTypes.array.isRequired,
  onClose: PropTypes.func,
};

export default PopoverMenu;