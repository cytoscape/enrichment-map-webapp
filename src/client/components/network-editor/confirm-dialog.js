import React from 'react';
import PropTypes from 'prop-types';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Typography } from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';

export function ConfirmDialog({ open, title, message, onConfirm, onCancel }) {
  return (
    <Dialog open={open} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <Box position="absolute" top={0} right={0}>
        <IconButton onClick={onCancel} size="large">
          <CloseIcon />
        </IconButton>
      </Box>
      <DialogContent>
        <Typography>{message}</Typography>
      </DialogContent>
      <DialogActions>
        <Button color="primary" variant="contained" onClick={onCancel}>
          Cancel
        </Button>
        <Button color="secondary" variant="contained" onClick={onConfirm}>
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
}
ConfirmDialog.propTypes = {
  open: PropTypes.bool,
  title: PropTypes.string,
  message: PropTypes.string,
  onConfirm: PropTypes.func,
  onCancel: PropTypes.func,
};
ConfirmDialog.defaultProps = {
  title: 'Title goes here',
  message: 'Message goes here',
  onConfirm: () => null,
  onCancel:  () => null,
};

export default ConfirmDialog;