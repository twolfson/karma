var path = require('path')
var optimist = require('optimist')
var fs = require('graceful-fs')

var Server = require('./server')
var helper = require('./helper')
var constant = require('./constants')

// Define common options
var helpOption = {
  describe: 'Print usage and options.'
};
var portOption = {
  describe: '<integer> Port where the server is listening.'
};
var logLevelOption = {
  describe: '<disable | error | warn | info | debug> Level of logging.'
};
var colorsOption = {
  describe: 'Use colors when reporting and printing logs.'
};
var noColorsOption = {
  describe: 'Do not use colors when reporting or printing logs.'
};

var processArgs = function (argv, options, fs, path) {
  if (argv.help) {
    console.log(optimist.help())
    process.exit(0)
  }

  if (argv.version) {
    console.log('Karma version: ' + constant.VERSION)
    process.exit(0)
  }

  // TODO(vojta): warn/throw when unknown argument (probably mispelled)
  Object.getOwnPropertyNames(argv).forEach(function (name) {
    var argumentValue = argv[name]
    if (name !== '_' && name !== '$0') {
      if (Array.isArray(argumentValue)) {
        // If the same argument is defined multiple times, override.
        argumentValue = argumentValue.pop()
      }
      options[helper.dashToCamel(name)] = argumentValue
    }
  })

  if (helper.isString(options.autoWatch)) {
    options.autoWatch = options.autoWatch === 'true'
  }

  if (helper.isString(options.colors)) {
    options.colors = options.colors === 'true'
  }

  if (helper.isString(options.failOnEmptyTestSuite)) {
    options.failOnEmptyTestSuite = options.failOnEmptyTestSuite === 'true'
  }

  if (helper.isString(options.formatError)) {
    try {
      var required = require(options.formatError)
    } catch (err) {
      console.error('Could not require formatError: ' + options.formatError, err)
    }
    // support exports.formatError and module.exports = function
    options.formatError = required.formatError || required
    if (!helper.isFunction(options.formatError)) {
      console.error('Format error must be a function, got: ' + typeof options.formatError)
      process.exit(1)
    }
  }

  if (helper.isString(options.logLevel)) {
    var logConstant = constant['LOG_' + options.logLevel.toUpperCase()]
    if (helper.isDefined(logConstant)) {
      options.logLevel = logConstant
    } else {
      console.error('Log level must be one of disable, error, warn, info, or debug.')
      process.exit(1)
    }
  } else if (helper.isDefined(options.logLevel)) {
    console.error('Log level must be one of disable, error, warn, info, or debug.')
    process.exit(1)
  }

  if (helper.isString(options.singleRun)) {
    options.singleRun = options.singleRun === 'true'
  }

  if (helper.isString(options.browsers)) {
    options.browsers = options.browsers.split(',')
  }

  if (options.reportSlowerThan === false) {
    options.reportSlowerThan = 0
  }

  if (helper.isString(options.reporters)) {
    options.reporters = options.reporters.split(',')
  }

  if (helper.isString(options.removedFiles)) {
    options.removedFiles = options.removedFiles.split(',')
  }

  if (helper.isString(options.addedFiles)) {
    options.addedFiles = options.addedFiles.split(',')
  }

  if (helper.isString(options.changedFiles)) {
    options.changedFiles = options.changedFiles.split(',')
  }

  if (helper.isString(options.refresh)) {
    options.refresh = options.refresh === 'true'
  }

  var configFile = argv._.shift()

  if (!configFile) {
    // default config file (if exists)
    if (fs.existsSync('./karma.conf.js')) {
      configFile = './karma.conf.js'
    } else if (fs.existsSync('./karma.conf.coffee')) {
      configFile = './karma.conf.coffee'
    } else if (fs.existsSync('./karma.conf.ts')) {
      configFile = './karma.conf.ts'
    } else if (fs.existsSync('./.config/karma.conf.js')) {
      configFile = './.config/karma.conf.js'
    } else if (fs.existsSync('./.config/karma.conf.coffee')) {
      configFile = './.config/karma.conf.coffee'
    } else if (fs.existsSync('./.config/karma.conf.ts')) {
      configFile = './.config/karma.conf.ts'
    }
  }

  options.configFile = configFile ? path.resolve(configFile) : null

  return options
}

var parseClientArgs = function (argv) {
  // extract any args after '--' as clientArgs
  var clientArgs = []
  argv = argv.slice(2)
  var idx = argv.indexOf('--')
  if (idx !== -1) {
    clientArgs = argv.slice(idx + 1)
  }
  return clientArgs
}

// return only args that occur before `--`
var argsBeforeDoubleDash = function (argv) {
  var idx = argv.indexOf('--')

  return idx === -1 ? argv : argv.slice(0, idx)
}

var describeShared = function () {
  optimist
    .usage('Karma - Spectacular Test Runner for JavaScript.\n\n' +
      'Usage:\n' +
      '  $0 <command>\n\n' +
      'Commands:\n' +
      '  start [<configFile>] [<options>] Start the server / do single run.\n' +
      '  init [<configFile>] Initialize a config file.\n' +
      '  run [<options>] [ -- <clientArgs>] Trigger a test run.\n' +
      '  completion Shell completion for karma.\n\n' +
      'Run --help with particular command to see its description and available options.')
    .options({
      help: helpOption,
      version: 'Print current version.'
    })
}

var describeInit = function () {
  optimist
    .usage('Karma - Spectacular Test Runner for JavaScript.\n\n' +
      'INIT - Initialize a config file.\n\n' +
      'Usage:\n' +
      '  $0 init [<configFile>]')
    .options({
      'log-level': logLevelOption,
      colors: colorsOption,
      'no-colors': noColorsOption,
      help: helpOption
    })
}

var describeStart = function () {
  optimist
    .usage('Karma - Spectacular Test Runner for JavaScript.\n\n' +
      'START - Start the server / do a single run.\n\n' +
      'Usage:\n' +
      '  $0 start [<configFile>] [<options>]')
    .options({
      port: {
        describe: '<integer> Port where the server is running.'
      },
      'auto-watch': {
        describe: 'Auto watch source files and run on change.'
      },
      detached: {
        describe: 'Detach the server.'
      },
      'no-auto-watch': {
        describe: 'Do not watch source files.'
      },
      'log-level': logLevelOption,
      colors: colorsOption,
      'no-colors': noColorsOption,
      reporters: {
        describe: 'List of reporters (available: dots, progress, junit, growl, coverage).'
      },
      browsers: {
        describe: 'List of browsers to start (eg. --browsers Chrome,ChromeCanary,Firefox).'
      },
      'capture-timeout': {
        describe: '<integer> Kill browser if does not capture in given time [ms].'
      },
      'single-run': {
        describe: 'Run the test when browsers captured and exit.'
      },
      'no-single-run': {
        describe: 'Disable single-run.'
      },
      'report-slower-than': {
        describe: '<integer> Report tests that are slower than given time [ms].'
      },
      'fail-on-empty-test-suite': {
        describe: 'Fail on empty test suite.'
      },
      'no-fail-on-empty-test-suite': {
        describe: 'Do not fail on empty test suite.'
      },
      help: helpOption
    })
}

var describeRun = function () {
  optimist
    .usage('Karma - Spectacular Test Runner for JavaScript.\n\n' +
      'RUN - Run the tests (requires running server).\n\n' +
      'Usage:\n' +
      '  $0 run [<configFile>] [<options>] [ -- <clientArgs>]')
    .options({
      port: portOption,
      'no-refresh': {
        describe: 'Do not re-glob all the patterns.'
      },
      'fail-on-empty-test-suite': {
        describe: 'Fail on empty test suite.'
      },
      'no-fail-on-empty-test-suite': {
        describe: 'Do not fail on empty test suite.'
      },
      'help': helpOption,
      'log-level': logLevelOption,
      'colors': colorsOption,
      'no-colors': noColorsOption
    })
}

var describeStop = function () {
  optimist
    .usage('Karma - Spectacular Test Runner for JavaScript.\n\n' +
      'STOP - Stop the server (requires running server).\n\n' +
      'Usage:\n' +
      '  $0 run [<configFile>] [<options>]')
    .options({
      port: portOption,
      logLevel: logLevelOption,
      help: helpOption
    })
}

var describeCompletion = function () {
  optimist
    .usage('Karma - Spectacular Test Runner for JavaScript.\n\n' +
      'COMPLETION - Bash/ZSH completion for karma.\n\n' +
      'Installation:\n' +
      '  $0 completion >> ~/.bashrc\n')
    .options({
      help: helpOption
    })
}

exports.process = function () {
  var argv = optimist.parse(argsBeforeDoubleDash(process.argv.slice(2)))
  var options = {
    cmd: argv._.shift()
  }

  switch (options.cmd) {
    case 'start':
      describeStart()
      break

    case 'run':
      describeRun()
      options.clientArgs = parseClientArgs(process.argv)
      break

    case 'stop':
      describeStop()
      break

    case 'init':
      describeInit()
      break

    case 'completion':
      describeCompletion()
      break

    default:
      describeShared()
      if (!options.cmd) {
        processArgs(argv, options, fs, path)
        console.error('Command not specified.')
      } else {
        console.error('Unknown command "' + options.cmd + '".')
      }
      optimist.showHelp()
      process.exit(1)
  }

  return processArgs(argv, options, fs, path)
}

exports.run = function () {
  var config = exports.process()

  switch (config.cmd) {
    case 'start':
      new Server(config).start()
      break
    case 'run':
      require('./runner').run(config)
      break
    case 'stop':
      require('./stopper').stop(config)
      break
    case 'init':
      require('./init').init(config)
      break
    case 'completion':
      require('./completion').completion(config)
      break
  }
}

// just for testing
exports.processArgs = processArgs
exports.parseClientArgs = parseClientArgs
exports.argsBeforeDoubleDash = argsBeforeDoubleDash
