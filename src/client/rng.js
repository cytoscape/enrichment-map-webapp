
// See https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-JavaScript
function xoshiro128ss(a, b, c, d) {
  return function() {
      var t = b << 9, r = a * 5; r = (r << 7 | r >>> 25) * 9;
      c ^= a; d ^= b;
      b ^= c; a ^= d; c ^= t;
      d = d << 11 | d >>> 21;
      return (r >>> 0) / 4294967296;
  };
}

const rng = xoshiro128ss(3728386577354669, 4177051891409301, 6293788895719469, 105826358935507);

const origMathRandom = Math.random;

// monkey patch Math.random() so layouts are deterministic
export function monkeyPatchMathRandom() {
  Math.random = () => rng();
}

export function restoreMathRandom() {
  Math.random = origMathRandom;
}
