import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';

import { NetworkEditorController } from './controller';

import { makeStyles } from '@material-ui/core/styles';

import { Paper, InputBase, IconButton } from '@material-ui/core';
import SearchBar from "material-ui-search-bar";

import SearchIcon from '@material-ui/icons/Search';

const useStyles = makeStyles((theme) => ({
  root: {
    padding: '2px 4px',
    display: 'flex',
    alignItems: 'center',
  },
  input: {
    marginLeft: theme.spacing(1),
    flex: 1,
  },
  iconButton: {
    padding: 10,
  },
}));

export default function SearchField({ controller, onChange }) {
  const [value, setValue] = useState('');
  const classes = useStyles();

  const debouncedOnchange = _.debounce(query => {
    const res = controller.searchGenes(query);

    if (onChange) {
      onChange(res);
    }
  }, 500);

  const doSearch = val => {
    val = val.trim();

    // if (val.length > 0) {
    //   debouncedOnchange(val.trim());
    // }
  };

  const cancelSearch = () => {
    setValue('');
    doSearch(value);
  };

  return (
    <Paper component="form" className={classes.root}>
      <SearchBar
        autoFocus
        className={classes.input}
        value={value}
        onChange={val => doSearch(val)}
        onCancelSearch={() => cancelSearch()}
      />
      {/* <InputBase placeholder="Search"  autoFocus value={value} onChange={onInputChange} />
      <IconButton type="submit" className={classes.iconButton} aria-label="search">
        <SearchIcon />
      </IconButton> */}
    </Paper>
  );
}

SearchField.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController).isRequired,
  onChange: PropTypes.func,
};