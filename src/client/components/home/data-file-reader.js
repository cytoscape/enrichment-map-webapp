import * as XLSX from "xlsx";

/**
 * EM app code that does the same thing...
 * https://github.com/BaderLab/EnrichmentMapApp/blob/develop/EnrichmentMapPlugin/src/main/java/org/baderlab/csplugins/enrichmentmap/parsers/ExpressionFileReaderTask.java
 */


/**
 * Reads a Ranks or Expression file in TSV or CSV format.
 * Comment lines are ignored and removed from the output.
 * 
 * Returns a Promise that resolves to an object with the following fields...
 * {
 *   columns: array of column headers,
 *   type: 'ranks' or 'rnaseq' (for expressions),
 *   format: 'tsv' or 'csv',
 *   contents: string that contains the file contents as TSV with comment lines removed,
 * }
 */
export function readTextFile(blob) {
  return parseBlob(blob)
    .then(validateText);
}

/**
 * Reads an Excel file, and converts the first worksheet to TSV or CSV format
 * (TSV is the default).
 * 
 * Returns a Promise that resolves to an object with the following fields...
 * {
 *   columns: array of column headers,
 *   type: 'ranks' or 'rnaseq' (for expressions),
 *   format: 'tsv' or 'csv'
 *   contents: string that contains the file contents as TSV
 * }
 */
export function readExcelFile(blob, format) {
  return excelToText(blob, format)
    .then(parseText)
    .then(validateText);
}



function parseBlob(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;

    reader.onload = evt => {
      const text = reader.result;

      const parseResult = parseText(text);
      if(parseResult.error)
        reject(parseResult.error);
      else
        resolve(parseResult);
    };
    
    reader.readAsText(blob);
  });
}


function parseText(text) {
  const lineBreakChar = getLineBreakChar(text);
  const lines = text.split(lineBreakChar);

  if(lines[0].trim() === '#1.2') { // GCT files start with this line
    lines.shift();
    lines.shift(); // second line of GCT file needs to be skipped as well
  }
  while(lines[0][0] === '#') { // skip comment lines
    lines.shift();
  }

  const delimiter = getDelimiter(lines[0]);
  const header = processHeader(lines[0], delimiter);

  if(header.type == 'error') {
    return({ error: 'File format error: cannot determine the number of data columns.'});
  }

  const { type, columns } = header;
  const format = delimiter === ',' ? 'csv' : 'tsv';

  return({ type, format, delimiter, columns, lines });
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


function validateText({ type, format, delimiter, columns, lines, error }) {
  if(error) {
    return { errors: [error] };
  }

  const errorSet = new Set();

  for(var i = 1; i < lines.length; i++) { // skip header
    const tokens = lines[i].split(delimiter).map(t => t.trim());
    const gene = tokens[0];

    // Detect bad or missing gene names
    if(gene === undefined || gene === '') {
      errorSet.add('One or more rows are missing a gene name. \nPlease remove these rows and try again.');
    } else if(gene.toUpperCase() === 'NA') {
      errorSet.add('One or more rows have "NA" for the gene name. \nPlease remove these rows and try again.');
    } else if(gene.toUpperCase() === 'N/A') {
      errorSet.add('One or more rows have "N/A" for the gene name. \nPlease remove these rows and try again.');
    }
  }

  // comment lines are removed
  const contents = lines.join('\n');
  const errors = Array.from(errorSet);

  return { type, format, columns, contents, errors };
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