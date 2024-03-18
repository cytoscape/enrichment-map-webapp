import * as XLSX from "xlsx";
import _ from 'lodash';

/**
 * EM app code that does the same thing...
 * https://github.com/BaderLab/EnrichmentMapApp/blob/develop/EnrichmentMapPlugin/src/main/java/org/baderlab/csplugins/enrichmentmap/parsers/ExpressionFileReaderTask.java
 */


/**
 * Reads a Ranks or Expression file in TSV or CSV format.
 * Returns a Promise that resolves to a 'FileInfo' object with the following fields:
 * {
 *   columns: array of column headers,
 *   format: 'tsv' or 'csv',
 *   delimiter: comma or tab
 *   lines: array of lines (with the first few comment lines removed)
 *   startLine: line number of header row
 *   columnTypes: Map of column name to ColumnType
 *   ...extra functions, see createFileInfo()
 * }
 */
// TODO figure out how to use jsdoc to make above comment better
export function readTextFile(blob, name, type) {  
  return blobToText(blob)
    .then(text => quickParseForFileInfo(text, name, type));
}

/**
 * Reads the first worksheet of an Excel file and returns Promise<FileInfo>
 * See docs for readTextFile() above.
 */
export function readExcelFile(blob, name, type) {
  return excelToText(blob)
    .then(text => quickParseForFileInfo(text, name, type));
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



export const ColumnType = {
  GENE: 'GENE', // single token stings
  STRING: 'STRING', // longer strings that may contain spaces, like a 'description' column
  NUMERIC: 'NUMERIC',
  UNKNOWN: 'UNKNOWN',

  isText: type => type === ColumnType.GENE || type === ColumnType.STRING
};

function isNumeric(n) { return !isNaN(parseFloat(n)) && isFinite(n); }
function isToken(s) { return _.isString(s) && s.indexOf(' ') < 0; }
function isNonEmptyString(s) { return _.isString(s) && s.length > 0; }

function getColumnType(x) {
  if(isNumeric(x))
    return ColumnType.NUMERIC;
  else if(isToken(x))
    return ColumnType.GENE;
  else if(isNonEmptyString(x))
    return ColumnType.STRING;
  else
    return ColumnType.UNKNOWN;
}

function createColumnTypeMap() {
  const columnTypes = new Map();

  // TODO: maybe if the new type is UNKNOWN I should keep the current type
  columnTypes.setType = (col, type) => {
    if(columnTypes.has(col)) {
      const prevType = columnTypes.get(col);
      if(prevType !== type) {
        if(ColumnType.isText(prevType) && ColumnType.isText(type)) {
          columnTypes.set(col, ColumnType.STRING);
        } else {
          columnTypes.set(col, ColumnType.UNKNOWN);
        }
      }
    } else {
      columnTypes.set(col, type);
    }
  };

  return columnTypes;
}

function createFileInfo({ format, delimiter, columns, lines, startLine, columnTypes, name, type }) {
  return { 
    format, 
    delimiter, 
    columns, 
    lines, 
    startLine, 
    columnTypes,
    name,
    type,
    numericColumns: () => columns.filter(col => columnTypes.get(col) === ColumnType.NUMERIC),
    geneColumns:    () => columns.filter(col => columnTypes.get(col) === ColumnType.GENE),
  };
}

/**
 * Parses just the header row and the first X data rows to infer information about the file.
 */
function quickParseForFileInfo(text, name, type) {
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

  if(lines[0] === undefined) {
    return { error: 'File format error: Cannot read data columns.'};
  }

  const delimiter = getDelimiter(lines[0]);
  const format = delimiter === ',' ? 'csv' : 'tsv';
  const columns = lines[0].split(delimiter).map(t => t.trim());

  if(columns.length <= 1) {
    return { error: 'File format error: There must be at least 2 data columns.'};
  }

  const numLinesToScan = 10;
  const columnTypes = createColumnTypeMap();

  for(let i = 1; i < Math.min(lines.length, numLinesToScan); i++) {
    const line = lines[i];
    const values = line.split(delimiter).map(t => t.trim());

    for(let [col, val] of _.zip(columns, values)) {
      if(col !== undefined) {
        columnTypes.setType(col, getColumnType(val));
      }
    }
  }

  return createFileInfo({ format, delimiter, columns, lines, startLine, columnTypes, name, type });
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


// /**
//  * Uses the header row to determine if its a ranked gene list ('ranks') or an rna-seq expression file ('rnaseq').
//  * Also returns an array of column names for use in the ClassSelector if the type is 'rnaseq', the first 
//  * column of gene names is removed from the array.
//  */
// function processHeader(headerLine, delimiter) {
//   const columns = headerLine.split(delimiter || '\t');
//   if(columns.length == 2) {
//     return { type: 'ranks' };
//   } else if(columns.length > 2) {
//     return { type: 'rnaseq', columns: columns.slice(1) };
//   } else {
//     return { type: 'error' };
//   }
// }


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