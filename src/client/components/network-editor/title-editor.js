import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

import { styled } from '@mui/material/styles';
import { NetworkEditorController } from './controller';
import { Tooltip, InputBase } from '@mui/material';


const CssInputBase = styled(InputBase)(({ theme }) => ({
  '& .MuiInputBase-input': {
    position: 'relative',
    border: '1px solid transparent',
    borderRadius: 8,
    width: '100%',
    maxWidth: 640,
    padding: theme.spacing(1),
    fontWeight: 'bold',
    '&:hover': {
      border: `1px solid ${theme.palette.divider}`,
      backgroundColor: theme.palette.background.field,
      '&[disabled]': {
        border: '1px solid transparent !important',
      },
    },
    '&:focus': {
      outline: `2px solid ${theme.palette.primary.main} !important`,
      backgroundColor: theme.palette.background.field,
      fontWeight: 'normal',
    },
  },
}));

/**
 * The network title editor. Shows and edits the attribute `cy.data('name')`.
 * - **ENTER** key or `blur()`: Commits the changes and renames the network.
 * - **ESCAPE** key: Cancels the changes and shows the previous network name again.
 */
export function TitleEditor({ controller, disabled }) {
  const [ value, setValue ] = useState(() => controller.cy.data('name'));

  const inputRef = useRef();
  const cancelledRef = useRef(false);

  useEffect(() => {
    const onDataChanged = event => setValue(event.cy.data('name')); 
    controller.cy.on('data', onDataChanged);
    return () => controller.cy.removeListener('data', onDataChanged);
  }, []);

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      cancelledRef.current = false;
      event.preventDefault();
      inputRef.current.blur();
    } else if (event.key === 'Escape') {
      cancelledRef.current = true;
      event.preventDefault();
      inputRef.current.blur();
    }
  };

  const handleChange = (event) => {
    const val = event.currentTarget.value;
    setValue(val);
  };

  const handleFocus = () => {
    if (value)
      inputRef.current.select();
  };

  const handleBlur = (event) => {
    const oldName = controller.cy.data('name');
    const newName = event.currentTarget.value.trim();
    if (!cancelledRef.current && newName.length > 0 && newName !== oldName) {
      controller.renameNetwork(newName);
    } else {
      setValue(controller.cy.data('name'));
    }
  };

  return (
    <Tooltip
      placement="bottom"
      title="Rename Figure"
      disableHoverListener={disabled}
      disableTouchListener={disabled}
    >
      <CssInputBase
        inputRef={inputRef}
        fullWidth={true}
        value={value || ''}
        placeholder="Untitled Network"
        disabled={disabled}
        onKeyDown={handleKeyDown}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    </Tooltip>
  );
}

TitleEditor.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController).isRequired,
  disabled: PropTypes.bool,
};

export default TitleEditor;