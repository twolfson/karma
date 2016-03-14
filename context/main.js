// TODO: Be sure that we lint this...
// Resolve our parent window
var parentWindow = window.opener || window.parent;

// Define a remote call method for Karma
var callParentKarmaMethod = function (method, args) {
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
  // TODO: The postMessage implementation of `callParentKarmaMethod` is untested. Please test it
  callParentKarmaMethod = function (method, args) {
    // TODO: In PhantomJS, we had to use `window.parent` not `window.opener`.
    //   If we run into issues, try moving to `window.opener`
    parentWindow.postMessage({method: method, arguments: args}, window.location.origin);
  };
}

// Call our initialization function
parentWindow.karma.setupContext(window);
