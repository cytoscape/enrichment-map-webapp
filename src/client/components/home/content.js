import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import EventEmitter from 'eventemitter3';
import _ from 'lodash';
import { makeStyles } from '@material-ui/core/styles';

import { UploadController } from './upload-controller';
import EasyCitation from './citation.js';
import { DebugMenu } from '../../debug-menu';
import StartDialog from './start-dialog';
import theme from '../../theme';
import { assignGroups } from './class-selector';

import { AppBar, Toolbar, Menu, MenuList, MenuItem } from '@material-ui/core';
import { Container, Grid, Divider, } from '@material-ui/core';
import { Button, Typography, Link } from '@material-ui/core';

import NavigateNextIcon from '@material-ui/icons/NavigateNext';
import { AppLogoIcon } from '../svg-icons';

import classNames from 'classnames';
import uuid from 'uuid';


const STEP = {
  WAITING: 'WAITING',
  UPLOAD:  'UPLOAD',
  LOADING: 'LOADING',
  CLASSES: 'CLASSES',
  ERROR:   'ERROR',
};

const menusDef = [
  { label: "About" },
  { label: "Contact" },
  { label: "Help" },
];
const mobileMenuId = 'primary-menu-mobile';

const logosDef = [
  { src: "/images/bader-lab-logo.svg", alt: "Bader Lab logo", href: "https://baderlab.org/" },
  { src: "/images/cytoscape-consortium-logo.svg", alt: "Cytoscape Consortium logo", href: "https://cytoscape.org/" },
  { src: "/images/donnelly-logo.png", alt: "The Donnelly Centre logo", href: "https://thedonnellycentre.utoronto.ca/" },
  { src: "/images/uoft-logo.svg", alt: "UofT logo", href: "https://www.utoronto.ca/" },
];

const isMobileWidth = () => window.innerWidth <= theme.breakpoints.values.sm;
const isTabletWidth = () => !isMobileWidth() && window.innerWidth <= theme.breakpoints.values.md;

function showNetwork(id) {
  location.href = `/document/${id}`;
}

async function loadSampleFiles() {
  const res = await fetch('/api/sample-data');
  const files = await res.json();
  const [ sampleRankFiles, sampleExprFiles ] = _.partition(files, f => f.endsWith('.rnk'));
  return {
    sampleRankFiles,
    sampleExprFiles
  };
}

async function showFileDialog() {
  var input = document.createElement('input');
  input.type = 'file';

  return await new Promise(resolve => {
    input.addEventListener('change', () => {
      const files = input.files;
      resolve(files);
    });
    input.click();
  });
}


let requestID = null;
let cancelledRequests = [];

export function Content() {
  const classes = useStyles();

  /** State */

  // the UploadController interacts with this component via an event bus
  const [ bus ] = useState(() => new EventEmitter());
  const [ uploadController ] = useState(() => new UploadController(bus));
  const [ sampleFiles, setSampleFiles ] = useState({ sampleRankFiles: [], sampleExprFiles: [] });

  // state for component interaction
  const [ mobile, setMobile ] = useState(() => isMobileWidth());
  const [ tablet, setTablet ] = useState(() => isTabletWidth());
  const [ droppingFile, setDroppingFile ] = useState(false);

  // This state must be kept as a single object because the eventbus callbacks run asyncronously, 
  // so this state must be updated atomically to avoid extra re-renders (which also cause errors).
  // Each of the onXXX callbacks below must call setUploadState at most once.
  const [ uploadState, setUploadState ] = useState({
    step: STEP.WAITING,
    format: null,
    contents: null,
    columns: null, 
    name: null,
    rnaseqClasses: null,
    errorMessages: null,
  });
  const updateUploadState = (update) => setUploadState(prev => ({ ...prev, ...update }));


  /** Effects */

  useEffect(() => {
    loadSampleFiles().then(setSampleFiles);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setMobile(isMobileWidth());
      setTablet(isTabletWidth());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    bus.on('loading', onLoading);
    bus.on('classes', onClasses);
    bus.on('ranks', onRanks);
    bus.on('finished', onFinished);
    bus.on('error', onError);
    return () => bus.removeAllListeners();
  }, []);


  /** Callbacks and utility functions */

  const loadSampleNetwork = async (fileName) => {
    if (uploadState.step == STEP.LOADING)
      return;
    const file = await uploadController.loadSampleData(fileName);
    if(file) {
      await uploadController.upload([file]);
    }
  };

  const onDropUpload = async (event) => {
    event.preventDefault();
    if (uploadState.step == STEP.LOADING)
      return;

    const files = Array.from(event.dataTransfer.items)
        .filter(item => item.kind === 'file')
        .map(item => item.getAsFile());

    setDroppingFile(false);
    await uploadController.upload(files);
  };

  const onDragOverUpload = (event) => {
    event.preventDefault();
    setDroppingFile(true);
  };

  const onDragEndUpload = (event) => {
    event.preventDefault();
    setDroppingFile(false);
  };

  const onClickGetStarted = () => {
    if (uploadState.step != STEP.LOADING) {
      setUploadState({ step: STEP.UPLOAD });
    }
  };

  const onClassesChanged = (rnaseqClasses) => {
    updateUploadState({ rnaseqClasses });
  };

  const onUpload = async () => {
    const files = await showFileDialog();
    await uploadController.upload(files);
  };

  const onLoading = () => {
    updateUploadState({ step: STEP.LOADING });
  };

  const onRanks = async ({ format, contents, name }) => {
    requestID = uuid.v4();
    updateUploadState({ step: STEP.LOADING });
    await uploadController.sendDataToEMService(contents, format, 'ranks', name, requestID);
  };

  const onSubmit = async () => {
    requestID = uuid.v4();
    const { contents, format, name, rnaseqClasses } = uploadState;
    updateUploadState({ step: STEP.LOADING });
    await uploadController.sendDataToEMService(contents, format, 'rnaseq', name, requestID, rnaseqClasses);
  };

  const onClasses = ({ format, columns, contents, name }) => {
    const rnaseqClasses = assignGroups(columns, contents, format);
    setUploadState({ step: STEP.CLASSES, format, columns, contents, name, rnaseqClasses });
  };
 
  const onError = ({ errors, requestID }) => {
    if(cancelledRequests.includes(requestID)) {
      console.log(`Ignoring error from cancelled request: { requestID:${requestID} }`);
      return;
    }
    setUploadState({ step: STEP.ERROR, errorMessages: errors });
  };

  const onCancel = () => {
    if(requestID) {
      console.log(`Cancelling request: ${requestID}`);
      cancelledRequests.push(requestID);
    }
    setUploadState({ step: STEP.WAITING });
  };

  const onBack = () => {
    setUploadState({ step: STEP.UPLOAD });
  };

  const onFinished = ({ networkID, requestID }) => {
    if(cancelledRequests.includes(requestID)) {
      console.log(`Ignoring cancelled request: { networkID:${networkID}, requestID:${requestID} }`);
      return;
    }
    showNetwork(networkID);
  };


  /** Render Componenets */
  const { contents, ...stateToLog } = uploadState;
  console.log("Content render. uploadState: " + JSON.stringify(stateToLog));

  return (
    <div className={classNames({ [classes.root]: true, [classes.rootDropping]: droppingFile })}>
      <Header />
      <Container maxWidth="lg" disableGutters>
        <div
          className={classes.drop} 
          onDrop={onDropUpload} 
          onDragOver={onDragOverUpload} 
          onDragLeave={onDragEndUpload} 
          onDragEnd={onDragEndUpload}
        >
          <Grid container direction="column" justifyContent="center" alignItems="center">
            <Grid item>
              <Grid
                container
                className={classes.content}
                direction={mobile ? 'column' : 'row'}
                justifyContent="center"
                alignItems="center"
                spacing={2}
              >
                <Grid item xs={mobile ? 12 : 6}>
                  <Grid container direction="column" justifyContent="center" alignItems="center">
                    <Grid item>
                      <Typography variant="h1" className={classes.tagline}>Enrichment analysis for your RNA&#8209;Seq</Typography>
                    </Grid>
                    <Grid item>
                      <p className={classes.description}>
                        Get a quick-and-easy, publication-ready enrichment figure for your two-case RNA&#8209;Seq experiment.
                      </p>
                    </Grid>
                    <Grid item className={classes.section}>
                      {mobile 
                        ? <Figure /> 
                        : <GetStartedSection mobile={mobile} tablet={tablet} onClickGetStarted={onClickGetStarted} />
                      }
                    </Grid>
                  {mobile && (
                    <Grid item className={classes.section}>
                      <GetStartedSection mobile={mobile} tablet={tablet} onClickGetStarted={onClickGetStarted} />
                    </Grid>
                  )}
                  </Grid>
                </Grid>
              {!mobile && (
                <Grid item className={classes.section} xs={6}>
                  <Figure />
                </Grid>
              )}
              </Grid>
            </Grid>
            <Grid item xs={mobile ? 10 : 8}>
              <EasyCitation />
            </Grid>
          {uploadState.step !== STEP.WAITING && (
            <Grid item>
              <StartDialog
                isMobile={mobile}
                step={uploadState.step}
                columns={uploadState.columns}
                errorMessages={uploadState.errorMessages}
                rnaseqClasses={uploadState.rnaseqClasses}
                onUpload={onUpload}
                onClassesChanged={onClassesChanged}
                onSubmit={onSubmit}
                onCancelled={onCancel}
                onBack={onBack}
              />
            </Grid>
          )}
          </Grid>
        </div>
        {/* <MobileMenu /> */}
        <Debug sampleFiles={sampleFiles} onLoadSampleNetwork={loadSampleNetwork} />
        <Footer />
      </Container>
    </div>
  );
}
Content.propTypes = {
};


function Figure() {
  const classes = useStyles();
  return <img src="/images/home-figure.png" alt="figure" className={classes.figure} />;
}


function Logo({ src, alt, href }) {
  const classes = useStyles();
  return (
    <Link href={href} target="_blank" rel="noreferrer" underline="none">
      <img src={src} alt={alt} className={classes.footerLogo} />  
    </Link>
  );
}
Logo.propTypes = {
  src: PropTypes.string,
  alt: PropTypes.string,
  href: PropTypes.string,
};


function MobileMenu() {
  const classes = useStyles();
  const [ mobileMoreAnchorEl, setMobileMoreAnchorEl] = useState(null);
  const openMobileMenu = (event) => setMobileMoreAnchorEl(event.currentTarget);
  const closeMobileMenu = () => setMobileMoreAnchorEl(null);
  return (
    <Menu
      anchorEl={mobileMoreAnchorEl}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      id={mobileMenuId}
      keepMounted
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      open={Boolean(mobileMoreAnchorEl)}
      onClose={closeMobileMenu}
    >
      <MenuList>
      {menusDef.map((menu, idx) => (
        <MenuItem key={idx}>
          { menu.label }
        </MenuItem>
      ))}
      </MenuList>
    </Menu>
  );
}


function Header() {
  const classes = useStyles();
  return (
    <AppBar position="static" color="transparent">
      <Container maxWidth="lg" disableGutters>
        <Toolbar variant="regular">
          <Grid container alignItems="center" justifyContent="space-between">
            <Grid item>
              <Grid container alignItems="center" spacing={2}>
                <Grid item>
                  <AppLogoIcon className={classes.logo} />
                </Grid>
                <Grid item>
                  <Typography variant="inherit" className={classes.logoText}>EnrichmentMap:RNA-Seq</Typography>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
          <div className={classes.grow} />
        </Toolbar>
      </Container>
    </AppBar>
  );
}


function Footer({ mobile, tablet }) {
  const classes = useStyles();
  return (
    <Container maxWidth="lg" disableGutters className={classes.footer}>
      <Divider />
      <Toolbar variant="regular" className={classes.logoBar}>
        <Grid
          container
          direction={mobile || tablet ? 'column' : 'row'}
          alignItems={mobile || tablet ? 'center' : 'flex-start'}
          justifyContent={mobile ? 'space-around' : 'space-between'}
        >
          <Grid item className={classes.copyright} md={4} sm={12}>
            &copy; {new Date().getFullYear()} University of Toronto
          </Grid>
          <Grid item md={8} sm={12}>
            <Grid
              container
              direction={mobile ? 'column' : 'row'}
              alignItems={mobile ? 'center' : 'flex-start'}
              justifyContent={mobile ? 'space-around' : 'space-between'}
              spacing={5}
            >
          {logosDef.map((logo, idx) =>
            <Grid key={idx} item>
              <Logo src={logo.src} alt={logo.alt} href={logo.href} />
            </Grid>
          )}
            </Grid>
          </Grid>
        </Grid>
      </Toolbar>
    </Container>
  );
}
Footer.propTypes = {
  mobile: PropTypes.bool,
  tablet: PropTypes.bool,
};


function Debug({ sampleFiles, onLoadSampleNetwork }) {
  const { sampleRankFiles, sampleExprFiles } = sampleFiles;
  return (
    <DebugMenu>
      <h3>Example rank input files</h3>
      <ul>
      {
        sampleRankFiles.length > 0 ?
        sampleRankFiles.map(file => (
          <li key={file}><Link component="a" style={{ cursor: 'pointer' }} onClick={() => onLoadSampleNetwork(file)}>{file}</Link></li>
        )) :
        <li>Loading...</li>
      }
      </ul>
      <h3>Example expression input files</h3>
      <ul>
      {
        sampleExprFiles.length > 0 ?
        sampleExprFiles.map(file => (
          <li key={file}><Link component="a" style={{ cursor: 'pointer' }} onClick={() => onLoadSampleNetwork(file)}>{file}</Link></li>
        )) :
        <li>Loading...</li>
      }
      </ul>
    </DebugMenu>
  );
}
Debug.propTypes = {
  sampleFiles: PropTypes.object,
  onLoadSampleNetwork: PropTypes.func,
};


function GetStartedSection({ mobile, tablet, onClickGetStarted }) {
  const classes = useStyles();
  return (
    <Grid
      container
      justifyContent={mobile || tablet ? 'center' : 'flex-start'}
      alignItems="center"
      spacing={3}
    >
      <Grid item>
        <Button
          className={classes.startButton}
          variant="contained"
          color="primary"
          endIcon={<NavigateNextIcon />}
          onClick={onClickGetStarted}
        >
          Get Started
        </Button>
      </Grid>
      {/* <Grid item>
        <Button
          className={classes.demoButton}
          variant="text"
          color="primary"
          startIcon={<PlayCircleFilledIcon />}
        >
          Watch Demo
        </Button>
      </Grid> */}
    </Grid>
  );
}
GetStartedSection.propTypes = {
  mobile: PropTypes.bool,
  tablet: PropTypes.bool,
  onClickGetStarted: PropTypes.func,
};


const useStyles = makeStyles(theme => ({
  root: {
    alignContent: 'center',
    height: '100%',
    width: '100%',
    position: 'absolute',
    display: 'flex',
    flexDirection: 'column',
    border: '4px solid transparent'
  },
  rootDropping: {
    borderColor: 'rgb(54, 102, 209)'
  },
  main: {
    padding: theme.spacing(1),
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    alignContent: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontSize: 48,
  },
  logoText: {
    fontSize: '1.5em',
    fontWeight: 'bold',
  },
  grow: {
    flexGrow: 1,
  },
  menu: {
    marginLeft: theme.spacing(5),
    textTransform: 'unset',
  },
  content: {
    maxHeight: 700,
    marginTop: 0,
    marginBottom: 0,
    padding: theme.spacing(4),
    paddingTop: 0,
    paddingBottom: 0,
    textAlign: 'left',
    [theme.breakpoints.down('sm')]: {
      marginTop: 0,
      marginBottom: 0,
      paddingTop: theme.spacing(1),
      paddingBottom: theme.spacing(1),
    },
    [theme.breakpoints.down('xs')]: {
      padding: theme.spacing(2),
    },
  },
  tagline: {
    fontWeight: 800,
    fontSize: 'clamp(1.5rem, 0.75rem + 2.5vw, 3.5rem)',
    marginTop: theme.spacing(2),
    [theme.breakpoints.down('sm')]: {
      marginTop: theme.spacing(1),
    },
    [theme.breakpoints.down('xs')]: {
      marginTop: theme.spacing(0.5),
      textAlign: 'center',
    },
  },
  description : {
    fontSize: '1rem',
    color: theme.palette.secondary.main,
    marginTop: theme.spacing(2.5),
    marginBottom: theme.spacing(5),
    [theme.breakpoints.down('xs')]: {
      fontSize: 'unset',
      textAlign: 'center',
      marginBottom: theme.spacing(2.5),
    },
  },
  section: {
    width: '100%',
    [theme.breakpoints.down('xs')]: {
      textAlign: 'center',
      alignItems: 'center',
      marginTop: theme.spacing(1),
    },
  },
  startButton: {
    // fontSize: '1.25em',
    // textTransform: 'unset',
  },
  demoButton: {
    textTransform: 'unset',
  },
  figure: {
    maxWidth: '100%',
    maxHeight: 520,
    objectFit: 'contain',
    [theme.breakpoints.down('xs')]: {
      maxWidth: '80%',
      maxHeight: 300,
      marginBottom: theme.spacing(4),
    },
  },
  footer: {
    marginTop: theme.spacing(4),
  },
  copyright: {
    [theme.breakpoints.down('sm')]: {
      marginBottom: theme.spacing(8),
    },
  },
  logoBar: {
    marginTop: theme.spacing(2),
    color: theme.palette.secondary.main,
  },
  footerLogo: {
    maxHeight: 48,
    filter: 'grayscale(1) opacity(50%)',
  },
}));



export default Content;