Easily convert your SQL database into a REST API.
====================================================
This is a lightweight Express.js middleware library that is able to convert SQL databases into a REST API. This library also works
seamlessly with the [Form.io](https://form.io) platform where you can build Angular.js and React.js applications on top of your SQL database. Please go
to https://form.io to learn more.

**This library has been validated with Microsoft SQL Server, MySQL, and PostgreSQL.**

## How it works
This module works by assigning routes to specific queries, which you define, that are executed when the routes are triggered. For example,
lets say you have the following customer table.

**customer**
  - *firstName*
  - *lastName*
  - *email*

This library is able to convert this into the following REST API.

  - **GET: /customer** - Returns a list of all customers.
  - **GET: /customer/:id** - Returns a single customer
  - **POST: /customer** - Creates a new customer
  - **PUT: /customer/:id** - Updates a customer
  - **DELETE: /customer/:id** - Deletes a customer.

Please refer to the **FULL CRUD Example** below to see how example configurations to achieve the following.

# How to use
This library is pretty simple. You include it in your Express.js application like the following.

```
const { Resquel } = require('resquel');
const express = require('express');
const app = express();

(async function () {
    const resquel = new Resquel({
      db: {
        client: 'mysql',
        connection: {
          host: 'localhost',
          database: 'formio',
          user: 'root',
          password: 'CHANGEME'
        }
      },
      routes: [
        {
          method: 'get',
          endpoint: '/customer',
          query: 'SELECT * FROM customers'
        },
        ...
      ]
    });
    await resquel.init();
    app.use(resquel.router);

    // Listen to port 3010.
    app.listen(3010);
})();
```

## DB Configuration
Please review [Knex documentation](http://knexjs.org/#Installation-client) for specific details on configuring the database connection. The paramaters are passed through to Knex, so all options that are valid there for your database server will work.


## Routes
The routes definition is where you will define all of your SQL routes for this library. It is an array of routes that are each defined as follows.

```
{
  method: 'get|post|put|delete',
  endpoint: '/your/endpoint/:withParams',
  query: 'SELECT * FROM customer'
}
```

### Advanced Queries
The query property in routes can be provided in 3 forms:
1) Simple query
```
query: 'SELECT * FROM customer'
```
This is very limited in use, and mostly provided as shorthand

2) Multiple queries
```
query: [
  'TRUNCATE customer',
  'SELECT * FROM customer'
]
```
When multiple queries are provided, only the return response from the last query appears in the reply

3) Prepared queries
```
query: [
  [
    'UPDATE customer SET firstName=?, lastName=?, email=? WHERE id=?',
    'body.firstName',
    'body.lastName',
    'body.email',
    'params.id'
  ],
  [
    'SELECT * FROM customer id=?',
    'params.id'
  ]
]
```

This is the true intended way to use the library. In the inner arrays, the first item **MUST** be the query. All subsequent items are substitution values for the `?` in the query in the format of object paths on the `req` object. All properties are accessible, including (but not limited to): `headers`, `params`, `query`, `body`.

If not all values required by the prepared query are available, then an error will be emitted and execution of queries on that route will be halted (if there are followup queries present).

**Note:** When using prepared queries, mixing in shorthand style queries will result in an error. Invalid example:
```
query: [
  [
    'DELETE FROM customer WHERE id=?',
    'params.customerId'
  ],
  'SELECT COUNT(*) AS num FROM customer'
]
```

### Full CRUD example
Let's suppose that you have a SQL table called "customers" that have the following fields.

 - First Name (firstName)
 - Last Name (lastName)
 - Email (email)

The following configuration would generate a full CRUD REST API for this SQL Table.

```
const { Resquel } = require('resquel');
const express = require('express');
const app = express();
(async function () {
    const resquel = new Resquel({
        db: {
            client: process.env.DB_TYPE,
            connection: {
                host: process.env.DB_HOST,
                database: process.env.DB_NAME,
                user: process.env.DB_USER,
                password: process.env.DB_PASS
            },
        },
        routes: [
            {
              method: 'get',
              endpoint: '/customer',
              query: 'SELECT * FROM customers'
            },
            {
              method: 'post',
              endpoint: '/customer',
              query: [
                [
                  'INSERT INTO customers (firstname, lastName, email) VALUES (?, ?, ?, ?)',
                  'body.data.firstName',
                  'body.data.lastName',
                  'body.data.email'
                ],
                [
                  'SELECT * FROM customers WHERE id=LAST_INSERT_ID();'
                ]
              ]
            },
            {
              method: 'get',
              endpoint: '/customer/:id',
              query: [
                'SELECT * FROM customers WHERE id=?',
                'params.id'
              ]
            },
            {
              method: 'put',
              endpoint: '/customer/:id',
              query: [
                [
                  'UPDATE customers SET firstName=?, lastName=?, email=? WHERE id=?',
                  'body.data.firstName',
                  'body.data.lastName',
                  'body.data.email'
                ],
                [
                  'SELECT * FROM customers WHERE id=?',
                  'params.id'
                ]
              ]
            },
            {
              method: 'delete',
              endpoint: '/customer/:id',
              query: [
                'DELETE FROM customers WHERE id=?',
                'params.id'
              ]
            }
        ]
    });
    await resquel.init();
    app.use(resquel.router);
    app.listen(3010);
})();
```

### Troubleshooting
#### Using with MySQL 8
With the latest version of MySQL 8, you will need to ensure that the "root" user is able to login with the password provider. Otherwise you will get an error. If you are using this library with MySQL 8, please make sure you run the following query within your database to ensure that you are able to authenticate properly.

```
ALTER USER 'root'@'%' IDENTIFIED WITH mysql_native_password BY 'YourRootPassword';
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'YourRootPassword';
```

-----
Enjoy!

 - The Form.io Team
