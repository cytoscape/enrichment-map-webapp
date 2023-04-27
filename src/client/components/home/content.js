import React, { Component } from 'react';
import PropTypes from 'prop-types';
import EventEmitter from 'eventemitter3';

import { linkoutProps } from '../defaults';
import { UploadController } from './upload-controller';
import UploadPanel from './upload-panel';
import ClassSelector from './class-selector';
import { DebugMenu } from '../../debug-menu';
import theme from '../../theme';

import { withStyles } from '@material-ui/core/styles';

import { AppBar, Toolbar } from '@material-ui/core';
import { Container, Paper, Grid, Divider, } from '@material-ui/core';
import { IconButton, Button, Typography, Link } from '@material-ui/core';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@material-ui/core';
import { CircularProgress } from '@material-ui/core';

import MenuIcon from '@material-ui/icons/Menu';
import NavigateNextIcon from '@material-ui/icons/NavigateNext';
import PlayCircleFilledIcon from '@material-ui/icons/PlayCircleFilled';
import WarningIcon from '@material-ui/icons/Warning';
import FormatQuoteIcon from '@material-ui/icons/FormatQuote';
import FileCopyOutlinedIcon from '@material-ui/icons/FileCopyOutlined';
import { AppLogoIcon } from '../svg-icons';

import classNames from 'classnames';


const STEP = {
  WAITING: 'WAITING',
  UPLOAD:  'UPLOAD',
  LOADING: 'LOADING',
  CLASSES: 'CLASSES',
  ERROR:   'ERROR',
};

const CITATION = 'Merico, D., Isserlin, R., Stueker, O., Emili, A., & Bader, G. D. (2010). Enrichment map: a network-based method for gene-set enrichment visualization and interpretation. PloS one, 5(11), e13984. https://doi.org/10.1371/journal.pone.0013984';

const LOGOS = [
  { src: "/images/bader-lab-logo.svg", alt: "Bader Lab logo", href: "https://baderlab.org/" },
  { src: "/images/cytoscape-consortium-logo.svg", alt: "Cytoscape Consortium logo", href: "http://www.cytoscapeconsortium.org/" },
  { src: "/images/donnelly-logo.png", alt: "The Donnelly Centre logo", href: "https://thedonnellycentre.utoronto.ca/" },
  { src: "/images/uoft-logo.svg", alt: "UofT logo", href: "https://www.utoronto.ca/" },
];

// globally cached
let sampleFiles = [];
let sampleRankFiles = [];
let sampleExpressionFiles = [];

export class Content extends Component {

  constructor(props) {
    super(props);

    this.bus = new EventEmitter();
    this.controller = new UploadController(this.bus);

    const isMobile = this.isMobile();

    this.state = {
      step: STEP.WAITING,
      errorMessages: null,
      sampleFiles,
      sampleRankFiles,
      sampleExpressionFiles,
      isDroppingFile: false,
      isMobile: isMobile,
    };

    this.onLoading = this.onLoading.bind(this);
    this.onClasses = this.onClasses.bind(this);
    this.onFinished = this.onFinished.bind(this);
    this.onError = this.onError.bind(this);
    this.handleResize = this.handleResize.bind(this);

    window.addEventListener("resize", this.handleResize);
  }

  componentDidMount() {
    this.bus.on('loading', this.onLoading);
    this.bus.on('classes', this.onClasses);
    this.bus.on('finished', this.onFinished);
    this.bus.on('error', this.onError);

    this.loadSampleFiles();
  }

  componentWillUnmount() {
    this.bus.removeAllListeners();
    this.rnaseqClasses = null;
  }

  onLoading() {
    this.setState({ step: STEP.LOADING });
  }

  onClasses({ format, columns, contents, name }) {
    this.setState({ step: STEP.CLASSES, format, columns, contents, name });
  }

  onFinished(netID) {
    this.showNetwork(netID);
  }

  onError(errorMessages) {
    this.setState({ step: STEP.ERROR, errorMessages });
  }

  handleResize() {
    const isMobile = this.isMobile();
    if (this.state.isMobile !== isMobile) {
      this.setState({ isMobile });
    }
  }

  isMobile() {
    return window.innerWidth < theme.breakpoints.values.sm;
  }

  async loadSampleFiles() {
    if (sampleFiles.length > 0) { return; } // already loaded

    const res = await fetch('/api/sample-data');
    const files = await res.json();

    sampleFiles = files;
    sampleRankFiles = files.filter(f => f.endsWith('.rnk'));
    sampleExpressionFiles = files.filter(f => !f.endsWith('.rnk'));

    this.setState({ sampleFiles, sampleRankFiles, sampleExpressionFiles }); // re-render on load
  }

  showNetwork(id, secret) {
    // location.href = `/document/${id}/${secret}`;
    location.href = `/document/${id}`;
  }

  async onLoadSampleNetwork(fileName) {
    if (this.state.step == STEP.LOADING)
      return;

    const dataurl = `/sample-data/${fileName}`;
    const sdRes = await fetch(dataurl);
    
    if (!sdRes.ok) {
      this.setState({ step: STEP.ERROR, errorMessages: ["Error loading sample network"] });
      this.controller.captureNondescriptiveErrorInSentry('Error loading sample network');
      return;
    }
    
    const data = await sdRes.text();
    const file = new File([data], fileName, { type: 'text/plain' });
    await this.controller.upload([file]);
  }

  async onDropUpload(event) {
    event.preventDefault();

    if (this.state.step == STEP.LOADING)
      return;

    const files = (
      Array.from(event.dataTransfer.items)
        .filter(item => item.kind === 'file')
        .map(item => item.getAsFile())
    );

    this.setState({ isDroppingFile: false });

    await this.controller.upload(files);
  }

  onDragOverUpload(event) {
    event.preventDefault();
    this.setState({ isDroppingFile: true });
  }

  onDragEndUpload(event) {
    event.preventDefault();
    this.setState({ isDroppingFile: false });
  }

  async onClickGetStarted() {
    if (this.state.step != STEP.LOADING)
      this.setState({ step: STEP.UPLOAD });
  }

  async onClickUpload() {
    const files = await this.showFileDialog();
    await this.controller.upload(files);
  }

  async onClickSubmit() {
    const { format, contents, name } = this.state;
    this.setState({ step: STEP.LOADING });

    console.log(">>>> Submit:");
    console.log(name);
    console.log(format);
    console.log(contents);
    console.log(this.rnaseqClasses);
    
    const emRes = await this.controller.sendDataToEMService(contents, format, 'rnaseq', name, this.rnaseqClasses);
    
    if (emRes.errors) {
      this.setState({ step: STEP.ERROR, errorMessages: emRes.errors, contents: null });
      this.controller.captureNondescriptiveErrorInSentry('Error in sending uploaded RNASEQ data to service');
      return;
    }

    this.showNetwork(emRes.netID);
}

  async cancel() {
    this.setState({ step: STEP.WAITING, columns: null, contents: null, name: null,  errorMessages: null });
  }

  async showFileDialog() {
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

  render() {
    const { classes } = this.props;
    const { isDroppingFile } = this.state;

    return (
      <div className={classNames({ [classes.root]: true, [classes.rootDropping]: isDroppingFile })}>
        { this.renderHeader() }
        <Container maxWidth="lg" disableGutters>
          { this.renderMain() }
          { this.renderDebug() }
          { this.renderFooter() }
        </Container>
      </div>
    );
  }

  renderHeader() {
    const { classes } = this.props;

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
                    <Typography variant="inherit" className={classes.logoText}>EnrichmentMap</Typography>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
            <div className={classes.grow} />
            <div className={classes.sectionDesktop}>
              <Button className={classes.menu} variant="text" color="inherit">About</Button>
              <Button className={classes.menu} variant="text" color="inherit">Contact</Button>
              <Button className={classes.menu} variant="text" color="inherit">Help</Button>
            </div>
            <div className={classes.sectionMobile}>
              <IconButton
                aria-label="show more"
                // aria-controls={mobileMenuId}
                aria-haspopup="true"
                // onClick={handleMobileMenuOpen}
                color="inherit"
              >
                <MenuIcon />
              </IconButton>
            </div>
          </Toolbar>
        </Container>
      </AppBar>
    );
  }

  renderMain() {
    const { step, isMobile } = this.state;
    const { classes } = this.props;

    const LoadingProgress = () => 
      <div className={classes.progress}>
        <CircularProgress color="primary" />
        <Typography component="p" variant="body1">Preparing your figure...</Typography>
      </div>;

    const ErrorReport = () => {
      const { errorMessages } = this.state;
      
      return (
        <div className={classes.progress}>
          <WarningIcon fontSize="large" color="error" />
          {
            (!errorMessages || errorMessages.length == 0)
            ? <>
                <Typography variant="body1">We were unable to process your experimental data.</Typography>
                <br />
                <Typography variant="body2" color="secondary">
                  Please ensure that your data is formatted properly,<br />either in <i>RNA-Seq Expression</i> format or in <i>Pre-Ranked Gene</i> format.
                </Typography>
              </>
            : errorMessages.slice(0,7).map((message, index) =>
                <p key={index}>{message}</p>
              )
          }
        </div>
      );
    };

    const Classes = () => 
      <ClassSelector 
        columns={this.state.columns} 
        onClassesChanged={classes => this.rnaseqClasses = classes}
      />;

    const StartDialog = ({ step, isMobile }) => {
      const open = step !== STEP.WAITING;

      return (
        <Dialog maxWidth="sm" fullScreen={isMobile} open={open}>
          <DialogTitle>
          {
            {
              'UPLOAD':  () => 'Upload your Data',
              'CLASSES': () => 'Groups',
              'LOADING': () => 'Loading',
              'ERROR':   () => 'Error',
            }[step]()
          }
          </DialogTitle>
          <DialogContent dividers>
          { 
            {
              'UPLOAD':  () => <UploadPanel isMobile />,
              'CLASSES': () => <Classes />,
              'LOADING': () => <LoadingProgress />,
              'ERROR':   () => <ErrorReport />,
            }[step]()
          }
          </DialogContent>
          <DialogActions>
            <Button autoFocus variant="outlined" color="primary" onClick={() => this.cancel()}>
              { step == STEP.ERROR ? 'OK' : 'Cancel' }
            </Button>
            {step == STEP.UPLOAD && (
              <Button variant="contained" color="primary" onClick={() => this.onClickUpload()}>
                Upload File
              </Button>
            )}
            {step == STEP.CLASSES && (
              <Button variant="contained" color="primary" onClick={() => this.onClickSubmit()}>
                Submit
              </Button>
            )}
          </DialogActions>
        </Dialog>
      );
    };

    return (
      <div
        className={classes.drop} 
        onDrop={e => this.onDropUpload(e)} 
        onDragOver={e => this.onDragOverUpload(e)} 
        onDragLeave={e => this.onDragEndUpload(e)} 
        onDragEnd={e => this.onDragEndUpload(e)}
      >
        <Grid container className={classes.content} direction={isMobile ? 'row' : 'column'} justifyContent="center" alignItems="center">
          <Grid item xs={isMobile ? 12 : 6}>
            <Grid container justifyContent="center" alignItems="center">
              <Grid item>
                <Typography variant="h1" className={classes.tagline}>Enrichment analysis for your RNA-Seq</Typography>
              </Grid>
              <Grid item>
                <p className={classes.description}>
                  Get a quick-and-easy, publication-ready enrichment figure for your two-case RNA-Seq experiment.
                </p>
              </Grid>
              <Grid item className={classes.section}>
                <Grid container justifyContent="flex-start" alignItems="center" spacing={3}>
                  <Grid item>
                    <Button
                      className={classes.startButton}
                      variant="contained"
                      color="primary"
                      endIcon={<NavigateNextIcon />}
                      onClick={e => this.onClickGetStarted(e)}
                    >
                      Get Started
                    </Button>
                  </Grid>
                  <Grid item>
                    <Button
                      className={classes.demoButton}
                      variant="text"
                      color="primary"
                      startIcon={<PlayCircleFilledIcon />}
                    >
                      Watch Demo
                    </Button>
                  </Grid>
                </Grid>
              </Grid>
              <Grid item className={classes.section} style={{ textAlign: 'right' }}>
                <Paper className={classes.cite} variant="outlined">
                  <FormatQuoteIcon className={classes.citeLogo} /><br />
                  <Link className={classes.citeLink} href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2981572/" {...linkoutProps}>
                    { CITATION }
                  </Link>
                </Paper>
                <Button
                  className={classes.copyButton}
                  aria-label="copy citation"
                  variant="text"
                  startIcon={<FileCopyOutlinedIcon />}
                  onClick={() => navigator.clipboard.writeText(CITATION)}
                >
                  Copy
                </Button>
              </Grid>
            </Grid>
          </Grid>
          <Grid item xs={isMobile ? 12 : 6}>
            <img src="/images/home-figure.png" alt="figure" className={classes.figure} />
          </Grid>
        </Grid>
        {step !== STEP.WAITING && (
          <StartDialog step={step} isMobile={isMobile} />
        )}
      </div>
    );
  }

  renderFooter() {
    const { isMobile } = this.state;
    const { classes } = this.props;

    const Logo = ({ src, alt, href }) =>
      <Link href={href} target="_blank" rel="noreferrer" underline="none">
        <img src={src} alt={alt} className={classes.footerLogo} />  
      </Link>
    ;

    return (
        <Container maxWidth="lg" disableGutters>
          <Divider />
          <Toolbar variant="regular" className={classes.footer}>
            <Grid container direction={isMobile ? 'column' : 'row'} alignItems="center" justifyContent={isMobile ? 'space-around' : 'space-between'}>
              <Grid item>
                &copy; {new Date().getFullYear()} University of Toronto
              </Grid>
              <Grid item>
                <Grid container direction={isMobile ? 'column' : 'row'} alignItems="flex-start" justifyContent={isMobile ? 'space-around' : 'space-between'} spacing={5}>
                { LOGOS.map((logo, idx) =>
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

  renderDebug() {
    const { sampleRankFiles } = this.state;

    return (
      <DebugMenu>
        <h3>Example rank input files</h3>
        <ul>
          {
            sampleRankFiles.length > 0 ?
            sampleRankFiles.map(file => (
              <li key={file}><Link component="a" style={{ cursor: 'pointer' }}  onClick={() => this.onLoadSampleNetwork(file)}>{file}</Link></li>
            )) :
            <li>Loading...</li>
          }
        </ul>
        <h3>Example expression input files</h3>
        <ul>
          {
            sampleExpressionFiles.length > 0 ?
            sampleExpressionFiles.map(file => (
              <li key={file}><Link component="a" style={{ cursor: 'pointer' }}  onClick={() => this.onLoadSampleNetwork(file)}>{file}</Link></li>
            )) :
            <li>Loading...</li>
          }
        </ul>
      </DebugMenu>
    );
  }
}


const useStyles = theme => ({
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
  // grid: {
  //   boxSizing: 'border-box',
  //   margin: '0 auto',
  //   maxWidth: '98%',
  //   textAlign: 'center',
  //   width: 1333,
  // },
  // header: {
    
  // },
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
  sectionDesktop: {
    display: 'none',
    [theme.breakpoints.up('md')]: {
      display: 'flex',
    },
  },
  sectionMobile: {
    display: 'flex',
    [theme.breakpoints.up('md')]: {
      display: 'none',
    },
  },
  menu: {
    marginLeft: theme.spacing(5),
    textTransform: 'unset',
  },
  content: {
    maxHeight: 700,
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(10),
    padding:  theme.spacing(2),
    textAlign: 'left',
  },
  tagline: {
    fontWeight: 800,
    fontSize: 'clamp(2rem, 1rem + 2.5vw, 3.5rem)',
    [theme.breakpoints.up('md')]: {
      marginTop: theme.spacing(5),
    },
    [theme.breakpoints.down('md')]: {
      marginTop: theme.spacing(2.5),
    },
    [theme.breakpoints.down('sm')]: {
      marginTop: theme.spacing(0),
      textAlign: 'center',
    },
  },
  description : {
    // fontSize: '1rem',
    color: theme.palette.secondary.main,
    marginTop: theme.spacing(2.5),
    marginBottom: theme.spacing(5),
    [theme.breakpoints.down('sm')]: {
      textAlign: 'center',
    },
  },
  section: {
    width: '100%',
    [theme.breakpoints.up('sm')]: {
      marginTop: theme.spacing(2.5),
    },
    [theme.breakpoints.down('sm')]: {
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
  cite: {
    marginTop: theme.spacing(10),
    padding: theme.spacing(2),
    paddingTop: theme.spacing(0),
    textAlign: 'left',
    fontFamily: 'Monaco,Courier New,Monospace',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  citeLogo: {
    position: 'absolute',
    color: theme.palette.background.default,
    marginTop: theme.spacing(-2),
    marginLeft: theme.spacing(-4),
    background: theme.palette.divider,
    borderRadius: '50%',
    width: 30,
    height: 30,
  },
  citeLink: {
    fontSize: '0.75rem',
    color: theme.palette.text.secondary,
    filter: 'opacity(50%)',
  },
  copyButton: {
    marginTop: theme.spacing(0.5),
    fontSize: '0.75rem',
    color: theme.palette.text.secondary,
    filter: 'opacity(50%)',
  },
  progress: {
    display: 'flex',
    flexDirection: 'column',
    alignContent: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 320,
    textAlign: 'center',
  },
  figure: {
    maxWidth: '100%',
    height: 'auto',
  },
  footer: {
    marginTop: theme.spacing(2),
    color: theme.palette.secondary.main,
  },
  footerLogo: {
    maxHeight: 48,
    filter: 'grayscale(1) opacity(50%)',
  },
});

Content.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(useStyles)(Content);