import React, { forwardRef, useRef, useImperativeHandle, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import clsx from 'clsx';

import theme from '../../theme';
import { DEFAULT_PADDING, PATHWAY_TABLE_HEIGHT } from '../defaults';
import { EventEmitterProxy } from '../../../model/event-emitter-proxy';
import { NetworkEditorController } from './controller';
import { UpDownHBar, PValueStarRating } from './charts';

import { makeStyles } from '@material-ui/core/styles';

import { TableVirtuoso } from 'react-virtuoso';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel } from '@material-ui/core';
import { Checkbox, Paper, Typography, Link, Tooltip } from '@material-ui/core';
import { List, ListSubheader, ListItem, ListItemIcon, ListItemText } from '@material-ui/core';

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

const stableSort = (array, comparator) => {
  const stabilizedThis = array.map((el, index) => [el, index]);
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });
  return stabilizedThis.map((el) => el[0]);
};

const roundNES = (nes) => {
  return nes != null ? (Math.round(nes * Math.pow(10, 2)) / Math.pow(10, 2)) : 0;
};

const gotoNode = (id, cy) => {
  const eles = cy.nodes(`[id = "${id}"]`);

  cy.animate({
    fit: { eles: eles, padding: DEFAULT_PADDING },
    easing: 'ease-out',
    duration: 500
  });
};

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
          onClick={() => handleClick(row.id)}
        />
      </TableCell>
    {CELLS.map((cell, idx) => (
      <TableCell
        key={cell.id + '_' + index + '_' + idx}
        align={cell.numeric ? 'right' : 'left'}
        selected={selected}
        className={clsx(classes[cell.id + 'Cell'], { [classes.tableCell]: true, [classes.selectedCell]: selected })}
        onClick={() => handleClick(row.id)}
      >
      {cell.id === 'name' && (
        <Link
          href={row.href}
          disabled={row.href == null}
          variant="body2"
          color="textSecondary"
          className={classes.link}
          {...linkoutProps}
          title={row.id} // TODO REMOVE this!!! <<<<<<<<<<<<<<<<<<<<<<<<<<
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

const PathwayTable = (
  {
    visible,
    data,
    selectedIds = [],
    currentSelectedIndex = -1,
    scrollToId,
    searchTerms,
    controller,
    onTableSelectionChanged,
    onDataSorted,
  }
) => {
  const [order, setOrder] = useState('desc');
  const [orderBy, setOrderBy] = useState('nes');

  const classes = useStyles();
  const cy = controller.cy;
  
  const virtuosoRef = useRef();
  const sortedDataRef = useRef(stableSort(data, getComparator(order, orderBy)));
  const selNodesRef = useRef(null);
  const lastSelectedRowsRef = useRef([]); // Will be used to prevent the table from auto-scrolling to the clicked row

  // Sorting
  useEffect(() => {
    console.log('sortingData...');
    const comparator = getComparator(order, orderBy);
    const sortedData = stableSort(data, comparator);
    sortedDataRef.current = sortedData;
    if (onDataSorted) {
      onDataSorted(anyData => stableSort(anyData, comparator));
    }
  }, [order, orderBy]);
  // Selection
  useEffect(() => {
    const sel = cy.nodes(":childless:selected");
    selNodesRef.current = sel.length > 0 ? sel : null;
  }, []);
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
    if (currentSelectedIndex >= 0 && sortedDataRef.current) {
      const sortedSelectedIds = sortedDataRef.current.map(obj => obj.id).filter(id => selectedIds.includes(id));
      if (sortedSelectedIds.length > currentSelectedIndex) {
        gotoNode(sortedSelectedIds[currentSelectedIndex], cy);
      }
    }
  }, [currentSelectedIndex]);

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

  const handleRowClick = (id) => {
    console.log(id);
    let newSelectedIds = selectedIds ? selectedIds : [];

    if (selectedIds.includes(id)) {
      // Toggle: unselect this row/id
      newSelectedIds = newSelectedIds.filter(nextId => nextId !== id);
      lastSelectedRowsRef.current = [...newSelectedIds];
      cy.elements(`node[id = "${id}"]`).unselect();
    } else {
      // Add this id to the selection list
      newSelectedIds.push(id);
      lastSelectedRowsRef.current = [...newSelectedIds];
      if (onTableSelectionChanged) {
        onTableSelectionChanged(id);
      }
      cy.elements(`node[id = "${id}"]`).select();
    }
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
  let currentId = null;
  if (currentSelectedIndex >= 0 && selectedIds.length > currentSelectedIndex) {
    // Sort the array of selected Ids by the same order as the table rows so the passed index matches the current order
    const sortedSelectedIds = sortedDataRef.current.map(obj => obj.id).filter(id => selectedIds.includes(id));
    currentId = sortedSelectedIds[currentSelectedIndex];
  }
  // Find the "initial" index, which is where the table must auto-scroll to
  let initialIndex = 0;
  let initialId = scrollToId || currentId;
  const initialTopMostItemIndex = { index: 0, align: 'start' };
  if (!initialId && selectedIds.length > 0) {
    initialId = selectedIds[0];
  }
  if (initialId && sortedDataRef.current) {
    initialIndex = sortedDataRef.current.findIndex(obj => obj.id === initialId);
    if (initialIndex > 0) {
      // Small offset to show the previous row so the user can see that there are more rows above this one
      initialTopMostItemIndex.offset = -15;
    }
    initialTopMostItemIndex.index = initialIndex;
    console.log(initialTopMostItemIndex);
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
          <TableCell className={clsx(classes.checkCell, { [classes.tableCell]: true })} />
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
                  <Typography component="span" variant="body2" color="textSecondary">&nbsp;({ data.length })</Typography>
                )}
                </span>
              </Tooltip>
            </TableSortLabel>
          </TableCell>
        ))}
        </TableRow>
      )}
      itemContent={(index, obj) => (
        <ContentRow
          row={obj}
          index={index}
          selected={selectedIds && selectedIds.includes(obj.id)}
          current={currentId === obj.id}
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
  selectedIds: PropTypes.array,
  currentSelectedIndex: PropTypes.number,
  scrollToId: PropTypes.string,
  searchTerms: PropTypes.array,
  controller: PropTypes.instanceOf(NetworkEditorController).isRequired,
  onTableSelectionChanged: PropTypes.func,
  onDataSorted: PropTypes.func,
};

export default PathwayTable;