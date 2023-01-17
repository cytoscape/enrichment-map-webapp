import LineReader from 'browser-line-reader';
import * as XLSX from "xlsx";

/**
 * EM app code that does the same thing...
 * https://github.com/BaderLab/EnrichmentMapApp/blob/develop/EnrichmentMapPlugin/src/main/java/org/baderlab/csplugins/enrichmentmap/parsers/ExpressionFileReaderTask.java
 */


function processHeader(headerLine, delimiter) {
  let columns = headerLine.split(delimiter || '\t');
  if(columns.length == 2) {
    return { type: 'ranks', columns };
  } else {
    columns = columns
      .slice(1) // ignore first column
      .filter(h => h.toLowerCase() != "description"); // remove description column if present

    if(columns.length > 2) {
      return { type: 'rnaseq', columns };
    } else {
      return { type: 'error' };
    }
  }
}

function firstLine(str) {
  const i = str.indexOf("\n");
  return str.substring(0, i > -1 ? i : undefined);
}

/**
 * Reads a Ranks or Expression file in TSV format.
 * Comment lines are ignored and removed from the output.
 * 
 * Returns a Promise that resolves to an object with the following fields...
 * {
 *   columns: array of column headers,
 *   type: 'ranks' or 'rnaseq' (for expressions),
 *   contents: string that contains the file contents as TSV with comment lines removed,
 * }
 */
export function readTSVFile(file, delimiter = '\t') {
  return new Promise((resolve, reject) => {
    // Internal bookkeeping
    let first = true;
    let skipNext = false;
    let needHeader = true;

    // These fields get returned
    let type;
    let columns = [];
    let lines = [];

    const lineReader = new LineReader(file);

    lineReader.readLines(line => {
      const isFirst = first;
      first = false;

      if(skipNext) {
        skipNext = false;
        return;
      }
      if(isFirst && line.trim() === '#1.2') { // GCT files start with this line
        skipNext = true; // second line of GCT file needs to be skipped
        return;
      }
      if(line[0] === '#') { // skip comment lines
        return;
      }

      if(needHeader) { // First line that isn't skipped is the header row
        needHeader = false;
        const header = processHeader(line, delimiter);
        if(header.type == 'error') {
          lineReader.emit('error', 'File format error: cannot determine the number of data columns.');
          return;
        }
        columns = header.columns;
        type = header.type;
      }

      // TODO Check that all columns other than "Name", "Gene" or "Description" have valid numeric values.
      lines.push(line);
    })
    .then(() => {
      const contents = lines.join('\n');
      resolve({ type, columns, contents });
    })
    .catch(reject);
  });
}


/**
 * Reads an Excel file, and converts the first worksheet to TSV format.
 * 
 * Returns a Promise that resolves to an object with the following fields...
 * {
 *   columns: array of column headers,
 *   type: 'ranks' or 'rnaseq' (for expressions),
 *   contents: string that contains the file contents as TSV
 * }
 */
export function readExcelFileAsTSV(file, delimiter = '\t') {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = evt => {
      // Parse data
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      
      // Get first worksheet
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];

      // convert to TSV
      const contents = XLSX.utils.sheet_to_csv(ws, { FS: delimiter });
      const headerLine = firstLine(contents, delimiter);
      
      const { type, columns } = processHeader(headerLine, delimiter);
      if(type == 'error') {
        reject('File format error: cannot determine the number of data columns.');
        return;
      }

      resolve({ type, columns, contents });
    };

    reader.onerror = reject;

    reader.readAsBinaryString(file);
  });
}