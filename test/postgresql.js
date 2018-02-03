/* eslint-env node, mocha */
'use strict';

var _ = require('lodash');
var request = require('supertest');
var assert = require('assert');
var express = require('express');
var util = require('../src/util');
var chance = new require('chance')(); // eslint-disable-line new-cap
var config = {
  type: 'postgresql',
  db: {
    server: 'localhost',
    user: 'test',
    password: 'test',
    database: 'test'
  },
  routes: require('../example/postgresql/routes/index.js')
};

var app = express();
var sql = null;

describe('resquel tests', function() {
  var called = {
    POST: [],
    GET: [],
    PUT: [],
    DELETE: [],
    INDEX: []
  };

  describe('bootstrap routes', function() {
    it('add before/after route functions', function(done) {
      config.routes.forEach(function(route) {
        var type = route.method.toString().toUpperCase();
        if (type === 'GET' && route.endpoint.indexOf('/:') === -1) {
          type = 'INDEX';
        }

        route.before = function(req, res, next) {
          called[type].push('before');
          next();
        };
        route.after = function(req, res, next) {
          called[type].push('after');
          next();
        };
      });
      done();
    });
  });

  describe('bootstrap environment', function() {
    before(function() {
      sql = require('../src/postgresql')(util);
    });

    after(function() {
      app.use(require('../index')(config));
    });

    it('connect to the db', function(done) {
      var temp = _.cloneDeep(config.db);
      // Login as the root user.
      temp.user = 'postgres';
      temp.password = 'postgres';
      temp.database = 'postgres';
      sql
        .connect(temp)
        .then(function() {
          return done();
        })
        .catch(function(err) {
          return done(err);
        })
        .done();
    });

    it('use plsql', function(done) {
      sql
        .request('CREATE OR REPLACE LANGUAGE plpgsql;')
        .then(function() {
          return done();
        })
        .catch(function(err) {
          return done(err);
        });
    });

    it('clear the test db', function(done) {
      sql
        .request('DROP DATABASE IF EXISTS test')
        .then(function() {
          return done();
        })
        .catch(function(err) {
          return done(err);
        })
        .done();
    });

    it('clear the test user', function(done) {
      sql
        .request('DROP USER test')
        .then(function() {
          return done();
        })
        .catch(function() {
          return done();
        })
        .done();
    });

    it('create the test user', function(done) {
      sql
        .request("CREATE USER test WITH PASSWORD 'test'")
        .then(function() {
          return done();
        })
        .catch(function(err) {
          return done(err);
        });
    });

    it('create the test db', function(done) {
      sql
        .request("CREATE DATABASE test WITH OWNER 'test'")
        .then(function() {
          return done();
        })
        .catch(function(err) {
          return done(err);
        })
        .done();
    });

    it('connect to the test db', function(done) {
      sql
        .connect(config.db)
        .then(function() {
          return done();
        })
        .catch(function(err) {
          return done(err);
        })
        .done();
    });

    it('create the test table', function(done) {
      sql
        .request(
          'CREATE TABLE customers' +
            '(' +
            'id serial,' +
            '"firstName" text,' +
            '"lastName" text,' +
            'email text,' +
            'PRIMARY KEY ("id"),' +
            'UNIQUE ("id")' +
            ')' +
            'TABLESPACE "pg_default";'
        )
        .then(function() {
          return done();
        })
        .catch(function(err) {
          return done(err);
        });
    });
  });

  var customer = null;
  describe('create tests', function() {
    it('create a customer', function(done) {
      request(app)
        .post('/customer')
        .send({
          data: {
            firstName: chance.word(),
            lastName: chance.word(),
            email: chance.email()
          }
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert.equal(response.rows.length, 1);
          customer = response.rows[0];
          done();
        });
    });

    it('the before handler was called first for the route', function(done) {
      assert(called.POST instanceof Array);
      assert(called.POST.length >= 1);
      assert(called.POST[0] === 'before');
      done();
    });

    it('the after handler was called second for the route', function(done) {
      assert(called.POST instanceof Array);
      assert(called.POST.length >= 2);
      assert(called.POST[1] === 'after');
      done();
    });
  });

  describe('index tests', function() {
    it('read the index of all customers', function(done) {
      request(app)
        .get('/customer')
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert.equal(response.rows.length, 1);
          done();
        });
    });

    it('the before handler was called first for the route', function(done) {
      assert(called.INDEX instanceof Array);
      assert(called.INDEX.length >= 1);
      assert(called.INDEX[0] === 'before');
      done();
    });

    it('the after handler was called second for the route', function(done) {
      assert(called.INDEX instanceof Array);
      assert(called.INDEX.length >= 2);
      assert(called.INDEX[1] === 'after');
      done();
    });
  });

  describe('read tests', function() {
    it('read a customer', function(done) {
      request(app)
        .get('/customer/' + customer.id)
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert.equal(response.rows.length, 1);
          assert.deepEqual(response.rows[0], customer);
          done();
        });
    });

    it('the before handler was called first for the route', function(done) {
      assert(called.GET instanceof Array);
      assert(called.GET.length >= 1);
      assert(called.GET[0] === 'before');
      done();
    });

    it('the after handler was called second for the route', function(done) {
      assert(called.GET instanceof Array);
      assert(called.GET.length >= 2);
      assert(called.GET[1] === 'after');
      done();
    });
  });

  describe('update tests', function() {
    it('update a customer', function(done) {
      request(app)
        .put('/customer/' + customer.id)
        .send({
          data: {
            firstName: chance.word()
          }
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert.equal(response.rows.length, 1);
          assert.notEqual(response.rows[0].firstName, customer.firstName);
          customer = response.rows[0];
          done();
        });
    });

    it('the before handler was called first for the route', function(done) {
      assert(called.PUT instanceof Array);
      assert(called.PUT.length >= 1);
      assert(called.PUT[0] === 'before');
      done();
    });

    it('the after handler was called second for the route', function(done) {
      assert(called.PUT instanceof Array);
      assert(called.PUT.length >= 2);
      assert(called.PUT[1] === 'after');
      done();
    });
  });

  describe('delete tests', function() {
    it('delete a customer', function(done) {
      request(app)
        .delete('/customer/' + customer.id)
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert.deepEqual(response.rows, []);
          customer = null;
          done();
        });
    });

    it('the before handler was called first for the route', function(done) {
      assert(called.DELETE instanceof Array);
      assert(called.DELETE.length >= 1);
      assert(called.DELETE[0] === 'before');
      done();
    });

    it('the after handler was called second for the route', function(done) {
      assert(called.DELETE instanceof Array);
      assert(called.DELETE.length >= 2);
      assert(called.DELETE[1] === 'after');
      done();
    });

    it('no customers exist after deleting them all', function(done) {
      request(app)
        .get('/customer')
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          var response = res.body;
          assert.equal(response.rows.length, 0);
          done();
        });
    });
  });
});
