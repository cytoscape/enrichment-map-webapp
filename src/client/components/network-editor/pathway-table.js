import React, { forwardRef, useRef, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';

import chroma from 'chroma-js';
import theme from '../../theme';
import { DEFAULT_PADDING, pathwayTableHeight } from '../defaults';
import { NetworkEditorController } from './controller';
import { UpDownHBar, PValueStarRating } from './charts';
import { REG_COLOR_RANGE } from './network-style';

import { makeStyles } from '@material-ui/core/styles';

import { TableVirtuoso } from 'react-virtuoso';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel } from '@material-ui/core';
import { IconButton, Paper, Typography, Link, Tooltip } from '@material-ui/core';
import { List, ListSubheader, ListItem, ListItemIcon, ListItemText } from '@material-ui/core';

import OpenInNewIcon from '@material-ui/icons/OpenInNew';
import SadFaceIcon from '@material-ui/icons/SentimentVeryDissatisfied';
import KeyboardReturnIcon from '@material-ui/icons/KeyboardReturn';
import { ClusterIcon } from '../svg-icons';


const useStyles = makeStyles((theme) => ({
  noResultsBox: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
    textAlign: 'center',
    width: '100%',
    overflowY: 'scroll',
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(2),
  },
  noResultsInfoBox: {
    width: '100%',
    maxWidth: 360,
    marginTop: theme.spacing(2),
    padding: theme.spacing(2),
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
  tableHeaderCell: {
    borderLeft: `1px solid transparent`,
    borderImage: `linear-gradient(to bottom, transparent 25%,${theme.palette.divider} 25%,${theme.palette.divider} 75%,transparent 75%)`,
    borderImageSlice: 5,
    cursor: 'default !important',
  },
  tableCell: {
    // --> WHATCH OUT! `padding[Top|Bottom]: 0` may cause a defect where the
    //     TableVirtuoso's initialTopMostItemIndex prop doesn't work
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: `${theme.spacing(0.5)}px !important`,
    paddingRight: theme.spacing(0.5),
    // <------------------------------------------------------------
    borderBottom: `1px solid ${theme.palette.background.default}`,
    cursor: 'pointer',
  },
  currentCell: {
    width: 4,
    paddingLeft: 0,
    paddingRight: 0,
  },
  currentRow: {
    backgroundColor: `${theme.palette.primary.main} !important`,
  },
  clusterCell: {
    paddingLeft: '1px !important',
    paddingRight: '1px !important',
    textAlign: 'center',
  },
  dbCell: {
    paddingLeft: '1px !important',
    paddingRight: '1px !important',
    textAlign: 'center',
  },
  nameCell: {
    width: '75%',
    maxWidth: 0,
    alignItems: 'center',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  },
  nesCell: {
    width: '25%',
    minWidth: 94,
    maxWidth: 288,
  },
  pvalueCell: {
    minWidth: 84,
    maxWidth: 86,
    paddingRight: `${theme.spacing(0.5)}px !important`,
  },
  selectedCell: {
    backgroundColor: theme.palette.action.selected,
  },
  clusterButton: {
    maxWidth: 20,
    maxHeight: 20,
  },
  clusterIcon: {
    verticalAlign: 'middle',
  },
  pathwayIcon: {
    verticalAlign: 'middle',
    fontSize: '1.25rem',
  },
  nameCellText: {
    alignItems: 'center',
    maxWidth: 'calc(100% - 20px)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    marginRight: 4,
    cursor: 'pointer',
  },
  link: {
    "&[disabled]": {
      color: theme.palette.text.secondary,
      cursor: "default",
      "&:hover": {
        textDecoration: "none"
      }
    }
  },
  openInNewIcon: {
    fontSize: '1rem',
  },
}));

const COLUMNS = [
  {
    id: 'cluster',
    numeric: false,
    hideOnMobile: false,
    label: <>&nbsp;</>,
    tooltip: 'Cluster',
    preventGotoNode: true,
    render: (row, col, classes, controller) => {
      const c = row.nes < 0 ? REG_COLOR_RANGE.downMax : REG_COLOR_RANGE.upMax;
      const color1 = chroma(c).luminance(0.6).hex();
      const color2 = chroma(c).luminance(0.2).hex();
      const tooltip = row.cluster;
      const node = controller.cy.nodes(`[id = "${row.id}"]`);
      const parentId = node.parent().data('id');
      return (
        row[col.id] ?
          <Tooltip title={tooltip}>
            <IconButton className={classes.clusterButton} onClick={() => gotoNode(parentId, controller.cy)}>
              <ClusterIcon fontSize="small" color1={color1} color2={color2} className={classes.clusterIcon} />
            </IconButton>
          </Tooltip>
          :
          ' '
      );
    }
  },
  {
    id: 'db',
    numeric: false,
    hideOnMobile: false,
    label: <>&nbsp;</>,
    tooltip: 'Database',
    render: (row, col, classes) => {
      return (
        <Tooltip title={row.db}>
          <span>
            { row.icon(classes.pathwayIcon) }
          </span>
        </Tooltip>
      );
    }
  },
  { 
    id: 'name',
    numeric: false,
    hideOnMobile: false,
    label: 'Pathway',
    render: (row, col, classes) => {
      return (
        <div style={{display: 'flex'}}>
          <div className={classes.nameCellText}>{ row[col.id] }</div>
        {row.href && (
          <Tooltip title={row.db}>
            <Link
              href={row.href}
              color="textSecondary"
              className={classes.link}
              {...linkoutProps}
            >
              <OpenInNewIcon className={classes.openInNewIcon} />
            </Link>
          </Tooltip>
        )}
        </div>
      );
    }
  },
  {
    id: 'nes',
    numeric: true, 
    hideOnMobile: false,
    label: 'NES',
    tooltip: "Normalized Enrichment Score",
    render: (row, col, classes, controller) => {
      const node = controller.cy.nodes(`[id = "${row.id}"]`);
      const nesColor = controller.style.getNodeColor(node);
      return (
        <UpDownHBar
          value={row[col.id]}
          minValue={-controller.style.magNES}
          maxValue={controller.style.magNES}
          color={nesColor}
          bgColor={theme.palette.background.default}
          height={CHART_HEIGHT}
          text={roundNES(row[col.id]).toFixed(2)}
        />
      );
    }
  },
  {
    id: 'pvalue',
    numeric: true,
    hideOnMobile: false,
    label: 'P value',
    tooltip: "BH-adjusted p-value",
    render: (row, col) => {
      return (
        <Tooltip title={row[col.id]}>
          <span>
            <PValueStarRating value={row[col.id]} />
          </span>
        </Tooltip>
      );
    }
  },
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
  // null values come last in ascending!
  if (a[orderBy] == null) {
    return -1;
  }
  if (b[orderBy] == null) {
    return 1;
  }
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

const ContentRow = ({ row, index, selected, current, controller, isMobile, handleClick }) => {
  const classes = useStyles();

  return (
    <>
      <TableCell
        align="center"
        selected={selected}
        className={clsx(classes.currentCell, { [classes.tableCell]: true, [classes.selectedCell]: selected, [classes.currentRow]: current })}
        onClick={() => handleClick(row)}
      />
    {COLUMNS.map((col, idx) => (
      (!isMobile || !col.hideOnMobile) && (
        <TableCell
          key={col.id + '_' + index + '_' + idx}
          align={col.numeric ? 'right' : 'left'}
          selected={selected}
          className={clsx(classes[col.id + 'Cell'], { [classes.tableCell]: true, [classes.selectedCell]: selected })}
          onClick={() => handleClick(row,  (col.preventGotoNode && row[col.id] != null) )}
        >
          { col.render(row, col, classes, controller) }
        </TableCell>
      )
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
  isMobile: PropTypes.bool,
  handleClick: PropTypes.func.isRequired,
};

//==[ PathwayTable ]==================================================================================================

const PathwayTable = (
  {
    visible,
    data,
    selectedRows = [],
    currentRow,
    gotoCurrentNode,
    scrollToId,
    searchTerms,
    controller,
    isMobile,
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
    onDataSort?.(anyData => stableSort(anyData, comparator));
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
    if (currentRow && gotoCurrentNode) {
      gotoNode(currentRow.id, cy);
    }
  }, [currentRow, gotoCurrentNode]);

  if (!visible) {
    // Returns an empty div with the same height as the table just so the open/close animation works properly,
    // but we don't want to spend resources to build an invisible table
    return <div style={{height: pathwayTableHeight()}} />;
  }

  const handleRequestSort = (event, property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const isRowSelected = (row) => {
    return selectedRows.findIndex(r => r.id === row.id) >= 0;
  };

  const handleRowClick = (row, preventGotoNode = false) => {
    let newSelectedRows = selectedRows;
    let selected = false;

    if (isRowSelected(row)) {
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

    onRowSelectionChange?.(row, selected, preventGotoNode);
  };

  if (data.length === 0 && searchTerms && searchTerms.length > 0) {
    return (
      <Paper className={classes.noResultsBox} style={{height: pathwayTableHeight()}}>
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
           No pathways found
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

  const totalRows = sortedDataRef.current.length;
  const totalSelectedRows = selectedRows.length;
  const allSelected = totalSelectedRows > 0 && totalSelectedRows === totalRows;
  const noneSelected = totalSelectedRows === 0;
  const someSelected = !noneSelected > 0 && !allSelected;

  // Find the "current" id
  let currentId = currentRow ? currentRow.id : null;
  // Find the "initial" index, which is where the table must auto-scroll to
  let initialIndex = 0;
  let initialId = scrollToId || currentId;
  const initialTopMostItemIndex = { index: 0, align: 'start' };
  if (!initialId && totalSelectedRows > 0) {
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
      style={{height: pathwayTableHeight(), border: `1px solid ${theme.palette.divider}`, background: theme.palette.background.paper}}
      components={TableComponents}
      fixedHeaderContent={() => (
        <TableRow className={classes.headerRow}>
          <TableCell className={clsx(classes.currentCell, { [classes.tableCell]: true })} style={{borderBottom: 'none'}}/>
        {COLUMNS.map((col) => (
          (!isMobile || !col.hideOnMobile) && (
            <Tooltip key={col.id} title={col.tooltip || ''}>
              <TableCell
                align="left"
                sortDirection={orderBy === col.id ? order : false}
                className={clsx(classes[col.id + 'Cell'], { [classes.tableCell]: true, [classes.tableHeaderCell]: true })}
              >
                <TableSortLabel 
                  active={orderBy === col.id}
                  direction={orderBy === col.id ? order : 'asc'}
                  onClick={(event) => handleRequestSort(event, col.id)}
                >
                      { col.label }
                    {col.id === 'name' && data && (
                      <Typography component="span" variant="body2" color="textSecondary">
                        &nbsp;({totalSelectedRows > 0 ? 
                          (allSelected ? 'all' : totalSelectedRows) + ' selected of '
                          :
                        ''}{ data.length })
                      </Typography>
                    )}
                </TableSortLabel>
              </TableCell>
            </Tooltip>
          )
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
  gotoCurrentNode: PropTypes.bool,
  scrollToId: PropTypes.string,
  searchTerms: PropTypes.array,
  controller: PropTypes.instanceOf(NetworkEditorController).isRequired,
  isMobile: PropTypes.bool,
  onRowSelectionChange: PropTypes.func,
  onDataSort: PropTypes.func,
};

export default PathwayTable;