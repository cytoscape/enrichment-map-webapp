import React, { useRef, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';

import theme from '../../theme';
import { PATHWAY_TABLE_HEIGHT } from '../defaults';
import { EventEmitterProxy } from '../../../model/event-emitter-proxy';
import { NetworkEditorController } from './controller';
import { NES_COLOR_RANGE } from './network-style';
import { UpDownHBar, PValueStarRating } from './charts';

import { makeStyles } from '@material-ui/core/styles';

import { TableVirtuoso } from 'react-virtuoso';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel } from '@material-ui/core';
import { Paper, Typography, Link, Tooltip } from '@material-ui/core';

import SadFaceIcon from '@material-ui/icons/SentimentVeryDissatisfied';


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
  noResultsLine: {
    marginTop: theme.spacing(1),
  },
  headerRow: {
    backgroundColor: theme.palette.background.default
  },
  nameCell: {
    width: '65%',
  },
  nesCell: {
    width: '20%',
  },
  pvalueCell: {
    width: '15%',
    maxWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
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
  { id: 'name',   numeric: false, disablePadding: false, label: 'Pathway' },
  { id: 'nes',    numeric: true,  disablePadding: false, label: 'NES',    tooltip: "Normalized Enrichment Score" },
  { id: 'pvalue', numeric: true,  disablePadding: false, label: 'P value' },
];

const CHART_HEIGHT = 16;

const TableComponents = {
  Scroller: React.forwardRef((props, ref) => <TableContainer component={Paper} {...props} ref={ref} />),
  Table: (props) => <Table size="small" {...props} style={{ borderCollapse: 'separate' }} />,
  TableHead: TableHead,
  TableRow: TableRow,
  TableBody: React.forwardRef((props, ref) => <TableBody {...props} ref={ref} />),
};
TableComponents.Scroller.displayName = "Scroller";   // for linting rule (debugging purposes)
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

const ContentRow = ({ row, index, selected, handleClick, controller }) => {
  const classes = useStyles();

  const roundNES = (nes) => {
    return nes != null ? (Math.round(nes * Math.pow(10, 2)) / Math.pow(10, 2)) : 0;
  };

  return (
    CELLS.map((cell, idx) => (
      <TableCell
        key={cell.id + '_' + index + '_' + idx}
        align={cell.numeric ? 'right' : 'left'}
        selected={selected}
        className={classes[cell.id + 'Cell']}
        onClick={(event) => handleClick(event, row.id)}
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
          upColor={NES_COLOR_RANGE.up}
          downColor={NES_COLOR_RANGE.down}
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
    ))
  );
};

const PathwayTable = ({ visible, data, initialSelectedId, searchTerms, controller }) => {
  const [order, setOrder] = useState('desc');
  const [orderBy, setOrderBy] = useState('nes');
  const [selectedId, setSelectedId] = React.useState(initialSelectedId);

  const classes = useStyles();
  
  const cy = controller.cy;
  const cyEmitter = new EventEmitterProxy(cy);
  const sortedDataRef = useRef(null);
  const virtuosoRef = useRef(null);
  const selNodeRef = useRef(null);

  const indexOf = (id) => {
    if (sortedDataRef.current) {
      const total = sortedDataRef.current.length;
      for (var i = 0; i < total; i++) {
        if (sortedDataRef.current[i].id === id) {
          return i;
        }
      }
    }
    return -1;
  };

  const scrollTo = (id) => {
    if (virtuosoRef.current) {
      const index = indexOf(id);
      if (index >= 0) {
        virtuosoRef.current.scrollToIndex({ index, align: 'start', behavior: 'smooth' });
      }
    }
  };

  const debouncedSelectionHandler = _.debounce(() => {
    const eles = cy.nodes(':selected');

    if (eles.length === 0) {
      setSelectedId(null);
    } else if (eles.length === 1 && eles[0].group() === 'nodes') {
      const id = eles[0].data('id');
      if (!selNodeRef.current || selNodeRef.current.data('id') != id) {
        setSelectedId(id);
        scrollTo(id);
      }
    }
  }, 200);

  const onCySelectionChanged = () => {
    debouncedSelectionHandler();
  };

  useEffect(() => {
    cyEmitter.on('select unselect', onCySelectionChanged);

    return function cleanup() {
      cyEmitter.removeAllListeners();
    };
  }, []);

  useEffect(() => {
    const sel = cy.nodes(':selected');
    selNodeRef.current = sel.length === 1 ? sel[0] : null;
  }, [selectedId]);

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

  const handleRowClick = (event, id) => {
    const newSelected = id === selectedId ? null/*toggle*/ : id;
    setSelectedId(newSelected);
    cy.elements().unselect(); // Unselect everything first
    if (newSelected) {
      cy.elements(`node[id = "${newSelected}"]`).select(); // Finally select the node
    }
  };

  const sortedData = stableSort(data, getComparator(order, orderBy));
  sortedDataRef.current = sortedData;

  const initialIndex = selectedId ? indexOf(selectedId) : 0;

  if (data.length === 0 && searchTerms && searchTerms.length > 0) {
    return (
      <Paper className={classes.noResultsBox}>
        <Typography component="p" color="textSecondary" className={classes.noResultsLine}>
          <SadFaceIcon style={{fontSize: '4em', opacity: 0.4}} />
        </Typography>
        <Typography component="p" variant="subtitle1" color="textSecondary" className={classes.noResultsLine} style={{fontSize: '1.5em', opacity: 0.4}}>
           No results found
        </Typography>
      </Paper>
    );
  }

  return (
    <TableVirtuoso
      ref={virtuosoRef}
      data={sortedData}
      initialTopMostItemIndex={{ index: initialIndex, align: 'start' }}
      style={{height: PATHWAY_TABLE_HEIGHT, border: `1px solid ${theme.palette.divider}`}}
      components={TableComponents}
      fixedHeaderContent={() => (
        <TableRow className={classes.headerRow}>
        {CELLS.map((cell) => (
          <TableCell
            key={cell.id}
            align="left"
            padding={cell.disablePadding ? 'none' : 'checkbox'}
            sortDirection={orderBy === cell.id ? order : false}
            className={classes[cell.id + 'Cell']}
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
          selected={selectedId === obj.id}
          controller={controller}
          handleClick={handleRowClick}
        />
      )}
    />
  );
};

ContentRow.propTypes = {
  row: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  selected: PropTypes.bool.isRequired,
  controller: PropTypes.instanceOf(NetworkEditorController).isRequired,
  handleClick: PropTypes.func.isRequired,
};
PathwayTable.propTypes = {
  visible: PropTypes.bool.isRequired,
  data: PropTypes.array.isRequired,
  initialSelectedId: PropTypes.string,
  searchTerms: PropTypes.array,
  controller: PropTypes.instanceOf(NetworkEditorController).isRequired,
};

export default PathwayTable;