import React, { useRef, useState } from 'react';
import PropTypes from 'prop-types';

import theme from '../../theme';

import { makeStyles } from '@material-ui/core/styles';

import { Box, Button, Dialog, DialogContent, DialogTitle, IconButton, Typography } from "@material-ui/core";
import SearchBar from "material-ui-search-bar";

import CloseIcon from '@material-ui/icons/Close';


const useStyles = makeStyles((theme) => ({
  searchBar: {
    borderColor: theme.palette.divider,
    borderWidth: '1px',
    borderStyle: 'hidden hidden solid hidden',
    maxWidth: '500px',
  },
  content: {
    marginBottom: '20px',
  },
  emptyMessage: {
    color: theme.palette.text.disabled,
    textAlign: 'center',
  },
}));


export const SearchDialog = ({ open, onClose }) => {
  const [searchValue, setSearchValue] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [genes, setGenes] = useState(null);

  const searchValueRef = useRef(searchValue);
  searchValueRef.current = searchValue;

  const classes = useStyles();

  const cancelSearch = () => {
    setSearchValue('');
    setSearchResult(null);
  };
  const search = (val) => {
    const query = val.trim();
    
    if (val.length > 0) {
      // // Unselect Cy elements first
      // const selectedEles = cy.elements().filter(':selected');
      // selectedEles.unselect();
      // // Now execute the search
      // const res = controller.searchGenes(query);
      // setSearchValue(val);
      // setSearchResult(res);
    } else {
      cancelSearch();
    }
  };

  return (
    <Dialog open={open} maxWidth="sm" fullWidth>
      <DialogTitle>
        <SearchBar
          className={classes.searchBar}
          value={searchValue}
          onChange={search}
          onCancelSearch={cancelSearch}
        />
      </DialogTitle>
      <Box position="absolute" top={0} right={0}>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>
      <DialogContent className={classes.content}>
        <Typography className={classes.emptyMessage}>Search for genes and pathways...</Typography>
      </DialogContent>
    </Dialog>
  );
};

SearchDialog.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
};

export default SearchDialog;