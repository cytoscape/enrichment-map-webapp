import LineReader from 'browser-line-reader';

/**
 * Reads a Ranks or Expression file in TSV format.
 * Comment lines are ignored and removed from the output.
 * 
 * Returns a Promise that resolves to an object with the following fields...
 * {
 *   columns: array of column headers,
 *   type: 'ranks' or 'rnaseq' (for expressions),
 *   contents: string that contains the file contents with comment lines removed,
 * }
 * 
 * Any validation or IO errors cause the Promise to be rejected.
 * 
 * EM app code that does the same thing...
 * https://github.com/BaderLab/EnrichmentMapApp/blob/develop/EnrichmentMapPlugin/src/main/java/org/baderlab/csplugins/enrichmentmap/parsers/ExpressionFileReaderTask.java
 * 
 * 
 * Note: the 'browser-line-reader' library does not support all line terminators: should use text.split(/[\r\n]+/g)
 */
export function readDataFile(file, delimiter) {
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

      const tokens = line.split(delimiter || '\t');

      if(needHeader) { // First line that isn't skipped is the header row
        needHeader = false;

        columns = tokens
            .slice(1) // always ignore first column
            .filter(h => h.toLowerCase() != "description");

        if(columns.length == 2) {
          type = 'ranks';
        } else if(columns.length > 2) {
          type = 'rnaseq';
        } else {
          lineReader.emit('error', 'File format error: cannot determine the number of data columns.');
          return;
        }
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
