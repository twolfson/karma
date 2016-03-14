var lodash = require('lodash')
var stringify = require('../common/stringify')
var constant = require('./constants')
var util = require('../common/util')

var Karma = function (socket, iframe, opener, navigator, location) {
  var hasError = false
  var startEmitted = false
  var reloadingContext = false
  var store = {}
  var self = this
  var queryParams = util.parseQueryParams(location.search)
  var browserId = queryParams.id || util.generateId('manual-')
  var displayName = queryParams.displayName
  var returnUrl = queryParams['return_url' + ''] || null

  var resultsBufferLimit = 50
  var resultsBuffer = []

  this.VERSION = constant.VERSION
  this.config = {}

  // Expose for testing purposes as there is no global socket.io
  // registry anymore.
  this.socket = socket

  var childWindow = null
  var navigateContextTo = function (url) {
    if (self.config.useIframe === false) {
      // If there is a window already open, then close it
      // DEV: In some environments (e.g. Electron), we don't have setter access for location
      if (childWindow !== null && childWindow.closed !== true) {
        childWindow.close()
      }
      childWindow = opener(url)
    } else {
      iframe.src = url
    }
  }

  this.setupContext = function (contextWindow) {
    var getConsole = function (currentWindow) {
      return currentWindow.console || {
        log: function () {},
        info: function () {},
        warn: function () {},
        error: function () {},
        debug: function () {}
      }
    }

    // TODO: Remove this line as it's a workaround for now...
    // TODO: Remove __karma__ from tests as well
    lodash.assign(contextWindow.__karma__, this)

    if (self.config.captureConsole) {
      // patch the console
      var localConsole = contextWindow.console = getConsole(contextWindow)
      var logMethods = ['log', 'info', 'warn', 'error', 'debug']
      var patchConsoleMethod = function (method) {
        var orig = localConsole[method]
        if (!orig) {
          return
        }
        localConsole[method] = function () {
          self.log(method, arguments)
          return Function.prototype.apply.call(orig, localConsole, arguments)
        }
      }
      for (var i = 0; i < logMethods.length; i++) {
        patchConsoleMethod(logMethods[i])
      }
    }

    contextWindow.dump = function () {
      self.log('dump', arguments)
    }

    contextWindow.alert = function (msg) {
      self.log('alert', [msg])
    }
  }

  this.onbeforeunload = function () {
    if (!reloadingContext) {
      // TODO(vojta): show what test (with explanation about jasmine.UPDATE_INTERVAL)
      self.error('Some of your tests did a full page reload!')
    }
  }

  this.log = function (type, args) {
    var values = []

    for (var i = 0; i < args.length; i++) {
      values.push(this.stringify(args[i], 3))
    }

    this.info({log: values.join(', '), type: type})
  }

  this.stringify = stringify

  var clearContext = function () {
    reloadingContext = true

    navigateContextTo('about:blank')
  }

  // error during js file loading (most likely syntax error)
  // we are not going to execute at all
  this.error = function (msg, url, line) {
    hasError = true
    var message = msg

    if (url) {
      message = msg + '\nat ' + url + (line ? ':' + line : '')
    }

    socket.emit('karma_error', message)
    this.complete()
    return false
  }

  this.result = function (result) {
    if (!startEmitted) {
      socket.emit('start', {total: null})
      startEmitted = true
    }

    if (resultsBufferLimit === 1) {
      return socket.emit('result', result)
    }

    resultsBuffer.push(result)

    if (resultsBuffer.length === resultsBufferLimit) {
      socket.emit('result', resultsBuffer)
      resultsBuffer = []
    }
  }

  this.complete = function (result) {
    if (resultsBuffer.length) {
      socket.emit('result', resultsBuffer)
      resultsBuffer = []
    }

    if (self.config.clearContext) {
      // give the browser some time to breath, there could be a page reload, but because a bunch of
      // tests could run in the same event loop, we wouldn't notice.
      setTimeout(function () {
        clearContext()
      }, 0)
    }

    socket.emit('complete', result || {}, function () {
      if (returnUrl) {
        location.href = returnUrl
      }
    })
  }

  this.info = function (info) {
    // TODO(vojta): introduce special API for this
    if (!startEmitted && util.isDefined(info.total)) {
      socket.emit('start', info)
      startEmitted = true
    } else {
      socket.emit('info', info)
    }
  }

  // TODO: Does anyone use `this.store`???
  //   https://gitter.im/karma-runner/karma?at=56e48e07618c335373eb497f
  this.store = function (key, value) {
    if (util.isUndefined(value)) {
      return store[key]
    }

    if (util.instanceOf(value, 'Array')) {
      var s = store[key] = []
      for (var i = 0; i < value.length; i++) {
        s.push(value[i])
      }
    } else {
      // TODO(vojta): clone objects + deep
      store[key] = value
    }
  }

  socket.on('execute', function (cfg) {
    // reset hasError and reload the iframe
    hasError = false
    startEmitted = false
    self.config = cfg
    // if not clearing context, reloadingContext always true to prevent beforeUnload error
    reloadingContext = !self.config.clearContext
    navigateContextTo(constant.CONTEXT_URL)

    // clear the console before run
    // works only on FF (Safari, Chrome do not allow to clear console from js source)
    if (window.console && window.console.clear) {
      window.console.clear()
    }
  })
  socket.on('stop', function () {
    this.complete()
  }.bind(this))

  // report browser name, id
  socket.on('connect', function () {
    socket.io.engine.on('upgrade', function () {
      resultsBufferLimit = 1
    })
    var info = {
      name: navigator.userAgent,
      id: browserId
    }
    if (displayName) {
      info.displayName = displayName
    }
    socket.emit('register', info)
  })
}

module.exports = Karma
