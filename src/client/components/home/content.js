import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import EventEmitter from 'eventemitter3';
import clsx from 'clsx';
import _ from 'lodash';
import classNames from 'classnames';
import uuid from 'uuid';

import { useTheme } from '@mui/material/styles';

import makeStyles from '@mui/styles/makeStyles';

import { RecentNetworksController } from '../recent-networks-controller';
import { UploadController, RNA_SEQ, PRE_RANKED } from './upload-controller';
import RecentNetworksList from './recent-networks-list';
import Header from './header';
import Footer from './footer';
import MobileMenu from './mobile-menu';
import Faq from './faq';
import About from './about';
import { DebugMenu } from './debug-menu';
import StartDialog from './start-dialog';
import LinkOut from './link-out';

import { Container, Grid } from '@mui/material';
import { Button, Typography, Link } from '@mui/material';

import NavigateNextIcon from '@mui/icons-material/NavigateNext';


export const STEP = {
  WAITING: 'WAITING',
  UPLOAD:  'UPLOAD',
  LOADING: 'LOADING',
  COLUMNS: 'COLUMNS',
  ERROR:   'ERROR',
};

export const menuDef = [
  { label: "FAQ",      href: '/#faq' },
  { label: "About",    href: '/#about' },
  { label: "Contact",  href: 'https://baderlab.org/', target: '_blank' }
];

const logosDef = [
  { src: "/images/bader-lab-logo.svg", alt: "Bader Lab logo", href: "https://baderlab.org/" },
  { src: "/images/cytoscape-consortium-logo.svg", alt: "Cytoscape Consortium logo", href: "https://cytoscape.org/" },
  { src: "/images/uoft-logo.svg", alt: "UofT logo", href: "https://www.utoronto.ca/" },
];

const isMobileWidth = (theme) => window.innerWidth <= theme.breakpoints.values.sm;
const isTabletWidth = (theme) => !isMobileWidth(theme) && window.innerWidth <= theme.breakpoints.values.md;

let requestID = null;
let cancelledRequests = [];

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

function guessRnaseqClasses(columns) {
  // Just assign first half to 'A' and second half to 'B'
  const mid = columns.length / 2;
  return columns.map((c,i) => i < mid ? 'A' : 'B');
}

//==[ Content ]=======================================================================================================

const useContentStyles = makeStyles(theme => ({
  root: {
    alignContent: 'center',
    width: '100%',
    position: 'absolute',
    display: 'flex',
    flexDirection: 'column',
    border: '4px solid transparent', // necessary for the drop area border
    backgroundColor: theme.palette.background.paper,
  },
  rootDropping: {
    borderColor: 'rgb(54, 102, 209)'
  },
  main: {
    marginBottom: theme.spacing(6),
  },
  menu: {
    marginLeft: theme.spacing(5),
    textTransform: 'unset',
  },
  content: {
    maxHeight: 700,
    marginTop: theme.spacing(12),
    marginBottom: theme.spacing(2),
    padding: theme.spacing(0, 4, 0, 4),
    textAlign: 'left',
    [theme.breakpoints.down('md')]: {
      marginTop: 0,
      marginBottom: 0,
      paddingTop: theme.spacing(1),
      paddingBottom: theme.spacing(1),
    },
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(2),
    },
  },
  contentWithRecentNetworks: {
    marginTop: 0,
  },
  tagline: {
    fontWeight: 800,
    fontSize: 'clamp(1.5rem, 0.75rem + 2.5vw, 2.5rem)',
    marginTop: theme.spacing(2),
    [theme.breakpoints.down('md')]: {
      marginTop: theme.spacing(1),
      textAlign: 'center',
    },
    [theme.breakpoints.down('sm')]: {
      marginTop: 0,
    },
  },
  description : {
    fontSize: '1rem',
    color: theme.palette.text.secondary,
    marginTop: theme.spacing(5),
    marginBottom: theme.spacing(5),
    [theme.breakpoints.down('sm')]: {
      fontSize: 'unset',
      textAlign: 'center',
      marginTop: theme.spacing(2.5),
      marginBottom: theme.spacing(2.5),
    },
  },
  heroSection: {
    width: '100%',
    [theme.breakpoints.down('md')]: {
      textAlign: 'center',
      alignItems: 'center',
    },
  },
  section: {
    width: '100%',
    padding: theme.spacing(10, 0, 10, 0),
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(6, 0, 6, 0),
    },
  },
  alternateSection: {
    backgroundColor: theme.palette.background.default,
  },
  sectionContainer: {
    textAlign: 'left',
  },
  sectionTitle: {
    fontSize: '1.85rem',
    fontWeight: 'bold',
    marginBottom: theme.spacing(2),
    [theme.breakpoints.down('sm')]: {
      fontSize: '1.5rem',
    },
  },
  sectionDescription: {
    maxWidth: 768,
    marginBottom: theme.spacing(6),
    color: theme.palette.text.secondary,
    [theme.breakpoints.down('sm')]: {
      fontSize: 'unset',
    },
  },
}));

export function Content({ recentNetworksController }) {
  const classes = useContentStyles();
  const theme = useTheme();

  /** State */

  // the UploadController interacts with this component via an event bus
  const [ bus ] = useState(() => new EventEmitter());
  const [ uploadController ] = useState(() => new UploadController(bus));
  const [ sampleFiles, setSampleFiles ] = useState({ sampleRankFiles: [], sampleExprFiles: [] });
  // state for component interaction
  const [ mobile, setMobile ] = useState(() => isMobileWidth(theme));
  const [ tablet, setTablet ] = useState(() => isTabletWidth(theme));
  const [ openMobileMenu, setOpenMobileMenu ] = useState(false);
  const [ droppingFile, setDroppingFile ] = useState(false);
  const [ showRecentNetworks, setShowRecentNetworks ] = useState(false);

  // This state must be kept as a single object because the eventbus callbacks run asyncronously, 
  // so this state must be updated atomically to avoid extra re-renders (which also cause errors).
  // Each of the onXXX callbacks below must call setUploadState at most once.
  const [ uploadState, setUploadState ] = useState({
    step: STEP.WAITING,
    demo: null,
    fileInfo: null, // FileInfo object returned by readTextFile()/readExcelFile()
    geneCol: null,
    rankCol: null,
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
      setMobile(isMobileWidth(theme));
      setTablet(isTabletWidth(theme));
      if (!isMobileWidth(theme) && !isTabletWidth(theme)) {
        setOpenMobileMenu(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    bus.on('fileUploaded', onFileUploaded);
    bus.on('loading', onLoading); // maybe should be called 'running'
    bus.on('finished', onFinished);
    bus.on('error', onError);
    return () => bus.removeAllListeners();
  }, []);

  /** Callbacks and utility functions */

  const onOpenMobileMenu = () => setOpenMobileMenu(true);
  const onCloseMobileMenu = () => setOpenMobileMenu(false);

  const loadSampleNetwork = async (fileName, format) => {
    if (uploadState.step == STEP.LOADING)
      return;
    const file = await uploadController.fetchSampleData(fileName);
    if(file) {
      await uploadController.upload([file], format);
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

  const onClickCreateDemo = () => {
    if (uploadState.step != STEP.LOADING) {
      setUploadState({ step: STEP.UPLOAD, demo: true });
    }
  };

  const onUpload = async () => { // start of upload
    const files = await showFileDialog();
    await uploadController.upload(files);
  };

  const onLoading = () => {
    updateUploadState({ step: STEP.LOADING });
  };

  /** 
   * Called after the file has been uploaded and quick-parsed for basic info.
   * @param fileInfo The object returned by readTextFile/readExcelFile in data-file-reader.js
   */
  const onFileUploaded = async (fileInfo) => {
    const { numericCols, geneCols } = fileInfo;
    // Make guesses for these initial values
    const rnaseqClasses = guessRnaseqClasses(numericCols);
    const rankCol = numericCols[0];
    const geneCol = geneCols[0];

    setUploadState({ step: STEP.COLUMNS, fileInfo, geneCol, rankCol, rnaseqClasses }); 
  };

  /**
   * fileFormat is a separate argument because its a ref in the StartDialog
   */
  const onSubmit = async (demo, fileFormat) => {
    console.log('onSubmit', uploadState, demo);
    requestID = uuid.v4();
    updateUploadState({ step: STEP.LOADING });

    if(demo === 'demo') {
      await uploadController.createDemoNetwork(requestID);
      return;
    }

    const { fileInfo } = uploadState; // fileInfo comes from the quick-parse done by data-file-reader.js
    const { geneCol, rankCol, rnaseqClasses } = uploadState; // comes from the user's choices in the wizard

    // If validation fails it will call the onError event handler below
    await uploadController.validateAndSendDataToEMService(fileInfo, fileFormat, geneCol, rankCol, rnaseqClasses, requestID);
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
    if(networkID === 'blah') {
      onCancel();
      return;
    }

    if(requestID && cancelledRequests.includes(requestID)) {
      console.log(`Ignoring cancelled request: { networkID:${networkID}, requestID:${requestID} }`);
      return;
    }
    showNetwork(networkID);
  };

  const onRecentNetworksRefresh = () => {
    recentNetworksController.getRecentNetworksLength(length => setShowRecentNetworks(length > 0));
  };

  /** Render Components */
  return (
    <div className={classNames({ [classes.root]: true, [classes.rootDropping]: droppingFile })}>
      <Header
        menuDef={menuDef}
        showRecentNetworks={showRecentNetworks}
        mobile={mobile}
        tablet={tablet}
        onClickGetStarted={onClickGetStarted}
        onOpenMobileMenu={onOpenMobileMenu}
      />
      <Container maxWidth="lg" disableGutters className={classes.main}>
        <div
          className={classes.drop} 
          onDrop={onDropUpload} 
          onDragOver={onDragOverUpload} 
          onDragLeave={onDragEndUpload} 
          onDragEnd={onDragEndUpload}
        >
          <Grid container direction="column" justifyContent="center" alignItems="center">
            <Grid item className={classes.heroSection} xs={12}>
              <RecentNetworksList
                isMobile={mobile}
                recentNetworksController={recentNetworksController}
                onRefresh={onRecentNetworksRefresh}
              />
            </Grid>
            <Grid item>
              <Grid
                container
                className={clsx(classes.content, { [classes.contentWithRecentNetworks]: showRecentNetworks })}
                direction={mobile || tablet ? 'column' : 'row'}
                justifyContent="center"
                alignItems="center"
              >
                <Grid item xs={mobile || tablet ? 12 : 6}>
                  <Grid container direction="column" justifyContent="center" alignItems="center">
                    <Grid item>
                      <Typography variant="h1" className={classes.tagline}>Enrichment analysis for your RNA&#8209;Seq</Typography>
                    </Grid>
                    <Grid item>
                      <p className={classes.description}>
                        Get a quick-and-easy, publication-ready enrichment figure for your two-case RNA&#8209;Seq experiment.
                      </p>
                    </Grid>
                    <Grid item className={classes.heroSection}>
                      {mobile || tablet 
                        ? <Figure /> 
                        : <GetStartedSection mobile={mobile} tablet={tablet} onClickGetStarted={onClickGetStarted} onClickCreateDemo={onClickCreateDemo} />
                      }
                    </Grid>
                  {(mobile || tablet) && (
                    <Grid item className={classes.heroSection}>
                      <GetStartedSection mobile={mobile} tablet={tablet} onClickGetStarted={onClickGetStarted} onClickCreateDemo={onClickCreateDemo} />
                    </Grid>
                  )}
                  </Grid>
                </Grid>
              {!mobile && !tablet && (
                <Grid item className={classes.heroSection} xs={6}>
                  <Figure />
                </Grid>
              )}
              </Grid>
            </Grid>
          </Grid>
          <LogoBar mobile={mobile} />
        </div>
      </Container>
      <section id="faq" className={clsx(classes.section, classes.alternateSection)} >
        <Container maxWidth="lg" className={classes.sectionContainer}>
          <Typography variant="h2" className={classes.sectionTitle}>Frequently asked questions</Typography>
          <Typography className={classes.sectionDescription}>
            If you have anything else you would like to ask, please <LinkOut href="https://baderlab.org/">reach out to us</LinkOut>.
          </Typography>
          <Faq />
        </Container>
      </section>
      <section id="about" className={classes.section}>
        <Container maxWidth="md" className={classes.sectionContainer}>
          <About />
        </Container>
      </section>
      <Footer mobile={mobile} tablet={tablet} />
      <MobileMenu menuDef={menuDef} open={openMobileMenu} onClose={onCloseMobileMenu} />
    {uploadState.step !== STEP.WAITING && (
      <StartDialog
        step={uploadState.step}
        isMobile={mobile}
        isDemo={uploadState.demo}
        errorMessages={uploadState.errorMessages}
        fileInfo={uploadState.fileInfo}

        geneCol={uploadState.geneCol}
        rankCol={uploadState.rankCol}
        rnaseqClasses={uploadState.rnaseqClasses}
        
        onClassesChanged={(rnaseqClasses) => updateUploadState({ rnaseqClasses })}
        onRankColChanged={(rankCol) => updateUploadState({ rankCol })}
        onGeneColChanged={(geneCol) => updateUploadState({ geneCol })}

        onUpload={onUpload}
        onSubmit={onSubmit}
        onCancelled={onCancel}
        onBack={onBack}
      />
    )}
      <Debug 
        sampleFiles={sampleFiles} 
        onLoadSampleNetwork={loadSampleNetwork} 
      />
    </div>
  );
}
Content.propTypes = {
  recentNetworksController: PropTypes.instanceOf(RecentNetworksController).isRequired,
};

//==[ Figure ]========================================================================================================

const useFigureStyles = makeStyles(theme => ({
  figure: {
    maxWidth: '100%',
    maxHeight: 398,
    objectFit: 'contain',
    border: `4px solid ${theme.palette.divider}`,
    borderRadius: 8,
    boxShadow: '0 20px 25px -5px rgb(0, 0, 0, 0.1), 0 8px 10px -36px rgb(0, 0, 0, 0.1)',
    [theme.breakpoints.down('md')]: {
      marginBottom: theme.spacing(4),
    },
    [theme.breakpoints.down('sm')]: {
      maxWidth: '80%',
      maxHeight: 300,
    },
  },
}));

function Figure() {
  const classes = useFigureStyles();
  const theme = useTheme();
  const img = theme?.palette?.mode === 'dark' ? 'hero-figure-dark.png' : 'hero-figure-light.png';

  return <img src={`/images/${img}`} alt="figure" className={classes.figure} />;
}

//==[ LogoBar ]=======================================================================================================

const useLogoBarStyles = makeStyles(theme => ({
  root: {
    marginTop: theme.spacing(12),
    [theme.breakpoints.down('sm')]: {
      marginTop: theme.spacing(4),
    },
  },
}));

function LogoBar({ mobile }) {
  const classes = useLogoBarStyles();

  return (
    <Container variant="regular" className={classes.root}>
      <Grid>
        <Grid
          container
          direction={mobile ? 'column' : 'row'}
          alignItems="center"
          justifyContent="center"
          spacing={mobile ? 2 : 10}
          className={classes.logoBar}
        >
        {logosDef.map((logo, idx) =>
          <Grid item key={idx}>
            <Logo src={logo.src} alt={logo.alt} href={logo.href} />
          </Grid>
        )}
        </Grid>
      </Grid>
    </Container>
  );
}
LogoBar.propTypes = {
  mobile: PropTypes.bool,
};

//==[ Logo ]==========================================================================================================

const useLogoStyles = makeStyles(() => ({
  logo: {
    maxHeight: 48,
  },
}));

function Logo({ src, alt, href }) {
  const classes = useLogoStyles();
  
  return (
    <LinkOut href={href} underline="none">
      <img src={src} alt={alt} className={classes.logo} />  
    </LinkOut>
  );
}
Logo.propTypes = {
  src: PropTypes.string,
  alt: PropTypes.string,
  href: PropTypes.string,
};

//==[ GetStartedSection ]=============================================================================================

const useGetStartedSectionStyles = makeStyles(() => ({
  button: {
    minHeight: 40,
  },
}));

function GetStartedSection({ mobile, tablet, onClickGetStarted, onClickCreateDemo }) {
  const classes = useGetStartedSectionStyles();

  return (
    <Grid
      container
      justifyContent={mobile || tablet ? 'center' : 'flex-start'}
      alignItems="center"
      spacing={3}
    >
      <Grid item>
        <Button
          variant="contained"
          color="primary"
          endIcon={<NavigateNextIcon />}
          className={classes.button}
          onClick={onClickGetStarted}
        >
          Get Started
        </Button>
      </Grid>
      <Grid item>
        <Link onClick={onClickCreateDemo}>View Demo Network</Link>
      </Grid>
      {/* <Grid item>
        <Button
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
  onClickCreateDemo: PropTypes.any
};

//==[ Debug ]=========================================================================================================

function Debug({ sampleFiles, onLoadSampleNetwork }) {
  const { sampleRankFiles, sampleExprFiles } = sampleFiles;
  return (
    <DebugMenu>
      <h3>Example rank input files</h3>
      <ul>
      {
        sampleRankFiles.length > 0 ?
        sampleRankFiles.map(file => (
          <li key={file}><Link onClick={() => onLoadSampleNetwork(file, PRE_RANKED)}>{file}</Link></li>
        )) :
        <li>Loading...</li>
      }
      </ul>
      <h3>Example expression input files</h3>
      <ul>
      {
        sampleExprFiles.length > 0 ?
        sampleExprFiles.map(file => (
          <li key={file}><Link onClick={() => onLoadSampleNetwork(file, RNA_SEQ)}>{file}</Link></li>
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

export default Content;