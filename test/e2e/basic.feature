Feature: Basic Testrunner
  In order to use Karma
  As a person who wants to write great tests
  I want to be able to run tests from the command line.

  Scenario: Execute a test in PhantomJS
    Given a configuration with:
      """
      files = ['basic/plus.js', 'basic/test.js'];
      browsers = ['PhantomJS'];
      plugins = [
        'karma-jasmine',
        'karma-phantomjs-launcher'
      ];
      """
    When I start Karma
    Then it passes with:
      """
      ..
      PhantomJS
      """
