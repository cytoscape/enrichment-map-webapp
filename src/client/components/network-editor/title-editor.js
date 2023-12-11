import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { styled } from '@material-ui/core/styles';
import { NetworkEditorController } from './controller';
import { Tooltip, InputBase } from '@material-ui/core';


function renameNetwork(controller, newName) {
  const networkName = newName != null ? newName.trim() : null;
  controller.cy.data({ name: networkName });

  fetch(`/api/${controller.networkIDStr}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ networkName })
  });
}


/**
 * The network title editor. Shows and edits the attribute `cy.data('name')`.
 * - **ENTER** key or `blur()`: Commits the changes and renames the network.
 * - **ESCAPE** key: Cancels the changes and shows the previous network name again.
 */
export function TitleEditor({ controller, disabled }) {
  const [ networkName, setNetworkName ] = useState(() => controller.cy.data('name'));

  useEffect(() => {
    const onDataChanged = event => setNetworkName(event.cy.data('name')); 
    controller.cy.on('data', onDataChanged);
    return () => controller.cy.removeListener('data', onDataChanged);
  }, []);

  let input;

  const handleNetworkNameKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      input.blur();
    } else if (event.key === 'Escape') {
      setNetworkName(controller.cy.data('name'));
      event.preventDefault();
    }
  };

  const handleNetworkNameFocus = () => {
    // Using the uncontrolled input approach here
    if (!networkName)
      input.value = '';
    else
      input.select();
  };

  const handleNetworkNameBlur = () => {
    const newName = input.value;
    if (newName !== networkName) {
      renameNetwork(controller, newName);
    }
  };

  const CssInputBase = styled(InputBase)(({ theme }) => ({
    '& .MuiInputBase-input': {
      position: 'relative',
      border: '1px solid transparent',
      borderRadius: 5,
      width: '100%',
      minWidth: 240,
      maxWidth: 640,
      padding: 2,
      fontWeight: 'bold',
      [theme.breakpoints.down('sm')]: {
        textAlign: 'center',
        minWidth: 140,
      },
      [theme.breakpoints.up('sm')]: {
        textAlign: 'left',
      },
      '&:hover': {
        border: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.hover,
        '&[disabled]': {
          border: '1px solid transparent !important',
        },
      },
      '&:focus': {
        outline: `2px solid ${theme.palette.primary.main} !important`,
        backgroundColor: theme.palette.background.mixed,
        fontWeight: 'normal',
      },
    },
  }));

  return (
    <Tooltip
      arrow
      placement="bottom"
      title="Rename Figure"
      disableHoverListener={disabled}
      disableTouchListener={disabled}
    >
      <CssInputBase
        fullWidth={true}
        defaultValue={networkName || 'Untitled Network'}
        disabled={disabled}
        onFocus={handleNetworkNameFocus}
        onBlur={handleNetworkNameBlur}
        onKeyDown={handleNetworkNameKeyDown}
        inputRef={ref => (input = ref)}
      />
    </Tooltip>
  );
}

TitleEditor.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController).isRequired,
  disabled: PropTypes.bool,
};

export default TitleEditor;