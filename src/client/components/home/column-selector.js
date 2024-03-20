import React from 'react';
import PropTypes from 'prop-types';
import { makeStyles } from '@material-ui/core/styles';
import { FormControl, Grid, InputLabel, MenuItem, Select, Typography } from '@material-ui/core';
import { ToggleButton, ToggleButtonGroup } from '@material-ui/lab';
import { ExperimentGroupIcon, ControlGroupIcon } from '../svg-icons';
import BlockIcon from '@material-ui/icons/Block';


const useStyles = makeStyles((theme) => ({
  root: {
    // Disable Text Selection (needed here as well because the Drawer can be 'temporary', rendered as a Dialog):
    WebkitTouchCallout: 'none', /* iOS Safari */
    WebkitUserSelect: 'none', /* Safari */
    MozUserSelect: 'none', /* Firefox */
    msUserSelect: 'none', /* Internet Explorer/Edge */
    userSelect: 'none', /* Non-prefixed version (Chrome and Opera) */
    // -----------------------
  },
  header: {
    textAlign: 'center',
  },
  col: {
    alignSelf: 'center',
    padding: theme.spacing(0.25),
    whiteSpace: 'nowrap',
  },
  colNameContainer: {
    alignSelf: 'center',
    minWidth: 40,
    maxWidth: '100%',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }
}));


export function GeneColumnSelector({ columns, value, onChange }) {
  const classes = useStyles();

  return (
    <Grid container direction="column" spacing={4} className={classes.root}>
      {/* <Grid item xs={12}>
        <Typography variant="body1">
          Select the column to use for <i>Gene Names</i>.
        </Typography>
      </Grid> */}
      <Grid item xs={12}>
        <FormControl fullWidth>
          <InputLabel>Gene Name Column</InputLabel>
          <Select
            value={value}
            label="Gene Name Column"
            onChange={evt => onChange(evt.target.value)}
          >
          { columns.map((col, i) => 
            <MenuItem key={i} value={col}>{col}</MenuItem>
          )}
          </Select>
        </FormControl>
      </Grid>
    </Grid>
  );
}

GeneColumnSelector.propTypes = {
  columns: PropTypes.array.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func,
};



export function RankColumnSelector({ columns, value, onChange }) {
  const classes = useStyles();

  return (
    <Grid container direction="column" spacing={4} className={classes.root}>
      {/* <Grid item xs={12}>
        <Typography variant="body1">
          Select the column to use for <i>Gene Ranks</i>.
        </Typography>
      </Grid> */}
      <Grid item xs={12}>
        <FormControl fullWidth>
          <InputLabel>Gene Rank Column</InputLabel>
          <Select
            value={value}
            label="Gene Rank Column"
            onChange={evt => onChange(evt.target.value)}
          >
          { columns.map((col, i) => 
            <MenuItem key={i} value={col}>{col}</MenuItem>
          )}
          </Select>
        </FormControl>
      </Grid>
    </Grid>
  );
}

RankColumnSelector.propTypes = {
  columns: PropTypes.array.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func,
};



const CLASS_BUTTONS_DEF = [
  { value: 'A', label: 'Experiment', mobileLabel: 'E',  icon: <ExperimentGroupIcon fontSize="small" /> },
  { value: 'B', label: 'Control',    mobileLabel: 'C',  icon: <ControlGroupIcon fontSize="small" /> },
  { value: 'X', label: 'Ignored',    mobileLabel: null, icon: <BlockIcon fontSize="small" /> },
];

export function ClassSelector({ columns, isMobile, rnaseqClasses, onClassesChanged }) {
  const classes = useStyles();

  const handleChange = (i, newGroup) => {
    if(newGroup) {
      var newGroups = rnaseqClasses.map((c, i2) => i == i2 ? newGroup : c);
      onClassesChanged(newGroups);
    }
  };

  return (
    <Grid container direction="column" spacing={4} className={classes.root}>
      <Grid item xs={12}>
        <Typography variant="body1">
          Define two sample groups that will be compared against each other &#8212; <i>Experiment</i> vs <i>Control</i>:
        </Typography>
      </Grid>
      <Grid item xs={12}>
      { columns.map((column, i) => 
        <Grid container key={i} direction="row" justifyContent="space-between">
            <Grid item className={classes.col} sm={6}>
              <div className={classes.colNameContainer}>
                { column }
              </div>
            </Grid>
            <Grid item className={classes.col} sm={6}>
              <Grid container direction="row">
                <ToggleButtonGroup 
                  exclusive
                  value={rnaseqClasses[i]} 
                  onChange={(e, newClass) => handleChange(i, newClass)}
                >
                { CLASS_BUTTONS_DEF.map((btn) => 
                  <ToggleButton key={btn.value} value={btn.value}>
                    { isMobile ? btn.icon : btn.label }
                  </ToggleButton>
                )}
                </ToggleButtonGroup>
              </Grid>
            </Grid>
          </Grid>
      )}
      </Grid>
    </Grid>
  );
}

ClassSelector.propTypes = {
  onClassesChanged: PropTypes.func,
  columns: PropTypes.array.isRequired,
  rnaseqClasses: PropTypes.array.isRequired,
  isMobile: PropTypes.bool,
};

export default ClassSelector;