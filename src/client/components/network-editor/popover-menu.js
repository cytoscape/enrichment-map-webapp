import React from 'react';
import PropTypes from 'prop-types';

import { MenuList, MenuItem, ListItemIcon, ListItemText, Popover } from '@material-ui/core';


export function PopoverMenu({ open, target, menu, onClose=() => null }) {
  return (
    <Popover
      id="menu-popover"
      anchorEl={target}
      open={open && Boolean(target)}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}
      onClose={onClose}
    >
      <MenuList>
      { menu.map(({ title, icon, disabled, onClick }, idx) =>
        <MenuItem key={idx} onClick={onClick} disabled={disabled}>
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