import EventEmitter from 'eventemitter3';
import { SENTRY } from '../../env';
import { readTextFile, readExcelFile } from './data-file-reader';

import * as Sentry from "@sentry/browser";


export const RNA_SEQ = 'rnaseq';
export const PRE_RANKED = 'ranks';

const FILE_EXT_REGEX = /\.[^/.]+$/;
const TSV_EXTS = ['txt', 'rnk', 'tsv', 'csv', 'gct'];
const EXCEL_EXTS = ['xls', 'xlsx'];

export class UploadController {
  
  /**
   * Create an instance of the controller
   * @param {EventEmitter} bus The event bus that the controller emits on after every operation
   */
  constructor(bus) {

    /** @type {EventEmitter} */
    this.bus = bus || new EventEmitter();
  }
  
  captureNondescriptiveErrorInSentry(errorMessage) {
    if (SENTRY) {
      Sentry.captureException(new NondescriptiveHandledError(errorMessage));
      console.error('Reporting browser error to Sentry: ' + errorMessage);
    }
  }


  async loadSampleData(fileName) {
    const dataurl = `/sample-data/${fileName}`;
    const sdRes = await fetch(dataurl);
    
    if (!sdRes.ok) {
      this.bus.emit('error', { errors: ["Error loading sample network"] });
      this.captureNondescriptiveErrorInSentry('Error loading sample network');
      return;
    }
    
    const data = await sdRes.text();
    const file = new File([data], fileName, { type: 'text/plain' });
    return file;
  }

  async createDemoNetwork(requestID) {
    this.bus.emit('loading', true);

    const res = await fetch('/api/create/demo', {
      method: 'POST',
    });

    if(res.ok) {
      const networkID = await res.text();
      this.bus.emit('finished', { networkID, requestID });
      return networkID;
    } else {
      this.bus.emit('error', { errors: ['could not create demo network'], requestID });
    }
  }

  async upload(files, type) {
    const file = files && files.length > 0 ? files[0] : null;
    if (!file)
      return;

    this.bus.emit('loading', true);
    
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
      let read;
      if(TSV_EXTS.includes(ext)) {
        read = readTextFile;
      } else if(EXCEL_EXTS.includes(ext)) {
        read = readExcelFile;
      } else {
        const exts = TSV_EXTS.join(', ') + ', ' + EXCEL_EXTS.join(', ');
        this.bus.emit('error', { errors: [`File extension not supported. Must be one of: ${exts}`] });
        return;
      }

      console.log('Reading file');
      const { type, format, columns, contents, errors } = await read(file); // TODO pass the type to read?
      console.log(`Reading ${format} file as ${type}, columns: ${columns}`);

      if(errors && errors.length > 0) {
        this.bus.emit('error', { errors });
      } else if (type === PRE_RANKED) {
        this.bus.emit('ranks', { format, contents, name });
      } else {
        this.bus.emit('classes', { format, columns, contents, name });
      }
    } catch (e) {
      console.log(e);
      this.bus.emit('error', { errors: ['Internal Error'] });
      this.captureNondescriptiveErrorInSentry('Some error in handling uploaded file:' + e.message);
      return;
    }
  }

  async sendDataToEMService(text, format, type, networkName, requestID, classesArr) {
    const emRes = await this._sendDataToEMService(text, format, type, networkName, classesArr);
          
    if (emRes.errors) {
      this.bus.emit('error', { errors: emRes.errors, requestID });
      this.captureNondescriptiveErrorInSentry('Error in EM service with uploaded rank file');
      return;
    }

    this.bus.emit('finished', { networkID: emRes.netID, requestID });
  }
  

  async _sendDataToEMService(text, format, type, networkName, classesArr) {
    let url;
    if (type === PRE_RANKED) {
      url = '/api/create/preranked?' + new URLSearchParams({ networkName });
    } else if (type === RNA_SEQ) {
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

    } else if (res.status == 413) {
      // Max file size for uploads is defined in the dataParser in the server/routes/api/index.js file.
      return { errors: ["The uploaded file is too large. The maximum file size is 50 MB."] };

    } else if (res.status == 422) {
      // The EM-service returned an empty network. 
      // Probable causes: The gene IDs don't match whats in our pathway database or none of the enriched pathways passed the filter cutoff.
      return { errors: ["Not able to create a network from the provided data.", "There are not enough significantly enriched gene sets."] };

    } else {
      return { errors: [] }; // empty array shows generic error message
    }
  }
}

class NondescriptiveHandledError extends Error { // since we don't have well-defined errors
  constructor(message) {
    message = message ?? 'A non-descriptive error occurred.  Check the attached file.';
    super(message);
  }
}