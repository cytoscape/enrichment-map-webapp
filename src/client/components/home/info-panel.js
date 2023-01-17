import React from 'react';
import { makeStyles, useTheme } from '@material-ui/core/styles';

import useMediaQuery from '@material-ui/core/useMediaQuery';

import MobileStepper from '@material-ui/core/MobileStepper';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import KeyboardArrowLeft from '@material-ui/icons/KeyboardArrowLeft';
import KeyboardArrowRight from '@material-ui/icons/KeyboardArrowRight';
import SwipeableViews from 'react-swipeable-views';
import { autoPlay } from 'react-swipeable-views-utils';
import { Grid } from '@material-ui/core';

const AutoPlaySwipeableViews = autoPlay(SwipeableViews);

const tutorialSteps = [
  {
    label: '1. Upload your Data',
    imgPath: 'images/info-1.png',
  },
  {
    label: '2. Analyze the Results',
    imgPath: 'images/info-2.png',
  },
  {
    label: '3. Export Image for Publication',
    imgPath: 'images/info-3.png',
  },
];

const useStyles = makeStyles((theme) => ({
  root: {
    [theme.breakpoints.down('lg')]: {
      maxWidth: 400,
    },
    [theme.breakpoints.up('lg')]: {
      maxWidth: 1200,
    },
    flexGrow: 1,
  },
  swipeableBox: {
    borderColor: theme.palette.divider,
    borderWidth: '1px',
    borderStyle: 'solid hidden solid hidden',
  },
  imgBox: {
    backgroundColor: theme.palette.background.default,
    borderColor: theme.palette.divider,
    borderWidth: '1px',
    borderStyle: 'solid',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    height: 50,
    paddingLeft: theme.spacing(2),
  },
  img: {
    height: 250,
    maxWidth: 400,
    display: 'block',
    overflow: 'hidden',
    width: '100%',
    [theme.breakpoints.down('lg')]: {
      paddingTop: theme.spacing(1),
    },
    [theme.breakpoints.up('lg')]: {
      padding: theme.spacing(1),
    },
  },
}));

export function InfoPanel() {
  const classes = useStyles();
  const theme = useTheme();
  const [activeStep, setActiveStep] = React.useState(0);
  const maxSteps = tutorialSteps.length;

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleStepChange = (step) => {
    setActiveStep(step);
  };

  const renderAllImgs = () => {
    return (
      <Grid container justifyContent="center" spacing={1}>
        {tutorialSteps.map((step) => (
          <Grid item key={step.label}>
            <Paper className={classes.imgBox}>
              <Paper square elevation={0} className={classes.header}>
                <Typography>{step.label}</Typography>
              </Paper>
              <img className={classes.img} src={step.imgPath} alt={step.label} />
            </Paper>
          </Grid>
        ))}
      </Grid>
    );
  };

  const renderSwipeableImgs = () => {
    return (
      <div className={classes.swipeableBox}>
        <Paper square elevation={0} className={classes.header}>
          <Typography>{tutorialSteps[activeStep].label}</Typography>
        </Paper>
        <AutoPlaySwipeableViews
          axis={theme.direction === 'rtl' ? 'x-reverse' : 'x'}
          index={activeStep}
          // springConfig={{ delay: '2s', duration: '0.3s', easeFunction: 'linear' }}
          onChangeIndex={handleStepChange}
          enableMouseEvents
        >
          {tutorialSteps.map((step, index) => (
            <div key={step.label}>
              {Math.abs(activeStep - index) <= 2 ? (
                <img className={classes.img} src={step.imgPath} alt={step.label} />
              ) : null}
            </div>
          ))}
        </AutoPlaySwipeableViews>
        <MobileStepper
          steps={maxSteps}
          position="static"
          variant="dots"
          activeStep={activeStep}
          nextButton={
            <Button size="small" onClick={handleNext} disabled={activeStep === maxSteps - 1}>
              {theme.direction === 'rtl' ? <KeyboardArrowLeft /> : <KeyboardArrowRight />}
            </Button>
          }
          backButton={
            <Button size="small" onClick={handleBack} disabled={activeStep === 0}>
              {theme.direction === 'rtl' ? <KeyboardArrowRight /> : <KeyboardArrowLeft />}
            </Button>
          }
        />
      </div>
    );
  };

  const largeScreen = useMediaQuery(theme.breakpoints.up('lg'));

  return (
    <div className={classes.root}>
      {largeScreen ? renderAllImgs() : renderSwipeableImgs()}
    </div>
  );
}

export default InfoPanel;
