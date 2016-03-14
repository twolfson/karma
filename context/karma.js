// Define our context Karma constructor
var ContextKarma = function (callParentKarmaMethod) {
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
