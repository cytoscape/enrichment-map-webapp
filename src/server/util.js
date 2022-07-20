import fs from 'fs';
import readline from 'readline';

export async function fileForEachLine(filePath, lineCallback, firstLineCallback) {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let first = true;
  for await (const line of rl) {
    if(first) {
      first = false;
      firstLineCallback && firstLineCallback(line);
    } else {
      lineCallback && lineCallback(line);
    }
  }
}