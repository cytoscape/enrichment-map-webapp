import React, { useState } from 'react';
import PropTypes from 'prop-types';

import { makeStyles } from '@material-ui/core/styles';

import { Grid, Typography } from '@material-ui/core';
import { ToggleButton, ToggleButtonGroup } from '@material-ui/lab';


const useStyles = makeStyles((theme) => ({
  header: {
    textAlign: 'center',
  },
  row: {
    display: 'flex',
    flexDirection: 'row',
  },
  col: {
    flex: 1,
    width: '280px',
    alignSelf: 'center',
    padding: theme.spacing(0.5),
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
}));

function assignGroupsSimple(columns) {
  // Just assign first half to 'A' and second half to 'B'
  const mid = columns.length / 2;
  return columns.map((c,i) => i < mid ? 'A' : 'B');
}


function assignGroups(columns, contents, format) {
  const groups = assignGroupsSimple(columns);
  if(!contents || !format)
    return groups;

  const secondLine = contents.split('\n', 2)[1];
  if(!secondLine)
    return groups;

  const tokens = secondLine.split(format == 'csv' ? ',' : '\t')?.slice(1);
  if(!tokens || tokens.length != columns.length)
    return groups;

  for(var i = 0; i < tokens.length; i++) {
    if(isNaN(tokens[i]) || columns[i].toLowerCase() === 'description') {
      groups[i] = 'X';
    }
  }

  return groups;
}


function ClassSelector({ columns, contents, format, onClassesChanged }) {
  const [ groups, setGroups ] = useState(() => assignGroups(columns, contents, format));

  if (onClassesChanged)
    onClassesChanged(groups);

  const handleChange = (i, newGroup) => {
    var newGroups = groups.map((c, i2) => i == i2 ? newGroup : c);
    setGroups(newGroups);

    if (onClassesChanged)
      onClassesChanged(newGroups);
  };

  const classes = useStyles();

  return (
    <Grid container direction="column" spacing={4}>
      <Grid item xs={12}>
        <Typography variant="body1">
          Define two sample groups that will be compared against each other<br />(<i>Group A</i> vs <i>Group B</i>):
        </Typography>
      </Grid>
      <Grid item xs={12}>
      { columns.map((column, i) => 
          column.toLowerCase() === 'description' 
          ? null
          : <div className={classes.row} key={i}>
              <div className={classes.col}>
                  { column }
              </div>
              <div className={classes.col}>
                <ToggleButtonGroup 
                  exclusive
                  value={groups[i]} 
                  onChange={(e, newClass) => handleChange(i, newClass)}>
                  <ToggleButton value='A'>Group A</ToggleButton>
                  <ToggleButton value='B'>Group B</ToggleButton>
                  <ToggleButton value='X'>Ignored</ToggleButton>
                </ToggleButtonGroup>
              </div>
            </div>
      )}
      </Grid>
    </Grid>
  );
}

ClassSelector.propTypes = {
  columns: PropTypes.array,
  onClassesChanged: PropTypes.func,
  contents: PropTypes.string,
  format: PropTypes.string,
};

export default ClassSelector;