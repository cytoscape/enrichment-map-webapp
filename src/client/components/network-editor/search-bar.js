import React, { useRef } from 'react';
import PropTypes from 'prop-types';

import { alpha, makeStyles } from '@material-ui/core/styles';
import { InputBase, InputAdornment, IconButton } from '@material-ui/core';

import SearchIcon from '@material-ui/icons/Search';
import CloseIcon from '@material-ui/icons/Close';


const useStyles = makeStyles((theme) => ({
  search: {
    position: 'relative',
    marginLeft: 0,
    marginRight: 0,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderRadius: theme.spacing(4),
    borderColor: theme.palette.divider,
    backgroundColor: theme.palette.background.paper,
    '&:hover': {
      backgroundColor: alpha(theme.palette.secondary.main, 0.1),
    },
  },
  inputRoot: {
    width: '100%',
    color: 'inherit',
    '&:disabled': {
      color: theme.palette.text.disabled,
    }
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
  // const [searchValue, setSearchValue] = useState(value || '');
  const classes = useStyles();
  const inputRef = useRef();

  const handleChange = (event) => {
    const val = event.currentTarget.value;
    // setSearchValue(val);
    onChange && onChange(val);
  };

  const handleCancel = () => {
    onCancelSearch && onCancelSearch();
  };

  const focus = () => {
    inputRef.current.focus();
  };

  return (
    <div className={classes.search} style={style}>
      <InputBase
        inputRef={inputRef}
        classes={{root: classes.inputRoot, input: classes.inputInput}}
        inputProps={{'aria-label': 'search'}}
        disabled={Boolean(disabled)}
        placeholder={placeholder || "Search…"}
        value={value}
        onChange={handleChange}
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