import React, { forwardRef, useRef, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import clsx from 'clsx';

import theme from '../../theme';
import { DEFAULT_PADDING, PATHWAY_TABLE_HEIGHT } from '../defaults';
import { NetworkEditorController } from './controller';
import { UpDownHBar, PValueStarRating } from './charts';

import { makeStyles } from '@material-ui/core/styles';

import { TableVirtuoso } from 'react-virtuoso';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel } from '@material-ui/core';
import { IconButton, Checkbox, Paper, Typography, Link, Tooltip } from '@material-ui/core';
import { List, ListSubheader, ListItem, ListItemIcon, ListItemText } from '@material-ui/core';

import UnselectAllIcon from '@material-ui/icons/IndeterminateCheckBox';
import SadFaceIcon from '@material-ui/icons/SentimentVeryDissatisfied';
import KeyboardReturnIcon from '@material-ui/icons/KeyboardReturn';


const useStyles = makeStyles((theme) => ({
  noResultsBox: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: '100%',
    height: PATHWAY_TABLE_HEIGHT,
    padding: theme.spacing(2),
    textAlign: 'center',
  },
  noResultsInfoBox: {
    width: '100%',
    maxWidth: 360,
    marginTop: theme.spacing(2),
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.default,
    borderRadius: 16,
  },
  noResultsLine: {
    marginTop: theme.spacing(1),
  },
  noResultsSubheader: {
    lineHeight: '1.25em',
    textAlign: 'left',
    marginBottom: theme.spacing(2),
    color: theme.palette.text.disabled,
  },
  noResultsItem: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  noResultsItemIcon: {
    minWidth: 'unset',
  },
  noResultsItemIconIcon: {
    transform: 'scaleX(-1)',
    fontSize: '1em',
    marginRight: theme.spacing(1),
    color: theme.palette.text.disabled,
    opacity: 0.5,
  },
  noResultsItemText: {
    margin: 0,
    color: theme.palette.text.disabled,
  },
  headerRow: {
    height: 40,
    backgroundColor: theme.palette.background.default,
  },
  tableCell: {
    // --> WHATCH OUT! `padding: 0` may cause a defect where the
    //     TableVirtuoso's initialTopMostItemIndex prop doesn't work
    padding: theme.spacing(0, 0.5, 0, 0.5),
    // <------------------------------------------------------------
  },
  checkCell: {
    maxWidth: 48,
  },
  currentRow: {
    padding: theme.spacing(0, 0.5, 0, 0),
    borderLeft: `${theme.spacing(0.5)}px solid ${theme.palette.primary.main}`,
  },
  nameCell: {
    width: '75%',
    maxWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  nesCell: {
    width: '25%',
    minWidth: 94,
    maxWidth: 288,
  },
  pvalueCell: {
    minWidth: 94,
    maxWidth: 94,
  },
  selectedCell: {
    backgroundColor: theme.palette.action.selected,
  },
  unselectAllButton: {
    maxWidth: 32,
    maxHeight: 32,
  },
  unselectAllIcon: {
    fontSize: '1.25rem',
  },
  checkbox: {
    minWidth: 32,
    padding: theme.spacing(0.5),
    margin: '0 auto 0 auto',
  },
  link: {
    color: theme.palette.link.main,
    "&[disabled]": {
      color: theme.palette.text.secondary,
      cursor: "default",
      "&:hover": {
        textDecoration: "none"
      }
    }
  },
}));

const CELLS = [
  { id: 'name',   numeric: false, label: 'Pathway' },
  { id: 'nes',    numeric: true,  label: 'NES',    tooltip: "Normalized Enrichment Score" },
  { id: 'pvalue', numeric: true,  label: 'P value' },
];

const CHART_HEIGHT = 16;

const TableComponents = {
  Scroller: forwardRef((props, ref) => <TableContainer component={Paper} {...props} ref={ref} />),
  Table: (props) => <Table size="small" {...props} style={{ borderCollapse: 'separate' }} />,
  TableHead: TableHead,
  TableRow: forwardRef((props, ref) => <TableRow {...props} hover ref={ref} />),
  TableBody: forwardRef((props, ref) => <TableBody {...props} ref={ref} />),
};
TableComponents.Scroller.displayName = "Scroller";   // for linting rule (debugging purposes)
TableComponents.TableRow.displayName = "TableRow"; // for linting rule (debugging purposes)
TableComponents.TableBody.displayName = "TableBody"; // for linting rule (debugging purposes)

const linkoutProps = { target: "_blank",  rel: "noreferrer", underline: "hover" };

const DEF_ORDER = 'desc';
const DEF_ORDER_BY = 'nes';

const descendingComparator = (a, b, orderBy) => {
  if (b[orderBy] < a[orderBy]) {
    return -1;
  }
  if (b[orderBy] > a[orderBy]) {
    return 1;
  }
  return 0;
};

const getComparator = (order, orderBy) => {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
};

const stableSort = (rows, comparator) => {
  const stabilizedThis = rows.map((el, index) => [el, index]);
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });
  return stabilizedThis.map((el) => el[0]);
};

export const DEF_SORT_FN = (rows) => stableSort(rows, getComparator(DEF_ORDER, DEF_ORDER_BY));

const roundNES = (nes) => {
  return nes != null ? (Math.round(nes * Math.pow(10, 2)) / Math.pow(10, 2)) : 0;
};

const gotoNode = (id, cy) => {
  const eles = cy.nodes(`[id = "${id}"]`);
  cy.animate({
    fit: { eles: eles, padding: DEFAULT_PADDING },
    easing: 'ease-out',
    duration: 250
  });
};

//==[ ContentRow ]====================================================================================================

const ContentRow = ({ row, index, selected, current, controller, handleClick }) => {
  const classes = useStyles();

  const node = controller.cy.nodes(`[id = "${row.id}"]`);
  const nesColor = controller.style.getNodeColor(node);

  return (
    <>
      <TableCell
        align="center"
        selected={selected}
        className={clsx(classes.checkCell, { [classes.tableCell]: true, [classes.selectedCell]: selected, [classes.currentRow]: current })}
      >
        <Checkbox
          checked={selected}
          size="small"
          className={classes.checkbox}
          onClick={() => handleClick(row)}
        />
      </TableCell>
    {CELLS.map((cell, idx) => (
      <TableCell
        key={cell.id + '_' + index + '_' + idx}
        align={cell.numeric ? 'right' : 'left'}
        selected={selected}
        className={clsx(classes[cell.id + 'Cell'], { [classes.tableCell]: true, [classes.selectedCell]: selected })}
        onClick={() => handleClick(row)}
      >
      {cell.id === 'name' && (
        <Link
          href={row.href}
          disabled={row.href == null}
          variant="body2"
          color="textSecondary"
          className={classes.link}
          {...linkoutProps}
        >
          { row[cell.id] }
        </Link>
      )}
      {cell.id === 'nes' && (
        <UpDownHBar
          value={row[cell.id]}
          minValue={-controller.style.magNES}
          maxValue={controller.style.magNES}
          color={nesColor}
          bgColor={theme.palette.background.focus}
          height={CHART_HEIGHT}
          text={roundNES(row[cell.id]).toFixed(2)}
        />
      )}
      {cell.id === 'pvalue' && (
        <Tooltip title={row[cell.id]}>
          <span>
            <PValueStarRating value={row[cell.id]} />
          </span>
        </Tooltip>
      )}
      </TableCell>
    ))}
    </>
  );
};
ContentRow.propTypes = {
  row: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  selected: PropTypes.bool,
  current: PropTypes.bool,
  controller: PropTypes.instanceOf(NetworkEditorController).isRequired,
  handleClick: PropTypes.func.isRequired,
};

//==[ PathwayTable ]==================================================================================================

const PathwayTable = (
  {
    visible,
    data,
    selectedRows = [],
    currentRow,
    scrollToId,
    searchTerms,
    controller,
    onRowSelectionChange,
    onDataSort,
  }
) => {
  const [order, setOrder] = useState(DEF_ORDER);
  const [orderBy, setOrderBy] = useState(DEF_ORDER_BY);

  const classes = useStyles();
  const cy = controller.cy;
  
  const virtuosoRef = useRef();
  const sortedDataRef = useRef();
  sortedDataRef.current = stableSort(data, getComparator(order, orderBy));
  const selectedRowsRef = useRef(selectedRows); // Will be used to prevent the table from auto-scrolling to the clicked row

  // Sorting
  useEffect(() => {
    const comparator = getComparator(order, orderBy);
    const sortedData = stableSort(data, comparator);
    sortedDataRef.current = sortedData;
    if (onDataSort) {
      onDataSort(anyData => stableSort(anyData, comparator));
    }
  }, [order, orderBy]);
  // Scroll to
  useEffect(() => {
    if (scrollToId && virtuosoRef.current) {
      const index = sortedDataRef.current.findIndex(obj => obj.id === scrollToId);
      const offset = index > 0 ? -15 : 0; // So the user can see that there are more rows above this one
      virtuosoRef.current.scrollToIndex({ index, align: 'start', offset });
    }
  }, [scrollToId]);
  // Current item
  useEffect(() => {
    if (currentRow) {
      gotoNode(currentRow.id, cy);
    }
  }, [currentRow]);

  if (!visible) {
    // Returns an empty div with the same height as the table just so the open/close animation works properly,
    // but we don't want to spend resources to build an invisible table
    return <div style={{height: PATHWAY_TABLE_HEIGHT}} />;
  }

  const handleRequestSort = (event, property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleRowClick = (row) => {
    let newSelectedRows = selectedRows;
    let selected = false;

    if (selectedRows.findIndex(r => r.id === row.id) >= 0) {
      // Toggle: unselect this row/id
      newSelectedRows = newSelectedRows.filter(r => r.id !== row.id);
      selectedRowsRef.current = [...newSelectedRows];
    } else {
      // Add this id to the selection list
      newSelectedRows.push(row);
      newSelectedRows = stableSort(data, getComparator(order, orderBy)); // Don't forget to sort it again!
      selectedRowsRef.current = [...newSelectedRows];
      selected = true;
    }
    if (onRowSelectionChange) {
      onRowSelectionChange(row, selected);
    }
  };

  const handleUnselectAllClick = () => {
    selectedRows.forEach(row => {
      handleRowClick(row);
    });
  };

  if (data.length === 0 && searchTerms && searchTerms.length > 0) {
    return (
      <Paper className={classes.noResultsBox}>
        <Typography component="p" color="textSecondary" className={classes.noResultsLine}>
          <SadFaceIcon style={{fontSize: '4em', opacity: 0.4}} />
        </Typography>
        <Typography
          component="p"
          variant="subtitle1"
          color="textSecondary"
          className={classes.noResultsLine}
          style={{fontSize: '1.5em', opacity: 0.4}}
        >
           No results found
        </Typography>
        <Paper variant="outlined" className={classes.noResultsInfoBox}>
          <List
            dense
            subheader={
              <ListSubheader className={classes.noResultsSubheader}>
                The pathway you are looking for:
              </ListSubheader>
            }
          >
            <ListItem className={classes.noResultsItem}>
              <ListItemIcon className={classes.noResultsItemIcon}>
                <KeyboardReturnIcon className={classes.noResultsItemIconIcon} />
              </ListItemIcon>
              <ListItemText className={classes.noResultsItemText} primary="is not in our database" />
            </ListItem>
            <ListItem className={classes.noResultsItem}>
              <ListItemIcon className={classes.noResultsItemIcon}>
                <KeyboardReturnIcon className={classes.noResultsItemIconIcon} />
              </ListItemIcon>
              <ListItemText className={classes.noResultsItemText} primary="or it has not been enriched" />
            </ListItem>
          </List>
        </Paper>
      </Paper>
    );
  }

  // Find the "current" id
  let currentId = currentRow ? currentRow.id : null;
  // Find the "initial" index, which is where the table must auto-scroll to
  let initialIndex = 0;
  let initialId = scrollToId || currentId;
  const initialTopMostItemIndex = { index: 0, align: 'start' };
  if (!initialId && selectedRows.length > 0) {
    initialId = selectedRows[0].id;
  }
  if (initialId && sortedDataRef.current) {
    initialIndex = sortedDataRef.current.findIndex(obj => obj.id === initialId);
    if (initialIndex > 0) {
      // Small offset to show the previous row so the user can see that there are more rows above this one
      initialTopMostItemIndex.offset = -15;
    }
    initialTopMostItemIndex.index = initialIndex;
  }

  return (
    <TableVirtuoso
      ref={virtuosoRef}
      data={sortedDataRef.current}
      initialTopMostItemIndex={initialTopMostItemIndex}
      style={{height: PATHWAY_TABLE_HEIGHT, border: `1px solid ${theme.palette.divider}`}}
      components={TableComponents}
      fixedHeaderContent={() => (
        <TableRow className={classes.headerRow}>
          <TableCell className={clsx(classes.checkCell, { [classes.tableCell]: true })}>
            <Tooltip title="Unselect All">
              <span>
                <IconButton
                  disabled={selectedRows.length === 0}
                  color="secondary"
                  className={classes.unselectAllButton}
                  onClick={handleUnselectAllClick}
                >
                  <UnselectAllIcon className={classes.unselectAllIcon} />
                </IconButton>
              </span>
            </Tooltip>
          </TableCell>
        {CELLS.map((cell) => (
          <TableCell
            key={cell.id}
            align="left"
            sortDirection={orderBy === cell.id ? order : false}
            className={clsx(classes[cell.id + 'Cell'], { [classes.tableCell]: true })}
          >
            <TableSortLabel
              active={orderBy === cell.id}
              direction={orderBy === cell.id ? order : 'asc'}
              onClick={(event) => handleRequestSort(event, cell.id)}
            >
              <Tooltip title={cell.tooltip ? cell.tooltip : ''}>
                <span>
                  { cell.label }
                {cell.id === 'name' && data && (
                  <Typography component="span" variant="body2" color="textSecondary">
                    &nbsp;({selectedRows.length > 0 ? selectedRows.length + ' selected of ' : ''}{ data.length })
                  </Typography>
                )}
                </span>
              </Tooltip>
            </TableSortLabel>
          </TableCell>
        ))}
        </TableRow>
      )}
      itemContent={(index, row) => (
        <ContentRow
          row={row}
          index={index}
          selected={selectedRows.findIndex(r => r.id === row.id) >= 0}
          current={currentRow && currentRow.id === row.id}
          controller={controller}
          handleClick={handleRowClick}
        />
      )}
    />
  );
};
PathwayTable.displayName = "PathwayTable"; // for linting rule (debugging purposes)
PathwayTable.propTypes = {
  visible: PropTypes.bool.isRequired,
  data: PropTypes.array.isRequired,
  selectedRows: PropTypes.array,
  currentRow: PropTypes.object,
  scrollToId: PropTypes.string,
  searchTerms: PropTypes.array,
  controller: PropTypes.instanceOf(NetworkEditorController).isRequired,
  onRowSelectionChange: PropTypes.func,
  onDataSort: PropTypes.func,
};

export default PathwayTable;