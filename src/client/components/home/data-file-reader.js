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
 *   errors: array of error messages if the file couldn't be parsed at all, or if there's no gene or numberic columns
 *   ...extra functions, see createFileInfo()
 * }
 */
// TODO: figure out how to use jsdoc to make above comment into a standard format
export function readTextFile(blob) {  
  return blobToText(blob).then(quickParseForFileInfo);
}

/**
 * Reads the first worksheet of an Excel file and returns Promise<FileInfo>
 * See docs for readTextFile() above.
 */
export function readExcelFile(blob) {
  return excelToText(blob).then(quickParseForFileInfo);
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


function createFileInfo({ format, delimiter, columns, lines, startLine, columnTypes }) {
  return { 
    format, 
    delimiter, 
    columns, 
    lines, 
    startLine, 
    columnTypes,
    numericCols: () => columns.filter(c => columnTypes.get(c) === ColumnType.NUMERIC),
    geneCols:    () => columns.filter(c => columnTypes.get(c) === ColumnType.GENE),
  };
}


/**
 * Parses just the header row and the first X data rows to infer information about the file.
 */
function quickParseForFileInfo(text) {
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

  const fileInfo = createFileInfo({ format, delimiter, columns, lines, startLine, columnTypes });

  if(fileInfo.numericCols().length === 0) {
    return { error: 'File format error: Could not find any numeric columns.'};
  }
  if(fileInfo.geneCols().length === 0) {
    return { error: 'File format error: Could not find any columns with gene indentifiers.'};
  }

  return fileInfo;
}


/**
 * Errors that can occur during the validation step.
 */
const Error = {
  GENE_NAME_MISSING: 'GENE_NAME_MISSING',
  GENE_NAME_NA: 'GENE_NAME_NA',
  NUMERIC_VAL_BAD: 'NUMERIC_VAL_BAD',
  WRONG_NUMBER_OF_TOKENS: 'WRONG_NUMBER_OF_TOKENS',
};


function createErrorMap() {
  const errorMap = new Map();
  Object.keys(Error).forEach(e => errorMap.set(e, new Set()));

  errorMap.add = (err, lineNum) => {
    errorMap.get(err).add(lineNum);
  };

  errorMap.hasError = err => {
    return errorMap.has(err) && errorMap.get(err).length > 0;
  };

  errorMap.getLineNums = err => {
    if(errorMap.hasError(err)) {
      const lineNums = Array.from(errorMap.get(err));
      lineNums.sort();
      return lineNums;
    }
  };

  errorMap.forError = (error, f) => {
    if(errorMap.hasError(error)) {
      const lineNums = errorMap.getLineNums(error);
      f(lineNums, lineNums.length);
    }
  };
  
  return errorMap;
}


function getColumnIndicies(fileInfo, fileFormat, geneCol, rankCol, rnaseqClasses) {
  const { columns } = fileInfo;
  const geneIndex = columns.indexOf(geneCol);

  const numericIndicies = [];
  const classes = [];
  const headerNames = [ geneCol ];

  if(fileFormat === 'ranks') {
    const index = columns.indexOf(rankCol);
    numericIndicies.push(index);
    headerNames.push(columns[index]);
  } else {
    // rnaseqClasses looks like [X,A,A,A,B,B,B] where X=ignored and A,B=two experiments
    const numericCols = fileInfo.numericCols();
    for(let [colName, klass] of _.zip(numericCols, rnaseqClasses)) {
      if(colName !== undefined && (klass === 'A' || klass === 'B')) {
        const index = columns.indexOf(colName);
        numericIndicies.push(index);
        classes.push(klass);
        headerNames.push(columns[index]);
      }
    }
  }

  return { geneIndex, numericIndicies, classes, headerNames };
}


/**
 * Returns an object with the following fields:
 * {
 *   errors: array of error messages, may be empty
 *   contents: big string of file contents to send to server
 *   classes: the classes array to send to the FGSEA service, but with ignored classes removed
 * }
*/
export function validateText(fileInfo, fileFormat, geneCol, rankCol, rnaseqClasses) { 
  const { delimiter, lines, startLine } = fileInfo;
  const numCols = fileInfo.columns.length;

  const { geneIndex, numericIndicies, classes, headerNames } = 
    getColumnIndicies(fileInfo, fileFormat, geneCol, rankCol, rnaseqClasses);

  const errorMap = createErrorMap();
  const processedLines = [ headerNames.join(delimiter) ];

  for(var i = startLine + 1; i < lines.length; i++) { // skip header
    const line = lines[i];
    const lineNum = i + 1;
    const tokens = line.split(delimiter).map(t => t.trim());
    const newTokens = [];

    // Verify correct number of columns
    if(tokens.length !== numCols) {
      errorMap.add(Error.WRONG_NUMBER_OF_TOKENS, lineNum);
      continue;
    }

    // Detect bad or missing gene names
    const gene = tokens[geneIndex];
    if(gene === undefined || gene === '') {
      errorMap.add(Error.GENE_NAME_MISSING, lineNum);
    } else if(gene.toUpperCase() === 'NA' || gene.toUpperCase() === 'N/A') {
      errorMap.add(Error.GENE_NAME_NA, lineNum);
    }

    newTokens.push(gene);

    // Detect bad or missing numeric values
    for(let ni of numericIndicies) {
      const numStr = tokens[ni];
      if(!isNumeric(numStr)) {
        errorMap.add(Error.NUMERIC_VAL_BAD, lineNum);
      }
      newTokens.push(numStr);
    }

    processedLines.push(newTokens.join(delimiter));
  }

  const errors = errorMapToMessageArray(errorMap);
  if(errors.length > 0) {
    return { errors };
  }

  const contents = processedLines.join('\n');
  return { contents, classes };
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

  errorMap.forError(Error.WRONG_NUMBER_OF_TOKENS, (lineNums, length) => {
    if(length == 1) {
      errors.push(`There are a wrong number of values on line ${lineNums[0]} of the input file.`);
    } else {
      errors.push(`The input file has ${length} lines with wrong number of values. \nOn lines ${printLines(lineNums)}`);
    }
  });

  errorMap.forError(Error.NUMERIC_VAL_BAD, (lineNums, length) => {
    if(length == 1) {
      errors.push(`There are badly formatted numeric values on line ${lineNums[0]} of the input file.`);
    } else {
      errors.push(`The input file has ${length} lines with missing or badly formatted numeric values. \nOn lines ${printLines(lineNums)}`);
    }
  });

  return errors;
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