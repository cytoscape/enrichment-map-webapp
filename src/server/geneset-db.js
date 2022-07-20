import { fileForEachLine } from './util.js';


export const DB_1_PATH = './public/geneset-db/Human_GOBP_AllPathways_no_GO_iea_June_01_2022_symbol.gmt';

export class GenesetDB {

  constructor(filepath) {
    this.filepath = filepath;
  }

  async connect() {
    if(this.db)
      return;

    this.db = new Map();

    await fileForEachLine(this.filepath, line => {
      const [ name, description, ...genes ] = line.split("\t");
      if(genes[genes.length-1] === "") {
        genes.pop();
      }

      this.db.set(name, { name, description, genes });
    });
  }

  getEntry(genesetName) {
    return this.db.get(genesetName);
  }

}

export default GenesetDB;