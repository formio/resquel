'use strict';

var express = require('express');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var router = express.Router();
var _ = require('lodash');
var Q = require('q');
var debug = require('debug')('resquel:core');

module.exports = function(config) {
  var util = require('./src/util');
  var types = require('./src/types')(util);

  // Add Middleware necessary for REST API's
  router.use(bodyParser.urlencoded({extended: true}));
  router.use(bodyParser.json());
  router.use(methodOverride('X-HTTP-Method-Override'));

  // Add Basic authentication to our API.
  if (config.auth) {
    var basicAuth = require('basic-auth-connect');
    router.use(basicAuth(config.auth.username, config.auth.password));
  }

  // Attempt to override the default sql type. Set to mssql for backwards compatibility.
  var sql = types.mssql;
  if (_.has(config, 'type') && _.has(types, _.get(config, 'type'))) {
    sql = _.get(types, _.get(config, 'type'));
  }

  sql
    .connect(config.db)
    .catch(function(err) {
      if (err) {
        console.log('Could not connect to database.'); // eslint-disable-line no-console
        console.log(err); // eslint-disable-line no-console
        throw err;
      }
    })
    .done();

  // Iterate through each routes.
  config.routes.forEach(function(route) {
    debug(route.method.toString().toLowerCase());
    router[route.method.toString().toLowerCase()](route.endpoint, function(req, res) {
      var queryToken = /{{\s+([^}]+)\s+}}/g;

      // Get the query.
      var query = (typeof route.query === 'function') ? route.query(req, res) : route.query;
      var count = (typeof route.count === 'function') ? route.count(req, res) : route.count;

      var data = util.getRequestData(req);

      // Get the query to execute.
      query = query.replace(queryToken, util.queryReplace(data));
      debug(query);

      // If there is no query then respond with no change.
      if (!query) {
        return res.status(204).json({});
      }

      // Perform a count query.
      if (count) {
        count = count.replace(queryToken, util.queryReplace(data));
        debug(count);
      }

      Q()
        .then(sql.before(route, req, res))
        .then(function() {
          if (count) {
            return Q.fcall(sql.count, route, count, query);
          }

          return Q.fcall(sql.query, route, query);
        })
        .then(function(result) {
          res.result = result;
          return sql.after(route, req, res);
        })
        .catch(function(err) {
          return res.status(500).send(err.message || err);

          debug(err);
        })
        .done();
    });
  });

  return router;
};
