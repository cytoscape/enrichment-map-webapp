import React, { useState } from 'react';
import PropTypes from 'prop-types';

import theme from '../../theme';
import { makeStyles } from '@material-ui/core/styles';

import { TableVirtuoso } from 'react-virtuoso';
import { Collapse, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel } from '@material-ui/core';
import { Box, Paper, Typography } from '@material-ui/core';
import { List, ListItem, ListItemText, IconButton  } from '@material-ui/core';

import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@material-ui/icons/KeyboardArrowRight';


const TABLE_HEIGHT = 400;

const useStyles = makeStyles((theme) => ({
  headerRow: {
    backgroundColor: theme.palette.background.default
  },
  row: {
    '& > *': {
      borderBottom: 'unset',
    },
  },
  name: {
    width: '50%'
  },
  nes: {
    width: '25%'
  },
  pvalue: {
    width: '25%'
  },
}));

const CELLS = [
  { id: 'name',   numeric: false, disablePadding: false,  label: 'Name' },
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

const ContentRow = ({ row, index }) => {
  const [open, setOpen] = useState(false);
  const classes = useStyles();

  return (
    <TableCell key={'details_' + index} colSpan={cellLength} padding="checkbox">
      <Table size="small">
        <TableRow className={classes.row}>
    {/* {index % 2 === 0 ? ( */}
        {CELLS.map((cell, idx) => (
            <TableCell
              key={row[cell.id] + '_' + index}
              align={cell.numeric ? 'right' : 'left'}
              padding="none"
              className={classes[cell.id]}
            >
            {idx === 0 && (
              <IconButton aria-label="expand row" size="small" onClick={() => setOpen(!open)}>
                { open ?  <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon /> }
              </IconButton>
            )}
              { row[cell.id] }
            </TableCell>
          ))
        }
        </TableRow>
        <TableRow className={classes.row}>
          <TableCell key={'details_' + index} colSpan={cellLength} padding="checkbox">
            <Collapse in={open} timeout="auto" unmountOnExit>
            {row.pathways && row.pathways.length > 0 && (
              <Box margin={1}>
                <Typography variant="subtitle2" gutterBottom component="span">Gene Sets:</Typography>
                <ul>
                {row.pathways.map((p, idx) => (
                  <li key={"pathway_" + index + "-" + idx}>
                    <Typography variant="body2" color="secondary" gutterBottom component="span">{ p }</Typography>
                  </li>
                ))}
                </ul>
              </Box>
            )}
              <Box margin={1}>
                <Typography variant="subtitle2" gutterBottom component="span">Genes: </Typography>
                <Typography variant="body2" color="secondary" gutterBottom component="span">{ row.genes.join(', ') }</Typography>
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      </Table>
      </TableCell>
  );
};

const PathwayTable = ({ visible, data }) => {
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('calories');

  const classes = useStyles();

  const handleRequestSort = (event, property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  if (!visible) {
    // Returns an empty div with the same height as the table just so the open/close animation works properly,
    // but we don't want to spend resources to build an invisible table
    return <div style={{height: TABLE_HEIGHT}} />;
  }

  const sortedData = stableSort(data, getComparator(order, orderBy));
  
  const tableData = sortedData; // TODO remove if it works
  // const tableData = [];
  // for (const obj of sortedData) {
  //   // TODO refactort/improve
  //   const row = {};
  //   row.id = obj.id;
  //   row.name = obj.name;
  //   row.nes = obj.nes;
  //   row.pvalue = obj.pvalue;
  //   row.cluster = obj.cluster;
  //   tableData.push(obj);
  //   tableData.push({ pathways: obj.pathways, genes: obj.genes }); // next row is for extra/expandable content
  //   console.log(obj.pathways);
  // }

  return (
    <TableVirtuoso
      style={{height: TABLE_HEIGHT, border: `1px solid ${theme.palette.divider}`}}
      data={tableData}
      components={TableComponents}
      fixedHeaderContent={() => (
        <TableRow className={classes.headerRow}>
        {CELLS.map((cell) => (
          <TableCell
            key={cell.id}
            align="left"
            padding={cell.disablePadding ? 'none' : 'checkbox'}
            sortDirection={orderBy === cell.id ? order : false}
            className={classes[cell.id]}
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
        </TableRow>
      )}
      itemContent={(index, obj) => (
        <ContentRow row={obj} index={index} />
      )}
    />
  );
};

ContentRow.propTypes = {
  row: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
};
PathwayTable.propTypes = {
  visible: PropTypes.bool.isRequired,
  data: PropTypes.array.isRequired,
};

export default PathwayTable;