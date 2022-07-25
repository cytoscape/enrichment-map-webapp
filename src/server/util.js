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