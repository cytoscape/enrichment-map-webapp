import React, { Component } from 'react';
import PropTypes from 'prop-types';
import EventEmitter from 'eventemitter3';

import { linkoutProps } from '../defaults';
import { UploadController } from './upload-controller';
import { DebugMenu } from '../../debug-menu';
import StartDialog from './start-dialog';
import theme from '../../theme';

import { withStyles } from '@material-ui/core/styles';

import { AppBar, Toolbar, Menu, MenuList, MenuItem } from '@material-ui/core';
import { Container, Paper, Grid, Divider, } from '@material-ui/core';
import { IconButton, Button, Typography, Link } from '@material-ui/core';

import MenuIcon from '@material-ui/icons/Menu';
import NavigateNextIcon from '@material-ui/icons/NavigateNext';
import PlayCircleFilledIcon from '@material-ui/icons/PlayCircleFilled';
import FormatQuoteIcon from '@material-ui/icons/FormatQuote';
import { AppLogoIcon } from '../svg-icons';

import classNames from 'classnames';


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

const isMobileWidth = () => {
  return window.innerWidth <= theme.breakpoints.values.sm;
};

const isTabletWidth = () => {
  return !isMobileWidth() && window.innerWidth <= theme.breakpoints.values.md;
};

// globally cached
let sampleFiles = [];
let sampleRankFiles = [];
let sampleExpressionFiles = [];

export class Content extends Component {

  constructor(props) {
    super(props);

    this.bus = new EventEmitter();
    this.controller = new UploadController(this.bus);

    const isMobile = isMobileWidth();
    const isTablet = isTabletWidth();

    this.state = {
      step: STEP.WAITING,
      mobileMoreAnchorEl: null,
      errorMessages: null,
      sampleFiles,
      sampleRankFiles,
      sampleExpressionFiles,
      isDroppingFile: false,
      isMobile: isMobile,
      isTablet: isTablet,
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
    const isMobile = isMobileWidth();
    const isTablet = isTabletWidth();

    if (this.state.isMobile !== isMobile || this.state.isTablet !== isTablet) {
      this.setState({ isMobile, isTablet });
    }
  }

  openMobileMenu(event) {
    this.setState({ mobileMoreAnchorEl: event.currentTarget });
  }

  closeMobileMenu() {
    this.setState({ mobileMoreAnchorEl: null });
  }

  onClickMenu(menu) {
    // TODO...
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

  onClassesChanged(rnaseqClasses) {
    this.rnaseqClasses = rnaseqClasses;
  }

  cancel() {
    // this.controller.cancel();
    this.setState({ step: STEP.WAITING, format: null, columns: null, contents: null, name: null,  errorMessages: null });
  }

  async onUpload() {
    const files = await this.showFileDialog();
    await this.controller.upload(files);
  }

  async onSubmit() {
    const { format, contents, name } = this.state;

    this.setState({ step: STEP.LOADING });

    const emRes = await this.controller.sendDataToEMService(contents, format, 'rnaseq', name, this.rnaseqClasses);
    
    if (emRes.errors) {
      this.setState({ step: STEP.ERROR, errorMessages: emRes.errors, contents: null });
      this.controller.captureNondescriptiveErrorInSentry('Error in sending uploaded RNASEQ data to service');
      return;
    }

    this.showNetwork(emRes.netID);
  }

  onBack() {
    if (this.state.step === 'CLASSES')
      this.setState({ step: STEP.UPLOAD, format: null, columns: null, contents: null, name: null, errorMessages: null });
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
          {/* { this.renderMobileMenu() } */}
          { this.renderDebug() }
          { this.renderFooter() }
        </Container>
      </div>
    );
  }

  renderMobileMenu() {
    const { mobileMoreAnchorEl } = this.state;

    return (
      <Menu
        anchorEl={mobileMoreAnchorEl}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        id={mobileMenuId}
        keepMounted
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        open={Boolean(mobileMoreAnchorEl)}
        onClose={() => this.closeMobileMenu()}
      >
        <MenuList>
        {menusDef.map((menu, idx) => (
          <MenuItem key={idx} onClick={() => this.onClickMenu(menu)}>
            { menu.label }
          </MenuItem>
        ))}
        </MenuList>
      </Menu>
    );
  }

  renderHeader() {
    const { isTablet, isMobile } = this.state;
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
          {/* {!isTablet && !isMobile ?
            <Toolbar>
            {menusDef.map((menu, idx) => (
              <Button key={idx} className={classes.menu} variant="text" color="inherit" onClick={() => this.onClickMenu(menu)}>
                { menu.label }
              </Button>
            ))}
            </Toolbar>
          :
            <IconButton
              aria-label="show more"
              aria-controls={mobileMenuId}
              aria-haspopup="true"
              onClick={(evt) => this.openMobileMenu(evt)}
              color="inherit"
            >
              <MenuIcon />
            </IconButton>
          } */}
          </Toolbar>
        </Container>
      </AppBar>
    );
  }

  renderMain() {
    const { step, isMobile, format, columns, contents } = this.state;
    const { classes } = this.props;

    const EasyCitation = () =>
      <Grid container direction="column" alignItems="flex-end">
        <Paper className={classes.cite} variant="outlined">
          <FormatQuoteIcon className={classes.citeLogo} />
          <Typography className={classes.citeText}>
            <Link className={classes.citeLink} href="https://doi.org/10.1038/s41596-018-0103-9" {...linkoutProps}>
              Reimand, J., Isserlin, R. et al.&nbsp;
              Pathway enrichment analysis and visualization of omics data using g:Profiler, GSEA, Cytoscape and EnrichmentMap.&nbsp;
              Nat Protoc 14, 482–517 (2019).
            </Link>&nbsp;
          </Typography>
        </Paper>
      </Grid>
    ;

    return (
      <div
        className={classes.drop} 
        onDrop={e => this.onDropUpload(e)} 
        onDragOver={e => this.onDragOverUpload(e)} 
        onDragLeave={e => this.onDragEndUpload(e)} 
        onDragEnd={e => this.onDragEndUpload(e)}
      >
        <Grid container direction="column" justifyContent="center" alignItems="center">
          <Grid item>
            <Grid
              container
              className={classes.content}
              direction={isMobile ? 'column' : 'row'}
              justifyContent="center"
              alignItems="center"
              spacing={2}
            >
              <Grid item xs={isMobile ? 12 : 6}>
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
                    {isMobile ? this.renderFigure() : this.renderGetStartedSection()}
                  </Grid>
                {isMobile && (
                  <Grid item className={classes.section}>
                    { this.renderGetStartedSection() }
                  </Grid>
                )}
                </Grid>
              </Grid>
            {!isMobile && (
              <Grid item className={classes.section} xs={6}>
                { this.renderFigure() }
              </Grid>
            )}
            </Grid>
          </Grid>
          <Grid item xs={isMobile ? 10 : 8}>
            <EasyCitation />
          </Grid>
        {step !== STEP.WAITING && (
          <Grid item>
            <StartDialog
              step={step}
              isMobile={isMobile}
              format={format}
              columns={columns}
              contents={contents}
              onUpload={() => this.onUpload()}
              onClassesChanged={(arr) => this.onClassesChanged(arr)}
              onSubmit={() => this.onSubmit()}
              onCancelled={() => this.cancel()}
              onBack={() => this.onBack()}
            />
          </Grid>
        )}
        </Grid>
      </div>
    );
  }

  renderGetStartedSection() {
    const { isMobile, isTablet } = this.state;
    const { classes } = this.props;

    return (
      <Grid
        container
        justifyContent={isMobile || isTablet ? 'center' : 'flex-start'}
        alignItems="center"
        spacing={3}
      >
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

  renderFigure = () => {
    const { classes } = this.props;

    return (
      <img src="/images/home-figure.png" alt="figure" className={classes.figure} />
    );
  };

  renderFooter() {
    const { isMobile, isTablet } = this.state;
    const { classes } = this.props;

    return (
        <Container maxWidth="lg" disableGutters className={classes.footer}>
          <Divider />
          <Toolbar variant="regular" className={classes.logoBar}>
            <Grid
              container
              direction={isMobile || isTablet ? 'column' : 'row'}
              alignItems={isMobile || isTablet ? 'center' : 'flex-start'}
              justifyContent={isMobile ? 'space-around' : 'space-between'}
            >
              <Grid item className={classes.copyright} md={4} sm={12}>
                &copy; {new Date().getFullYear()} University of Toronto
              </Grid>
              <Grid item md={8} sm={12}>
                <Grid
                  container
                  direction={isMobile ? 'column' : 'row'}
                  alignItems={isMobile ? 'center' : 'flex-start'}
                  justifyContent={isMobile ? 'space-around' : 'space-between'}
                  spacing={5}
                >
              {logosDef.map((logo, idx) =>
                <Grid key={idx} item>
                  { this.renderLogo(logo) }
                </Grid>
              )}
                </Grid>
              </Grid>
            </Grid>
          </Toolbar>
        </Container>
    );
  }

  renderLogo({ src, alt, href }) {
    const { classes } = this.props;

    return (
      <Link href={href} target="_blank" rel="noreferrer" underline="none">
        <img src={src} alt={alt} className={classes.footerLogo} />  
      </Link>
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
  cite: {
    marginTop: theme.spacing(2),
    marginLeft: theme.spacing(-2),
    padding: theme.spacing(2),
    paddingTop: 0,
    maxWidth: 660,
    textAlign: 'left',
    fontFamily: 'Monaco,Courier New,Monospace',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    [theme.breakpoints.down('xs')]: {
      marginTop: theme.spacing(6),
    },
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
  citeText: {
    marginTop: theme.spacing(2),
    fontSize: '0.85rem',
    color: theme.palette.text.secondary,
    filter: 'opacity(50%)',
  },
  citeLink: {
    color: theme.palette.text.primary,
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
});

Content.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(useStyles)(Content);