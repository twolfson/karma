// TODO: Be sure that we lint this...
// sets window.__karma__ and overrides console and error handling
// Use window.opener if this was opened by someone else - in a new window
(function () {

  // Call our initialization function
  var parentWindow = window.opener || window.parent;
  parentWindow.karma.setupContext(window);

  // Define a remote call method for Karma
  window.callParentKarmaMethod = function (method, args) {
    // If the method doesn't exist, then error out
    if (!parentWindow.karma[method]) {
      parentWindow.karma.error('Expected Karma method "' + method + '" to exist but it doesn\'t');
      return;
    }

    // Otherwise, run our method
    parentWindow.karma[method].apply(parentWindow.karma, args);
  };

  // If we don't have access to the window, then use `postMessage`
  // DEV: In Electron, we don't have access to the parent window due to it being in a separate process
  // DEV: We avoid using this in Internet Explorer as they only support strings
  //   http://caniuse.com/#search=postmessage
  var haveParentAccess = false;
  try { haveParentAccess = !!parentWindow.window; } catch (err) { /* Ignore errors (likely permisison errors) */ }
  if (!haveParentAccess) {
    callParentKarma = function (method, args) {
      parentWindow.postMessage({method: method, arguments: args}, window.location.origin);
    };
  }

  // Run an example method
  window.callParentKarmaMethod('log', ['log', ['hi']]);
}());
