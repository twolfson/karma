// sets window.__karma__ and overrides console and error handling
// Use window.opener if this was opened by someone else - in a new window
(function () {
  var parentWindow = window.opener || window.parent;
  parentWindow.karma.setupContext(window);
}());
