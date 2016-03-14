// Load our dependencies
var stringify = require('../common/stringify')

// Define our context Karma constructor
// TODO: We prob don't need a class, do we...?
var ContextKarma = function (callParentKarmaMethod) {
  // Define properties
  var hasError = false

  // Define our loggers
  // DEV: These are intentionally repeated in client and context
  this.log = function (type, args) {
    var values = []

    for (var i = 0; i < args.length; i++) {
      values.push(this.stringify(args[i], 3))
    }

    this.info({log: values.join(', '), type: type})
  }

  this.stringify = stringify

  // Define our proxy error handler
  // DEV: We require one in our context to track `hasError`
  this.error = function () {
    hasError = true
    callParentKarmaMethod('error', [].slice.call(arguments));
  }

  // Define our start handler
  var UNIMPLEMENTED_START = function () {
    this.error('You need to include some adapter that implements __karma__.start method!')
  }
  // all files loaded, let's start the execution
  this.loaded = function () {
    // has error -> cancel
    if (!hasError) {
      this.start(this.config)
    }

    // remove reference to child iframe
    this.start = UNIMPLEMENTED_START
  }
  // supposed to be overriden by the context
  // TODO(vojta): support multiple callbacks (queue)
  this.start = UNIMPLEMENTED_START

  // TODO: Define proxy methods
  ['complete', 'info', 'result']

  // Define bindings for context window
  this.setupContext = function (contextWindow) {
    // Call our initialization function
    // TODO: Don't pass window through context
    callParentKarmaMethod('setupContext', [contextWindow]);
  };
};

// Define call/proxy methods
ContextKarma.getDirectCallParentKarmaMethod = function (parentWindow) {
  return function directCallParentKarmaMethod (method, args) {
    // If the method doesn't exist, then error out
    if (!parentWindow.karma[method]) {
      parentWindow.karma.error('Expected Karma method "' + method + '" to exist but it doesn\'t');
      return;
    }

    // Otherwise, run our method
    parentWindow.karma[method].apply(parentWindow.karma, args);
  };
};
ContextKarma.getPostMessageCallParentKarmaMethod = function (parentWindow) {
  // TODO: The postMessage implementation of `callParentKarmaMethod` is untested. Please test it
  return  function postMessageCallParentKarmaMethod (method, args) {
    parentWindow.postMessage({method: method, arguments: args}, window.location.origin);
  };
};

// Export our module
module.exports = ContextKarma;
