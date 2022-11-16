import React, { Component } from 'react';
import { Dialog, DialogActions, DialogContent, DialogTitle } from '@material-ui/core';
import { Button } from '@material-ui/core';
import Mousetrap from 'mousetrap';
import PropTypes from 'prop-types';
import { NODE_ENV } from './env';

export class DebugMenu extends Component {
  constructor(props) {
    super(props);

    this.state = {
      open: false
    };
  }

  componentDidMount() {
    Mousetrap.bind('`', this.keyHandler = () => {
      this.toggle();
    });
  }

  componentWillUnmount() {
    Mousetrap.unbind('`', this.keyHandler);
  }

  open() {
    this.setState({ open: true });
  }

  close() {
    this.setState({ open: false });
  }

  toggle() {
    if (this.state.open) {
      this.close();
    } else {
      this.open();
    }
  }

  render() {
    const { open } = this.state;
    const { children } = this.props;

    // TODO: completely disable rendering of the debug menu in production releases?
    // if (NODE_ENV !== 'development') {
    //   return <div></div>;
    // }

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
          <Button onClick={() => this.close()} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    );
  }
}

DebugMenu.propTypes = {
  children: PropTypes.any
};
