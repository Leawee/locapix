module.exports = function jpegtranLoader(source) {
  return source
    .replace(
      'ENVIRONMENT_IS_NODE=globalThis.process?.versions?.node&&globalThis.process?.type!="renderer"',
      "ENVIRONMENT_IS_NODE=false",
    )
    .replace('import("node:module")', "Promise.resolve({})")
    .replace('require("node:fs")', "null")
    .replace('require("node:path")', "null")
    .replace('require("node:url")', "null");
};
