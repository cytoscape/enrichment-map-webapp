import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { linkoutProps } from '../defaults';
import { readTextFile, readExcelFile } from './data-file-reader';
import ClassSelector from './class-selector';
import { DebugMenu } from '../../debug-menu';
import theme from '../../theme';

import { SENTRY } from '../../env';

import { withStyles } from '@material-ui/core/styles';

import { AppBar, Toolbar } from '@material-ui/core';
import { Container, Paper, Grid, Divider, } from '@material-ui/core';
import { IconButton, Button, Typography, Link } from '@material-ui/core';
import { CircularProgress } from '@material-ui/core';

import MenuIcon from '@material-ui/icons/Menu';
import NavigateNextIcon from '@material-ui/icons/NavigateNext';
import PlayCircleFilledIcon from '@material-ui/icons/PlayCircleFilled';
import WarningIcon from '@material-ui/icons/Warning';
import FormatQuoteIcon from '@material-ui/icons/FormatQuote';
import FileCopyOutlinedIcon from '@material-ui/icons/FileCopyOutlined';
import { AppLogoIcon } from '../svg-icons';

import * as Sentry from "@sentry/browser";

import classNames from 'classnames';
import { auto } from '@popperjs/core';

const STEP = {
  WAITING: 'WAITING',
  LOADING: 'LOADING',
  CLASSES: 'CLASSES',
  ERROR:   'ERROR'
};

const FILE_EXT_REGEX = /\.[^/.]+$/;
const TSV_EXTS = ['txt', 'rnk', 'tsv', 'csv', 'gct'];
const EXCEL_EXTS = ['xls', 'xlsx'];

// globally cached
let sampleFiles = [];
let sampleRankFiles = [];
let sampleExpressionFiles = [];

class NondescriptiveHandledError extends Error { // since we don't have well-defined errors
  constructor(message) {
    message = message ?? 'A non-descriptive error occurred.  Check the attached file.';
    super(message);
  }
}

const captureNondescriptiveErrorInSentry = (errorMessage) => {
  if (SENTRY) {
    Sentry.captureException(new NondescriptiveHandledError(errorMessage));
    console.error('Reporting browser error to Sentry: ' + errorMessage);
  }
};

export class Content extends Component {

  constructor(props) {
    super(props);

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

    this.handleResize = this.handleResize.bind(this);

    window.addEventListener("resize", this.handleResize);
  }

  componentDidMount() {
    this.loadSampleFiles();
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

  async sendDataToEMService(text, format, type, networkName, classesArr) {
    let url;
    if (type === 'ranks') {
      url = '/api/create/preranked?' + new URLSearchParams({ networkName });
    } else if(type === 'rnaseq') {
      const classes = classesArr.join(',');
      url = '/api/create/rnaseq?' + new URLSearchParams({ classes, networkName });
    } 

    const contentType = format === 'tsv' ? 'text/tab-separated-values' : 'text/csv';
    
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body: text
    });

    if (res.ok) {
      const netID = await res.text();
      return { netID };
    } else if(res.status == 413) {
      // Max file size for uploads is defined in the tsvParser in the server/routes/api/index.js file.
      return { errors: ["The uploaded file is too large. The maximum file size is 50 MB." ] };
    } else {
      return { errors: [] }; // empty array shows generic error message
    }
  }

  async onLoadSampleNetwork(fileName) {
    const dataurl = `/sample-data/${fileName}`;
    const sdRes = await fetch(dataurl);
    if (!sdRes.ok) {
      this.setState({ step: STEP.ERROR, errorMessages: ["Error loading sample network"] });
      captureNondescriptiveErrorInSentry('Error loading sample network');
      return;
    }
    
    const data = await sdRes.text();

    const file = new File([data], fileName, { type: 'text/plain' });
    await this.onDropzoneFileLoad([file]);
  }

  async onDropzoneFileLoad(files) {
    // This is just for ranks TSV for now
    if (this.state.step == STEP.LOADING)
      return;

    const file = files && files.length > 0 ? files[0] : null;
    if (!file)
      return;
   
    this.setState({ step: STEP.LOADING });
    const name = file.name.replace(FILE_EXT_REGEX, '');
    const ext  = file.name.split('.').pop().toLowerCase();

    if (SENTRY) {
      const attachmentName = file.name;
      const attachmentContentType = file.type;
      const arrayBuffer = await file.arrayBuffer();
      const attachmentData = new Uint8Array(arrayBuffer);

      Sentry.configureScope(scope => {
        scope.clearAttachments();
        scope.addAttachment({ filename: attachmentName, data: attachmentData, contentType: attachmentContentType });
      });
    }

    try {
      if (TSV_EXTS.includes(ext)) {
        console.log('Reading file');
        const { type, format, columns, contents } = await readTextFile(file);
        console.log(`Reading ${format} file as ${type}, columns: ${columns}`);
  
        if (type === 'ranks') {
          const emRes = await this.sendDataToEMService(contents, format, 'ranks', name);
          if (emRes.errors) {
            this.setState({ step: STEP.ERROR, errorMessages: emRes.errors });
            captureNondescriptiveErrorInSentry('Error in EM service with uploaded rank file');
            return;
          }
          this.showNetwork(emRes.netID);
    
        } else {
          this.setState({ step: STEP.CLASSES, format, columns, contents, name });
        }

      } else if(EXCEL_EXTS.includes(ext)) {
        const { columns, contents, format } = await readExcelFile(file);
        console.log(`Reading Excel file, columns: ${columns}`);
        this.setState({ step: STEP.CLASSES, format, columns, contents, name });
      } else {
        const exts = TSV_EXTS.join(', ') + ', ' + EXCEL_EXTS.join(', ');
        this.setState({ step: STEP.ERROR, errorMessages: ["File extension not supported. Must be one of: " + exts]});
      }
    } catch(e) {
      this.setState({ step: STEP.ERROR, errorMessages: [e] });
      captureNondescriptiveErrorInSentry('Some error in handling uploaded file:' + e.message);
      return;
    }
  }

  async onRnaseqClassSubmit(classes) {
      const { format, contents, name } = this.state;
      this.setState({ step: STEP.LOADING });
      
      const emRes = await this.sendDataToEMService(contents, format, 'rnaseq', name, classes);
      if (emRes.errors) {
        this.setState({ step: STEP.ERROR, errorMessages: emRes.errors, contents: null });
        captureNondescriptiveErrorInSentry('Error in sending uploaded RNASEQ data to service');
        return;
      }
      this.showNetwork(emRes.netID);
  }

  async onDropUpload(event) {
    event.preventDefault();

    const files = (
      Array.from(event.dataTransfer.items)
        .filter(item => item.kind === 'file')
        .map(item => item.getAsFile())
    );

    this.setState({ isDroppingFile: false });

    await this.onDropzoneFileLoad(files);
  }

  onDragOverUpload(event) {
    event.preventDefault();

    this.setState({ isDroppingFile: true });
  }

  onDragEndUpload(event) {
    event.preventDefault();

    this.setState({ isDroppingFile: false });
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

  async onClickUpload() {
    const files = await this.showFileDialog();
    await this.onDropzoneFileLoad(files);
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
      <AppBar position="static" color='transparent'>
        <Container maxWidth="lg" disableGutters>
          <Toolbar variant="regular">
            <Grid container alignItems='center' justifyContent="space-between">
              <Grid item>
                <Grid container alignItems='center' spacing={2}>
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
    const { isMobile } = this.state;
    const { classes } = this.props;

    const LoadingProgress = () => 
      <Paper className={classes.form}>
        <div className={classes.progress}>
          <CircularProgress color="secondary" />
          <p>Preparing your figure.</p>
        </div>
      </Paper>;

    const ErrorReport = () => {
      const { errorMessages } = this.state;
      
      return (
        <Paper className={classes.form}>
          <div className={classes.progress}>
            <WarningIcon fontSize='large'/>
            {
              (!errorMessages || errorMessages.length == 0)
              ? <p>We were unable to process your experimental data. Please ensure that your data is formatted properly, either in differential expression format or in ranked gene format.</p>
              : errorMessages.slice(0,7).map((message, index) =>
                  <p key={index}>{message}</p>
                )
            }
            <Button variant='outlined' onClick={() => this.setState({ step: STEP.WAITING, errorMessages: null })}>OK</Button>
          </div>
        </Paper>
      );
    };

    const Classes = () => 
      <Paper className={classes.form}>
        <ClassSelector 
          columns={this.state.columns} 
          onSubmit={classes => this.onRnaseqClassSubmit(classes)} 
          onCancel={() => this.setState({ step: STEP.WAITING, columns:null, contents:null, name:null, errorMessages:null })} />
      </Paper>;

    const citationText = 'Merico, D., Isserlin, R., Stueker, O., Emili, A., & Bader, G. D. (2010). Enrichment map: a network-based method for gene-set enrichment visualization and interpretation. PloS one, 5(11), e13984. https://doi.org/10.1371/journal.pone.0013984';

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
                      onClick={e => this.onClickUpload(e)}
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
              {/* { 
                { 'WAITING': () => <RanksDropArea />,
                  'LOADING': () => <LoadingProgress />,
                  'ERROR':   () => <ErrorReport />,
                  'CLASSES': () => <Classes />,
                }[this.state.step]()
              } */}
              </Grid>
              <Grid item className={classes.section} style={{ textAlign: 'right' }}>
                <Paper className={classes.cite} variant="outlined">
                  <FormatQuoteIcon className={classes.citeLogo} /><br />
                  <Link className={classes.citeLink} href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2981572/" {...linkoutProps}>
                    {citationText}
                  </Link>
                </Paper>
                <Button className={classes.copyButton} aria-label="copy citation" variant="text" startIcon={<FileCopyOutlinedIcon />}
                onClick={() => navigator.clipboard.writeText(citationText)}>
                  Copy
                </Button>
              </Grid>
            </Grid>
          </Grid>
          <Grid item xs={isMobile ? 12 : 6}>
            <img src="/images/home-fig.png" alt="figure" className={classes.figure} />
          </Grid>
        </Grid>
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
                  <Grid item>
                    <Logo src="/images/bader-lab-logo.svg" alt="Bader Lab logo" href="https://baderlab.org/" />
                  </Grid>
                  <Grid item>
                    <Logo src="/images/cytoscape-consortium-logo.svg" alt="Cytoscape Consortium logo" href="http://www.cytoscapeconsortium.org/" />
                  </Grid>
                  <Grid item>
                    <Logo src="/images/donnelly-logo.png" alt="The Donnelly Centre logo" href="https://thedonnellycentre.utoronto.ca/" />
                  </Grid>
                  <Grid item>
                    <Logo src="/images/uoft-logo.svg" alt="UofT logo" href="https://www.utoronto.ca/" />
                  </Grid>
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
  form: {
    display: 'flex',
    flexDirection: 'column',
    alignContent: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '100%',
    textAlign: 'center',
    border: `1px solid ${theme.palette.divider}`,
  },
  progress: {
    display: 'flex',
    flexDirection: 'column',
    alignContent: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 320,
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