import React from 'react';
import PropTypes from 'prop-types';
import makeStyles from '@mui/styles/makeStyles';
import { Grid, Link, Typography } from '@mui/material';
import { FormControl, FormHelperText, InputLabel, MenuItem, Select } from '@mui/material';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { ExperimentGroupIcon, ControlGroupIcon } from '../svg-icons';
import BlockIcon from '@mui/icons-material/Block';


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
    color: theme.palette.text.secondary,
  },
  controlContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  formControl: {
    margin: theme.spacing(1, 0, 1, 0),
    minWidth: 375,
    [theme.breakpoints.down('sm')]: {
      minWidth: 0,
      width: '100%',
    },
  },
  inputLabel: {
    color: theme.palette.text.primary,
  },
  select: {
    fontSize: theme.typography.button.fontSize,
    color: theme.palette.text.secondary,
    paddingRight: 0,
  },
}));


export function GeneColumnSelector({ columns, value, onChange }) {
  const classes = useStyles();

  const linkoutProps = { target: "_blank",  rel: "noreferrer", underline: "none" };

  return (
    <Grid container direction="column" spacing={4} className={classes.root}>
      <Grid item xs={12} className={classes.controlContainer}>
        <InputLabel disableAnimation className={classes.inputLabel}>
          Gene Name Column:
        </InputLabel>
        <FormControl className={classes.formControl}>
          <Select
            value={value}
            variant="outlined"
            className={classes.select}
            onChange={evt => onChange(evt.target.value)}
          >
          { columns.map((col, i) => 
            <MenuItem key={i} value={col}>{col}</MenuItem>
          )}
          </Select>
          <FormHelperText>
            Identifiers from&nbsp;
            <Link href="https://www.ensembl.org/Homo_sapiens/Info/Index" className={classes.linkout} {...linkoutProps}>Ensembl</Link> or&nbsp;
            <Link href="https://www.genenames.org/" className={classes.linkout} {...linkoutProps}>HGNC</Link>&nbsp;
            &#40;for human only&#41;
          </FormHelperText>
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
      <Grid item xs={12} className={classes.controlContainer}>
        <InputLabel disableAnimation className={classes.inputLabel}>
          Gene Rank Column:
        </InputLabel>
        <FormControl className={classes.formControl}>
          <Select
            value={value}
            variant="outlined"
            className={classes.select}
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