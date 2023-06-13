import React, { useReducer, useEffect } from 'react';
import { Dialog, DialogActions, DialogContent, DialogTitle, Button } from '@material-ui/core';
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
      <DialogContent>
        {children}
      </DialogContent>
      <DialogActions>
        <Button onClick={toggle} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

DebugMenu.propTypes = {
  children: PropTypes.any
};
