import * as XLSX from "xlsx";

/**
 * EM app code that does the same thing...
 * https://github.com/BaderLab/EnrichmentMapApp/blob/develop/EnrichmentMapPlugin/src/main/java/org/baderlab/csplugins/enrichmentmap/parsers/ExpressionFileReaderTask.java
 */


/**
 * Reads a Ranks or Expression file in TSV or CSV format.
 * Returns a Promise that resolves to an object with the following fields:
 * {
 *   columns: array of column headers,
 *   format: 'tsv' or 'csv',
 *   delimiter: comma or tab
 *   type: 'ranks' or 'rnaseq' (for expressions),
 *   lines: array of lines (with the first few comment lines removed)
 *   startLine: line number of header row
 * }
 */
export function readTextFile(blob) {
  return blobToText(blob).then(parseText);
}

/**
 * Reads the first worksheet of an Excel file.
 * Returns a Promise that resolves to an object with the following fields:
 * {
 *   columns: array of column headers,
 *   format: 'tsv' or 'csv',
 *   delimiter: comma or tab
 *   type: 'ranks' or 'rnaseq' (for expressions),
 *   lines: array of lines (with the first few comment lines removed)
 *   startLine: line number of header row
 * }
 */
export function readExcelFile(blob, format) {
  return excelToText(blob, format).then(parseText);
}


function blobToText(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = evt => {
      const text = reader.result;
      resolve(text);
    };
    reader.readAsText(blob);
  });
}

function excelToText(blob, format = 'tsv') {
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
      const delimiter = format === 'tsv' ? '\t' : ',';
      const contents = XLSX.utils.sheet_to_csv(ws, { FS: delimiter });

      resolve(contents);
    };

    reader.readAsBinaryString(blob);
  });
}


function parseText(text) {
  const lineBreakChar = getLineBreakChar(text);
  const lines = text.split(lineBreakChar);

  let startLine = 0;
  if(lines[0].trim() === '#1.2') { // GCT files start with this line
    lines.shift();
    lines.shift(); // second line of GCT file needs to be skipped as well
    startLine += 2;
  }
  while(lines[0][0] === '#') { // skip comment lines
    lines.shift();
    startLine++;
  }

  const delimiter = getDelimiter(lines[0]);
  const header = processHeader(lines[0], delimiter);

  if(header.type == 'error') {
    return({ error: 'File format error: cannot determine the number of data columns.'});
  }

  const { type, columns } = header;
  const format = delimiter === ',' ? 'csv' : 'tsv';

  return({ type, format, delimiter, columns, lines, startLine });
}


const Error = {
  GENE_NAME_MISSING: 'GENE_NAME_MISSING',
  GENE_NAME_NA: 'GENE_NAME_NA',

  createMap: () => {
    const errorMap = new Map();
    Object.keys(Error).forEach(e => errorMap.set(e, []));
    errorMap.hasError = k => {
      return errorMap.has(k) && errorMap.get(k).length > 0;
    };
    errorMap.forError = (error, f) => {
      if(errorMap.hasError(error)) {
        const lineNums = errorMap.get(error);
        f(lineNums, lineNums.length);
      }
    };
    return errorMap;
  }

  
};

export function validateText(fileInfo) {  // TODO need more info, like what columns to ignore
  const { delimiter, lines, startLine } = fileInfo;

  // If there was already an error when converting to text then just return it.
  // if(error)
  //   return { errors: [error] };

  const errorMap = Error.createMap();
  // const header = lines[startLineNumber];

  // skip header line
  for(var i = startLine + 1; i < lines.length; i++) { // skip header
    const line = lines[i];
    const lineNum = i + 1;

    if(line.trim() === '') { // skip empty lines??
      continue;
    }

    const tokens = line.split(delimiter).map(t => t.trim());
    const gene = tokens[0];

    // Detect bad or missing gene names
    if(gene === undefined || gene === '') {
      errorMap.get(Error.GENE_NAME_MISSING).push(lineNum);
    } else if(gene.toUpperCase() === 'NA' || gene.toUpperCase() === 'N/A') {
      errorMap.get(Error.GENE_NAME_NA).push(lineNum);
    }
  }

  const errors = errorMapToMessageArray(errorMap);

  // const contents = lines.join('\n'); // Do this here for convenience
  return { ...fileInfo, errors };
}


/**
 * Convert the map of error codes and line numbers to an array of human-readable error messages.
 * The 'lineNums' arrays should be sorted because we process the file from top to bottom.
 */
function errorMapToMessageArray(errorMap) {
  const errors = [];
  const printLines = lineNums => {
    let str = lineNums.slice(0, 10).join(', ');
    str += lineNums.length > 10 ? '... and more.' : '.';
    return str;
  };

  errorMap.forError(Error.GENE_NAME_MISSING, (lineNums, length) => {
    if(length == 1) {
      errors.push(`There is a missing gene name on line ${lineNums[0]} of the input file.`);
    } else {
      errors.push(`The input file has ${length} lines with missing gene names. \nOn lines ${printLines(lineNums)}`);
    }
  });

  errorMap.forError(Error.GENE_NAME_NA, (lineNums, length) => {
    if(length == 1) {
      errors.push(`The gene name on line ${lineNums[0]} is "NA".`);
    } else {
      errors.push(`The input file has ${length} gene names that are "NA". \nOn lines ${printLines(lineNums)}`);
    }
  });

  return errors;
}


/**
 * Uses the header row to determine if its a ranked gene list ('ranks') or an rna-seq expression file ('rnaseq').
 * Also returns an array of column names for use in the ClassSelector if the type is 'rnaseq', the first 
 * column of gene names is removed from the array.
 */
function processHeader(headerLine, delimiter) {
  const columns = headerLine.split(delimiter || '\t');
  if(columns.length == 2) {
    return { type: 'ranks' };
  } else if(columns.length > 2) {
    return { type: 'rnaseq', columns: columns.slice(1) };
  } else {
    return { type: 'error' };
  }
}


function getLineBreakChar(text) {
  const i = text.indexOf('\n');
  if(i === -1) {
    if(text.indexOf('\r') !== -1) {
      return '\r';
    }
    return '\n';
  }
  if(text[i-1] === '\r') {
    return '\r\n';
  }
  return '\n';
}


function getDelimiter(line) {
  const tabTokens   = line.split('\t').length;
  const commaTokens = line.split(',').length;
  return commaTokens > tabTokens ? ',' : '\t';
}