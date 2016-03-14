var ContextKarma = function (callParentKarmaMethod) {
  this.setupContext = function () {
    // Call our initialization function
    // TODO: Don't pass window through context
    callParentKarmaMethod('setupContext', [window]);
  };
};

module.exports = ContextKarma;
