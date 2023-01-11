import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { makeStyles } from '@material-ui/core/styles';
import { Button } from '@material-ui/core';
import { ToggleButton, ToggleButtonGroup } from '@material-ui/lab';


const useStyles = makeStyles((theme) => ({
  container: {
    
  },
  header: {
    textAlign: 'center'
  },
  row: {
    display: 'flex',
    flexDirection: 'row',
  },
  col: {
    flex: 1,
    width: '280px',
    alignSelf: 'center',
    padding: '2px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  submitButtons: {
    textAlign: 'center',
    marginTop: '15px'
  }
}));


function ClassSelector({ columns, onSubmit, onCancel }) {
  
  const [ groups, setGroups ] = useState(() => {
    return columns.map((c,i) => i < columns.length / 2 ? 'A' : 'B');
  });

  const handleChange = (i, newGroup) => {
    setGroups(groups.map((c, i2) => i == i2 ? newGroup : c));
  };

  const classes = useStyles();

  return <div className={classes.container}>
    <div className={classes.header}>
      <p><b>Please define two sample groups that will be compared <br/> against each other (Group A vs Group B).</b></p>
    </div>
      { columns.map((column, i) => 
        <div className={classes.row} key={i}>
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
    <div className={classes.submitButtons}>
      <Button 
        variant='contained' 
        onClick={() => onSubmit(groups)}>
        Submit
      </Button>
      &nbsp;&nbsp;&nbsp;
      <Button 
        variant='contained'
        onClick={() => onCancel()}>
        Cancel
      </Button>
    </div>
  </div>;
}

ClassSelector.propTypes = {
  columns: PropTypes.array,
  onSubmit: PropTypes.func,
  onCancel: PropTypes.func,
};

export default ClassSelector;