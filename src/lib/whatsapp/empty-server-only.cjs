const Module = require("module");

const originalLoad = Module._load;
Module._load = function loadWithServerOnlyStub(request, parent, isMain) {
  if (request === "server-only") {
    return {};
  }

  return originalLoad.apply(this, arguments);
};
