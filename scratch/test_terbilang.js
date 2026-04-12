import { getTerbilang } from './lib/evidenceRules.js';

const testCases = [
  0,
  7,
  11,
  12,
  19,
  20,
  45,
  100,
  150,
  200,
  575,
  1000,
  1200,
  2000,
  15000,
  100000,
  720000,
  1000000,
  6000000,
  1250500,
  999999999
];

console.log("=== Hasil Uji Coba getTerbilang ===\n");

testCases.forEach(num => {
  try {
    console.log(`${num.toLocaleString('id-ID').padStart(15)} => ${getTerbilang(num)}`);
  } catch (err) {
    console.log(`${num.toLocaleString('id-ID').padStart(15)} => ERROR: ${err.message}`);
  }
});
