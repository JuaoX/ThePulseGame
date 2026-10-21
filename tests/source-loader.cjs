const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function createSourceLoader(globals = {}) {
  const cache = new Map();
  function load(filename) {
    const absolute = path.resolve(filename);
    if (cache.has(absolute)) return cache.get(absolute).exports;
    const module = { exports: {} }; cache.set(absolute, module);
    const raw = fs.readFileSync(absolute, 'utf8').replaceAll('import.meta.env.BASE_URL', JSON.stringify('/'));
    const code = ts.transpileModule(raw, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React } }).outputText;
    const requireSource = name => name.startsWith('.') ? load(path.resolve(path.dirname(absolute), name + (path.extname(name) ? '' : fs.existsSync(path.resolve(path.dirname(absolute), name + '.ts')) ? '.ts' : '.tsx'))) : require(name);
    vm.runInNewContext(code, { exports: module.exports, module, require: requireSource, console, Intl, Date, Math, Set, Map, setTimeout, clearTimeout, AbortController, ...globals }, { filename: absolute });
    return module.exports;
  }
  return load;
}
module.exports = { createSourceLoader };
