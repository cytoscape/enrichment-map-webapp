import React, { useReducer, useEffect } from 'react';
import { Dialog, DialogActions, DialogContent, DialogTitle, Button } from '@mui/material';
import Mousetrap from 'mousetrap';
import PropTypes from 'prop-types';


export function DebugMenu({ children }) {

  const [ open, toggle ] = useReducer(x => !x, false);

  useEffect(() => {
    Mousetrap.bind('`', toggle);
    return () => Mousetrap.unbind('`', toggle);
  }, []); 

  return (
    <Dialog
      open={open}
      onClose={() => {}}
    >
      <DialogTitle>Debug Menu</DialogTitle>
      <DialogContent dividers>
        {children}
      </DialogContent>
      <DialogActions>
        <Button onClick={toggle} color="primary" variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

DebugMenu.propTypes = {
  children: PropTypes.any
};
