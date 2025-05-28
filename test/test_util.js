import { expect } from 'chai';
import * as util from '../src/server/util.js';


describe('util.js', () => {
  describe('parseBridgeDBXrefsList', () => {
    it('should extract symbols prefixed with H:', () => {
      const input = [
        // symbol is the first mapped ID
        'NSG00000000971\tEnsembl\tH:CFH,Uc:uc001gtj.5,T:GO:0030449,S:P08603,T:GO:0070062,T:GO:1903659,Wg:3075',
        // no mapped IDs
        'ENSG00000000000\tEnsembl\tN/A',
        // symbol is NOT the first mapped ID
        'ENSG00000154096\tEnsembl\tAg:A_23_P36364,T:GO:0005886,T:GO:0070062,X:Hs.125359.1.S1_3p_a_at,En:ENSG00000154096X:3394409,H:THY1,T:GO:0005178'
      ].join('\n');
      const result = util.parseBridgeDBXrefsList(input);
      expect(result).to.deep.equal(['CFH', null, 'THY1']);
    });

    it('should return null for lines with less than 3 parts', () => {
      const input = [
        'ENSG00000000971\tEnsembl',
        'ENSG00000000972'
      ].join('\n');
      const result = util.parseBridgeDBXrefsList(input);
      expect(result).to.deep.equal([null, null]);
    });

    it('should return null if no H: symbol is present', () => {
      const input = [
        'ENSG00000000971\tEnsembl\tUc:uc001gtj.5,T:GO:0030449,S:P08603,Q:NM_000186,X:Hs.250651.2.S1_3p_at'
      ].join('\n');
      const result = util.parseBridgeDBXrefsList(input);
      expect(result).to.deep.equal([null]);
    });

    it('should handle empty input', () => {
      const result = util.parseBridgeDBXrefsList('');
      expect(result).to.deep.equal([]);
    });
  });
});