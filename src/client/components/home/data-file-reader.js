import * as XLSX from "xlsx";
import _ from 'lodash';
import { PRE_RANKED } from "./upload-controller";

/**
 * EM app code that does the same thing...
 * https://github.com/BaderLab/EnrichmentMapApp/blob/develop/EnrichmentMapPlugin/src/main/java/org/baderlab/csplugins/enrichmentmap/parsers/ExpressionFileReaderTask.java
 */


/**
 * @typedef {Object} FileInfo
 * @property {Array<string>} columns array of all column names taken from the header row
 * @property {Array<string>} numericCols array of column names that have been guessed to be numeric
 * @property {Array<string>} geneCols array of column names that have been guessed to be gene names
 * @property {string} delimieter comma or tab
 * @property {Array<string>} lines array of lines (if the file starts with comment lines they are removed)
 * @property {number} startLine line number of header row
 * @property {Map<string,string>} columnTypes Map of column name to ColumnType
 * @property {Array<string>} errors array of error messages if the file couldn't be parsed at all, or if there's no gene or numberic columns
 */

/**
 * Reads a Ranks or Expression file in TSV or CSV format.
 * @param {Blob} blob
 * @return {Promise<FileInfo>}
 */
export function readTextFile(blob) {  
  return blobToText(blob).then(quickParseForFileInfo);
}

/**
 * Reads the first worksheet of an Excel file.
 * @param {Blob} blob
 * @return {Promise<FileInfo>}
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
  GENE: 'GENE',       // single token stings
  STRING: 'STRING',   // longer strings that may contain spaces, like a 'description' column
  NUMERIC: 'NUMERIC',
  BLANK: 'BLANK',     // empty string, skippable
  UNKNOWN: 'UNKNOWN', // when types are mixed we say unknown
};

const isNumeric = s => !isNaN(parseFloat(s)) && isFinite(s);
const isBlank = s => s.trim() === '';
const isToken = s => !isBlank(s) && s.indexOf(' ') < 0;
const isNonEmptyString = s => s.length > 0;

function getValueType(str) {
  if(isBlank(str))
    return ColumnType.BLANK;
  else if(isNumeric(str))
    return ColumnType.NUMERIC;
  else if(isToken(str))
    return ColumnType.GENE;
  else if(isNonEmptyString(str))
    return ColumnType.STRING;
  else
    return ColumnType.UNKNOWN; 
}

function createColumnTypeMap() {
  const isText = type => type === ColumnType.GENE || type === ColumnType.STRING;
  const columnTypes = new Map();

  columnTypes.setType = (col, type) => {
    if(columnTypes.has(col)) {
      const prevType = columnTypes.get(col);
      if(prevType !== type) {
        if(isText(prevType) && isText(type)) {
          columnTypes.set(col, ColumnType.STRING);
        } else if(prevType === ColumnType.BLANK) {
          columnTypes.set(col, type);
        } else if(type !== ColumnType.BLANK) {
          columnTypes.set(col, ColumnType.UNKNOWN); 
        }
      }
    } else {
      columnTypes.set(col, type);
    }
  };

  return columnTypes;
}

/**
 * @return {FileInfo} constructs a FileInfo object
 */
function createFileInfo({ delimiter, columns, lines, startLine, columnTypes }) {
  const numericCols = columns.filter(c => columnTypes.get(c) === ColumnType.NUMERIC);
  const geneCols    = columns.filter(c => columnTypes.get(c) === ColumnType.GENE);
  return { 
    delimiter, 
    columns, 
    lines, 
    startLine, 
    columnTypes,
    numericCols,
    geneCols,
  };
}


/**
 * Parses just the header row and the first X data rows to infer information about the file.
 * @return {FileInfo}
 */
function quickParseForFileInfo(text) {
  const lineBreakChar = getLineBreakChar(text);
  const lines = text.split(lineBreakChar);

  let i = 0;
  let startLine = 0;

  // Special handling for GCT files
  // https://software.broadinstitute.org/cancer/software/gsea/wiki/index.php/Data_formats#GCT:_Gene_Cluster_Text_file_format_.28.2A.gct.29
  if(lines[0].trim() === '#1.2') {
    lines[0] = undefined;
    lines[1] = undefined;
    i = 2;
    startLine = 2;
  }

  const skippable = (line) => line === undefined || line.trim() === '' || line[0] === '#';

  // Scan for header row and validate
  while(i < lines.length && skippable(lines[i])) {
    lines[i] = undefined;
    i++;
  }
  startLine = i;

  if(startLine === lines.length) {
    return { errors: ['File format error: Cannot read data columns.']};
  }

  const header = lines[startLine];
  const delimiter = getDelimiter(header);
  const columns = header.split(delimiter).map(t => t.trim());
  i++;

  if(columns.length <= 1) {
    return { errors: ['File format error: There must be at least 2 data columns.']};
  }

  // Scan data rows and guess column types. Scan the entire file because its loaded into memory anyway, and we can preprocess empty and comment lines.
  // Set empty and comment lines to undefined, they will get filtered out later when unused columns are filtered out.
  // This keeps line numbers consistent with the indicies in the lines array, which is necessary for reporting line numbers of errors in validateText().
  const columnTypes = createColumnTypeMap();

  while(i < lines.length) {
    const line = lines[i];
    if(skippable(line)) {
      lines[i] = undefined;
      i++;
      continue;

    }
    const values = line.split(delimiter).map(t => t.trim());

    for(let [col, val] of _.zip(columns, values)) {
      if(col !== undefined) {
        columnTypes.setType(col, getValueType(val));
      }
    }
    i++;
  }

  // Create a FileInfo object
  const fileInfo = createFileInfo({ delimiter, columns, lines, startLine, columnTypes });

  if(fileInfo.numericCols.length === 0) {
    return { errors: ['File format error: Could not find any numeric columns.']};
  }
  if(fileInfo.geneCols.length === 0) {
    return { errors: ['File format error: Could not find any columns with gene indentifiers.']};
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
    return errorMap.has(err) && errorMap.get(err).size > 0;
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
  const headerNames = [];

  if(fileFormat === PRE_RANKED) {
    const index = columns.indexOf(rankCol);
    numericIndicies.push(index);
    headerNames.push('gene', 'rank'); // this is expected by the server for rank files
  } else {
    // rnaseqClasses looks like [X,A,A,A,B,B,B] where X=ignored and A,B=two experiments
    headerNames.push(geneCol);
    for(let [colName, klass] of _.zip(fileInfo.numericCols, rnaseqClasses)) {
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
    if(line === undefined) {
      continue;
    }
    
    const lineNum = i + 1;
    const tokens = line.split(delimiter).map(t => t.trim());
    const newTokens = [];

    // Verify correct number of columns, 
    if(tokens.length !== numCols) {
      console.log(lineNum, lines.length);
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