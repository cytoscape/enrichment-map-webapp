import fs from 'fs';
import readline from 'readline';

export async function fileForEachLine(filePath, lineCallback) {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    lineCallback(line);
  }
}

export function parseBridgeDBXrefsList(txt) {
  if (!txt || typeof txt !== 'string' || txt.trim() === '') {
    return [];
  }
  const symbols = txt
    .split('\n')
    .map(line => {
      // e.g., `ENSG00000000971\tEnsembl\tH:CFH,Uc:uc001gtj.5,T:GO: 0030449,S:P08603,Q:NM_000186`
      const parts = line.split('\t');
      if (parts.length >= 3) {
        const idsPart = parts[2];
        const symbol = idsPart.split(',').filter(m => m.startsWith('H:'))[0];
        return symbol ? symbol.slice(2) : null; // remove 'H:'
      }
      return null; // Return null if the line is not valid
    });

    return symbols;
}