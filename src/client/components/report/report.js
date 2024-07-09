import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { getComparator } from '../network-editor/pathway-table';
import { Select, MenuItem } from '@material-ui/core';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';


const useStyles = makeStyles((theme) => ({
  orderBy: {
    margin: theme.spacing(1),
    minWidth: 200,
  },
  order: {
    margin: theme.spacing(1),
    minWidth: 120,
  },
}));


async function fetchReport(secret) {
  try {
    const countRes = await fetch(`/api/report/count/${secret}`);
    if(!countRes.ok) {
      return 'error';
    }
    const networkRes = await fetch(`/api/report/networks/${secret}`);
    if(!networkRes.ok) {
      return 'error';
    }

    const counts = await countRes.json();
    const networks = await networkRes.json();

    return { counts, networks };
  } catch(err) {
    console.log(err);
    return 'error';
  }
}


export function Report({ secret }) {
  const classes = useStyles();

  const [ report, setReport ] = useState(null);
  const [ order, setOrder] = useState('desc');
  const [ orderBy, setOrderBy ] = useState('creationTime');

  useEffect(() => {
    fetchReport(secret).then(setReport);
  }, []);

  if(!report) {
    return <div> Loading... </div>;
  } else if(report === 'error') {
    return <div> Error fetching report. </div>;
  }

  const comparator = getComparator(order, orderBy);
  const sortedNetworks = report.networks.sort(comparator);

  return <div style={{padding: '10px'}}>
    <h1>EnrichmentMap:RNA-Seq - Usage Report</h1>
    <h3>Demo Networks: {report.counts.demo}</h3>
    <h3>User Created Networks ({report.counts.user}):</h3>
    <div style={{"float":"right"}} >
      Sort:
      &nbsp;&nbsp;
      <Select value={orderBy} onChange={(event) => setOrderBy(event.target.value)} className={classes.orderBy}>
        <MenuItem value="networkName">Name</MenuItem>
        <MenuItem value="creationTime">Creation Time</MenuItem>
        <MenuItem value="lastAccessTime">Last Accessed Time</MenuItem>
      </Select>
      &nbsp;
      <Select value={order} onChange={(event) => setOrder(event.target.value)} className={classes.order}>
        <MenuItem value="desc">Desc</MenuItem>
        <MenuItem value="asc">Asc</MenuItem>
      </Select>
    </div>
    <br></br>
    <TableContainer component={Paper}>
      <Table sx={{ minWidth: 650 }} aria-label="simple table">
        <TableHead>
          <TableRow>
            <TableCell><b>Network Name</b></TableCell>
            <TableCell align="right"><b>Nodes</b></TableCell>
            <TableCell align="right"><b>Edges</b></TableCell>
            <TableCell align="right"><b>Type</b></TableCell>
            <TableCell align="right"><b>Creation Time</b></TableCell>
            <TableCell align="right"><b>Last Access Time</b></TableCell>
            <TableCell align="right"> </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedNetworks.map(network => {
            const createTime = new Date(network.creationTime).toLocaleString('en-CA');
            const accessTime = new Date(network.lastAccessTime).toLocaleString('en-CA');
            return (
              <TableRow
                key={network._id}
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                <TableCell component="th" scope="row">{network.networkName}</TableCell>
                <TableCell align="right">{network.nodeCount}</TableCell>
                <TableCell align="right">{network.edgeCount}</TableCell>
                <TableCell align="right">{network.inputType}</TableCell>
                <TableCell align="right">{createTime}</TableCell>
                <TableCell align="right">{accessTime}</TableCell>
                <TableCell align="right"><a href={`/document/${network._id}`} target="_blank" rel = "noopener noreferrer">open</a></TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  </div>;
}

Report.propTypes = {
  secret: PropTypes.string,
};

export default Report;