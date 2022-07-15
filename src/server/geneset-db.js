import fs from 'fs';
import readline from 'readline';


export const DB_1_PATH = './public/geneset-db/Human_GOBP_AllPathways_no_GO_iea_June_01_2022_symbol.gmt';

export class GenesetDB {

  constructor(filepath) {
    this.filepath = filepath;
    this.db = new Map();
  }

  async connect() {
    const fileStream = fs.createReadStream(this.filepath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });
  
    let first = true;
    for await (const line of rl) {
      if(first) {
        first = false;
        continue;
      }

      // Each line in input.txt will be successively available here as `line`.
      // console.log(`Line from file: ${line}`);
      const [ name, description, ...genes ] = line.split("\t");
      if(genes[genes.length-1] === "") {
        genes.pop();
      }
      this.db.set(name, { name, description, genes });
    }
  }

  getEntry(genesetName) {
    return this.db.get(genesetName);
  }

}

export default GenesetDB;