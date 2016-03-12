// TODO: Be sure that we lint this...
// sets window.__karma__ and overrides console and error handling
// Use window.opener if this was opened by someone else - in a new window
(function () {
  window.addEventListener('message', function handleMessage (evt) {
    console.log('child got message');
  });
  var parentWindow = window.opener || window.parent;
  parentWindow.karma.setupContext(window);
  console.log('postMessage', !!parentWindow.postMessage);
  window.parent.postMessage('hi', window.location.origin);
}());
