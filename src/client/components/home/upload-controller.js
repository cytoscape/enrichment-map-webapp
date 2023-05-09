import EventEmitter from 'eventemitter3';
import { SENTRY } from '../../env';
import { readTextFile, readExcelFile } from './data-file-reader';

import * as Sentry from "@sentry/browser";


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

  async upload(files) {
    // This is just for ranks TSV for now
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
      if (TSV_EXTS.includes(ext)) {
        console.log('Reading file');
        const { type, format, columns, contents } = await readTextFile(file);
        console.log(`Reading ${format} file as ${type}, columns: ${columns}`);
  
        if (type === 'ranks') {
          const emRes = await this.sendDataToEMService(contents, format, 'ranks', name);
          
          if (emRes.errors) {
            this.bus.emit('error', emRes.errors);
            this.captureNondescriptiveErrorInSentry('Error in EM service with uploaded rank file');
            return;
          }

          this.bus.emit('finished', emRes.netID);
        } else {
          this.bus.emit('classes', { format, columns, contents, name });
        }
      } else if (EXCEL_EXTS.includes(ext)) {
        const { columns, contents, format } = await readExcelFile(file);
        console.log(`Reading Excel file, columns: ${columns}`);
        this.bus.emit('classes', { format, columns, contents, name });
      } else {
        const exts = TSV_EXTS.join(', ') + ', ' + EXCEL_EXTS.join(', ');
        this.bus.emit('error', ["File extension not supported. Must be one of: " + exts]);
      }
    } catch (e) {
      this.bus.emit('error', [e]);
      this.captureNondescriptiveErrorInSentry('Some error in handling uploaded file:' + e.message);
      
      return;
    }
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
    } else if (res.status == 413) {
      // Max file size for uploads is defined in the tsvParser in the server/routes/api/index.js file.
      return { errors: ["The uploaded file is too large. The maximum file size is 50 MB." ] };
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