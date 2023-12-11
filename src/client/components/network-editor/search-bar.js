import React, { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';

import { makeStyles } from '@material-ui/core/styles';
import { InputBase, InputAdornment, IconButton } from '@material-ui/core';

import SearchIcon from '@material-ui/icons/Search';
import CloseIcon from '@material-ui/icons/Close';


const useStyles = makeStyles((theme) => ({
  search: {
    position: 'relative',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderRadius: theme.spacing(4),
    borderColor: theme.palette.divider,
    backgroundColor: theme.palette.background.mixed,
  },
  searchFocus: {
    outline: `2px solid ${theme.palette.primary.main} !important`,
  },
  inputRoot: {
    width: '100%',
    color: 'inherit',
    '&:disabled': {
      color: theme.palette.text.disabled,
    },
  },
  inputInput: {
    width: '100%',
    padding: theme.spacing(1, 1, 1, 2),
  },
  iconButtonRoot: {
    '&:hover': {
      backgroundColor: 'unset',
    },
  },
}));


const SearchBar = ({ value, placeholder, disabled, onChange, onCancelSearch, style }) => {
  const [ focused, setFocused ] = useState(false);
  
  const classes = useStyles();
  const inputRef = useRef();

  const handleChange = (event) => {
    const val = event.currentTarget.value;
    onChange && onChange(val);
  };
  const handleCancel = () => {
    onCancelSearch && onCancelSearch();
  };
  const handleFocus = () => {
    setFocused(true);
  };
  const handleBlur = () => {
    setFocused(false);
  };

  const focus = () => {
    inputRef.current.focus();
  };

  return (
    <div className={clsx(classes.search, { [classes.searchFocus]: focused })} style={style}>
      <InputBase
        inputRef={inputRef}
        classes={{root: classes.inputRoot, input: classes.inputInput}}
        inputProps={{'aria-label': 'search'}}
        disabled={Boolean(disabled)}
        placeholder={placeholder || "Search…"}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        endAdornment={
          <InputAdornment position="end">
            <IconButton
              classes={{root: classes.iconButtonRoot}}
              disabled={Boolean(disabled)}
              onClick={ value ? handleCancel : focus }
            >
              { value ? <CloseIcon /> : <SearchIcon /> }
            </IconButton>
          </InputAdornment>
        }
      />
    </div>
  );
};

SearchBar.propTypes = {
  value: PropTypes.string,
  placeholder: PropTypes.string,
  color: PropTypes.string,
  disabled: PropTypes.bool,
  onChange: PropTypes.func,
  onCancelSearch: PropTypes.func,
  style: PropTypes.object,
};

export default SearchBar;