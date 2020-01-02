'use strict';

var Q = require('q');
var _ = require('lodash');
var debug = {
  getRequestData: require('debug')('resquel:util:getRequestData')
};

/**
 * Escape a string for SQL injection.
 *
 * @param {string} query
 *   The SQL query to sanitize.
 *
 * @returns {string}
 *   The escaped query.
 */
var escape = function(query) {
  return query.replace(/[\0\n\r\b\t\\\'\"\x1a]/g, function(s) { // eslint-disable-line no-control-regex
    switch (s) {
      case '\0':
        return '\\0';
      case '\n':
        return '\\n';
      case '\r':
        return '\\r';
      case '\b':
        return '\\b';
      case '\t':
        return '\\t';
      case '\'':
        return '\'\'';
      case '\x1a':
        return '\\Z';
      default:
        return '\\' + s;
    }
  });
};

/**
 * Get the input data from the given request.
 *
 * @param {object} req
 *   The express request object.
 *
 * @returns {object}
 *   The data from the incoming request.
 */
var getRequestData = function(req) {
  var data = {};

  // Start building the core data obj to replace string properties with.
  if (_.has(req, 'body')) {
    data = _.assign(data, _.get(req, 'body'));
  }

  // Let the params have priority over request body data.
  if (_.has(req, 'params')) {
    data = _.assign(data, {params: _.get(req, 'params')});
  }

  // Let the query have priority over request body data.
  if (_.has(req, 'query')) {
    data = _.assign(data, {query: _.get(req, 'query')});
  }

  debug.getRequestData(data);
  return data;
};

/**
 * Create anonymous function to sanitize user input for sql query injection.
 *
 * @param {object} data
 *   The request data object.
 *
 * @returns {Function}
 *   The function to replace the data in the query.
 */
var queryReplace = function(data) {
  return function() {
    var value = '';
    var args = Array.prototype.slice.call(arguments);

    if (!(args instanceof Array) || args.length < 2) {
      return value;
    }

    // Get the token for replacement.
    value = _.get(data, args[1]);

    // Make sure we only set the strings or numbers.
    switch (typeof value) {
      case 'string':
        return escape(value);
      case 'number':
        return value;
      default:
        return '';
    }
  };
};

/**
 * Check if the current route has a before fn defined, if so, execute it and proceed.
 *
 * @param {object} route
 *   The route object.
 * @param {object} req
 *   The express request object.
 * @param {object} res
 *   The express response object.
 *
 * @returns {Promise}
 */
var before = function before(route, req, res) {
  if (!route.hasOwnProperty('before') || (typeof route.before !== 'function')) {
    return Q();
  }

  // Ensure they can hook into the before handler.
  route.before(req, res, function(err, result) {
    if (err) {
      throw err;
    }

    return result;
  });
};

/**
 * Check if the current route has a after fn defined, if so, execute it and proceed.
 *
 * @param {object} route
 *   The route object.
 * @param {object} req
 *   The express request object.
 * @param {object} res
 *   The express response object.
 *
 * @returns {Promise}
 */
var after = function after(route, req, res) {
  if (!route.hasOwnProperty('after') || (typeof route.after !== 'function')) {
    // Send the result.
    res.status(res.result.status).send(res.result);
    return;
  }

  // Ensure they can hook into the after handler.
  route.after(req, res, function(err, result) {
    result = result || res.result;
    if (err) {
      throw err;
    }

    // Send the result.
    res.status(result.status).send(result);
    return result;
  });
};

module.exports = {
  escape: escape,
  getRequestData: getRequestData,
  queryReplace: queryReplace,
  before: before,
  after: after
};
