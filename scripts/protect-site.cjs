'use strict';
const fs = require('node:fs');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const {minify} = require('html-minifier-terser');
const JavaScriptObfuscator = require('javascript-obfuscator');

async function main() {
  const input = fs.readFileSync('index.html', 'utf8');
  if (input.includes('data-mx-protected="1"')) {
    console.log('Production page already protected; skipping.');
    return;
  }

  const scripts = [...input.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
  assert.equal(scripts.length, 1, 'Expected exactly one inline script in index.html.');
  assert.ok(scripts[0][1].includes('mx.currency.web.v2'), 'Currency app source marker missing.');
  const source = scripts[0][1];
  const code = JavaScriptObfuscator.obfuscate(source, {
    compact: true,
    controlFlowFlattening: false,
    deadCodeInjection: false,
    debugProtection: false,
    disableConsoleOutput: false,
    identifierNamesGenerator: 'hexadecimal',
    numbersToExpressions: false,
    renameGlobals: false,
    selfDefending: false,
    simplify: true,
    splitStrings: false,
    stringArray: true,
    stringArrayCallsTransform: false,
    stringArrayEncoding: ['base64'],
    stringArrayRotate: true,
    stringArrayShuffle: true,
    stringArrayThreshold: 0.8,
    transformObjectKeys: false,
    unicodeEscapeSequence: false
  }).getObfuscatedCode();
  assert.ok(code.length > 1000, 'Unexpectedly short protected output.');
  const hash = crypto.createHash('sha256').update(code).digest('hex').slice(0, 16);
  const name = 'mx.' + hash + '.js';
  fs.writeFileSync(name, code + '\n');
  const protectedHTML = input.replace(scripts[0][0], '<script data-mx-protected="1" defer src="/' + name + '"></script>');
  const output = await minify(protectedHTML, {
    collapseWhitespace: true,
    conservativeCollapse: true,
    removeComments: true,
    minifyCSS: true,
    minifyJS: false,
    removeEmptyAttributes: false,
    removeAttributeQuotes: false,
    removeOptionalTags: false,
    removeRedundantAttributes: false,
    sortAttributes: false,
    sortClassName: false
  });
  assert.ok(output.includes(name), 'Protected asset missing from HTML.');
  assert.ok(!output.includes(source.slice(100, 200)), 'Inline source accidentally retained.');
  assert.ok(output.includes('Live world exchange rates by MazenmiX'), 'OG/description metadata changed.');
  fs.writeFileSync('index.html', output + '\n');
  console.log('Protected MX Money page. JS file:', name, 'source chars:', source.length, 'protected chars:', code.length);
}
main().catch(error => {console.error(error); process.exitCode = 1;});