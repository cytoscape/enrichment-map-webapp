import React, { useRef, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';

import theme from '../../theme';
import { DEFAULT_PADDING, PATHWAY_TABLE_HEIGHT } from '../defaults';
import { EventEmitterProxy } from '../../../model/event-emitter-proxy';
import { NetworkEditorController } from './controller';

import { makeStyles } from '@material-ui/core/styles';

import { TableVirtuoso } from 'react-virtuoso';
import { Collapse, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel } from '@material-ui/core';
import { Paper, Typography, Link } from '@material-ui/core';
import { IconButton, Tooltip  } from '@material-ui/core';

import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@material-ui/icons/KeyboardArrowRight';
import RemoveIcon from '@material-ui/icons/Remove';


const useStyles = makeStyles((theme) => ({
  headerRow: {
    backgroundColor: theme.palette.background.default
  },
  row: {
    '& > *': {
      borderBottom: 'unset',
    },
  },
  collapsibleCell: {
    paddingLeft: theme.spacing(4),
    paddingRight: theme.spacing(1),
    paddingTop: 0,
    paddingBottom: 0,
  },
  collapseWrapper: {
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
  },
  nameHeaderCell: {
    width: '60%',
  },
  nesHeaderCell: {
    width: '30%',
  },
  pvalueHeaderCell: {
    width: '10%',
  },
  firstCell: {
    verticalAlign: 'top',
  },
  lastCell: {
    verticalAlign: 'top',
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
  removeButton: {
    width: 22,
    height: 22,
    borderRadius: 4,
    border: '1px solid',
    verticalAlign: 'middle',
    "&[disabled]": {
      color: 'transparent',
    },
  },
}));

const CELLS = [
  { id: 'name',   numeric: false, disablePadding: false, label: 'Name' },
  { id: 'nes',    numeric: true,  disablePadding: false, label: 'NES' },
  { id: 'pvalue', numeric: true,  disablePadding: false, label: 'P value' },
];

const TableComponents = {
  Scroller: React.forwardRef((props, ref) => <TableContainer component={Paper} {...props} ref={ref} />),
  Table: (props) => <Table {...props} style={{ borderCollapse: 'separate' }} />,
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

const cellLength = Object.keys(CELLS[0]).length ;

const ContentRow = ({ row, index, selected, handleClick, handleRemove }) => {
  const [open, setOpen] = useState(false);
  const classes = useStyles();

  return (
    <TableCell key={'details_' + index} colSpan={cellLength + 2} padding="checkbox">
      <Table size="small">
        <TableBody>
          <TableRow hover selected={selected} className={classes.row}>
            <TableCell align="center" padding="none" className={classes.firstCell}>
              <IconButton aria-label="expand row" size="small" onClick={() => setOpen(!open)}>
                { open ?  <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon /> }
              </IconButton>
            </TableCell>
          {CELLS.map((cell, idx) => (
              <TableCell
                key={row[cell.id] + '_' + (index + 1)}
                align={cell.numeric ? 'right' : 'left'}
                padding="none"
                className={classes[cell.id + 'HeaderCell']}
                onClick={(event) => handleClick(event, row.id)}
              >
              {cell.id === 'name' && row.href ? (
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
              ) : (
                row[cell.id]
              )}
              </TableCell>
            ))
          }
            <TableCell align="right" padding="none">
              <Tooltip title="Remove Pathway">
                <span>
                  <IconButton
                    aria-label="remove pathway"
                    color="primary"
                    size="small"
                    disabled={!row.added}
                    className={classes.removeButton}
                    onClick={() => handleRemove(row.id)}
                  >
                    <RemoveIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </TableCell>
          </TableRow>
          <TableRow className={classes.row}>
            <TableCell colSpan={cellLength + 2} className={classes.collapsibleCell}>
              <Collapse in={open} timeout="auto" unmountOnExit className={classes.collapseWrapper}>
              {row.cluster && row.pathways && row.pathways.length > 0 && (
                <div>
                  <Typography component="span" variant="subtitle2" gutterBottom>Pathways ({ row.pathways.length }):</Typography>
                  <ul>
                  {row.pathways.map((p, idx) => (
                    <li key={"pathway_" + index + "-" + idx}>
                      <Typography component="span" variant="body2" color="secondary" gutterBottom>
                        <Link
                          href={p.href}
                          disabled={p.href == null}
                          variant="body2"
                          color="textSecondary"
                          className={classes.link}
                          {...linkoutProps}
                        >
                          { p.name }
                        </Link>
                      </Typography>
                    </li>
                  ))}
                  </ul>
                </div>
              )}
              {row.genes && row.genes.length > 0 && (
                <div>
                  <Typography component="span" variant="subtitle2" gutterBottom>Genes ({ row.genes.length }):</Typography>
                  &nbsp;&nbsp;
                  <Typography component="span" variant="body2" color="textSecondary" gutterBottom>{ row.genes.join(', ') }</Typography>
                </div>
              )}
              </Collapse>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableCell>
  );
};

const PathwayTable = ({ visible, data, initialSelectedId, controller }) => {
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('calories');
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

  const handleRemoveRow = async (nodeId) => {
    const node = cy.nodes(`[id = '${nodeId}']`);
    if (!node) { return; }
    // Fit network on node to be removed
    await cy.animate({ fit: { eles: node, padding: DEFAULT_PADDING }, duration: 500 });
    // Animation - node disappears
    var ani = node.animation({
      style: {
        'background-opacity': 0,
        'label': '',
        'width': 0
      },
      duration: 250,
    });
    node.unselect();
    ani.play().promise().then(async () => {
      // Remove node
      node.remove();
      // Apply layout again
      controller.applyLayout();
    });
  };

  const sortedData = stableSort(data, getComparator(order, orderBy));
  sortedDataRef.current = sortedData;

  const initialIndex = selectedId ? indexOf(selectedId) : 0;

  return (
    <TableVirtuoso
      ref={virtuosoRef}
      data={sortedData}
      initialTopMostItemIndex={{ index: initialIndex, align: 'start' }}
      style={{height: PATHWAY_TABLE_HEIGHT, border: `1px solid ${theme.palette.divider}`}}
      components={TableComponents}
      fixedHeaderContent={() => (
        <TableRow className={classes.headerRow}>
          <TableCell />
        {CELLS.map((cell) => (
          <TableCell
            key={cell.id}
            align="left"
            padding={cell.disablePadding ? 'none' : 'checkbox'}
            sortDirection={orderBy === cell.id ? order : false}
            className={classes[cell.id + 'HeaderCell']}
          >
            <TableSortLabel
              active={orderBy === cell.id}
              direction={orderBy === cell.id ? order : 'asc'}
              onClick={(event) => handleRequestSort(event, cell.id)}
            >
              { cell.label }
            </TableSortLabel>
          </TableCell>
        ))}
          <TableCell />
        </TableRow>
      )}
      itemContent={(index, obj) => (
        <ContentRow row={obj} index={index} selected={selectedId === obj.id} handleClick={handleRowClick} handleRemove={handleRemoveRow} />
      )}
    />
  );
};

ContentRow.propTypes = {
  row: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  selected: PropTypes.bool.isRequired,
  handleClick: PropTypes.func.isRequired,
  handleRemove: PropTypes.func.isRequired,
};
PathwayTable.propTypes = {
  visible: PropTypes.bool.isRequired,
  data: PropTypes.array.isRequired,
  initialSelectedId: PropTypes.string,
  controller: PropTypes.instanceOf(NetworkEditorController),
};

export default PathwayTable;