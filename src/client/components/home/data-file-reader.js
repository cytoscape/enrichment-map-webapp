import * as XLSX from "xlsx";

/**
 * EM app code that does the same thing...
 * https://github.com/BaderLab/EnrichmentMapApp/blob/develop/EnrichmentMapPlugin/src/main/java/org/baderlab/csplugins/enrichmentmap/parsers/ExpressionFileReaderTask.java
 */


function processHeader(headerLine, delimiter) {
  let columns = headerLine.split(delimiter || '\t');
  console.log("columns: " + JSON.stringify(columns));
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


function getLineBreakChar(s) {
  const i = s.indexOf('\n');
  if(i === -1) {
    if(s.indexOf('\r') !== -1) {
      return '\r';
    }
    return '\n';
  }
  if(s[i-1] === '\r') {
    return '\r\n';
  }
  return '\n';
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
    const reader = new FileReader();
    reader.onerror = reject;

    reader.onload = evt => {
      const text = reader.result;

      const lineBreakChar = getLineBreakChar(text);
      const lines = text.split(lineBreakChar);

      if(lines[0].trim() === '#1.2') { // GCT files start with this line
        lines.shift();
        lines.shift(); // second line of GCT file needs to be skipped as well
      }

      while(lines[0][0] === '#') { // skip comment lines
        lines.shift();
      }

      const header = processHeader(lines[0], delimiter);

      if(header.type == 'error') {
        reject('File format error: cannot determine the number of data columns.');
        return;
      }

      const { type, columns } = header;
      const contents = lines.join('\n');

      resolve({ type, columns, contents });
    };
    
    reader.readAsText(file);
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
  const firstLine = str => {
    const i = str.indexOf("\n");
    return str.substring(0, i > -1 ? i : undefined);
  };

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    
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

    reader.readAsBinaryString(file);
  });
}