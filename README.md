# Easily convert your SQL database into a REST API.

This is a lightweight Express.js middleware library that is able to convert SQL databases into a REST API. This library also works
seamlessly with the [Form.io](https://form.io) platform where you can build Angular.js and React.js applications on top of your SQL database. Please go
to https://form.io to learn more.

**This library currently supports Microsoft SQL Server, MySQL, and PostgreSQL.**

## How it works

This module works by assigning routes to specific queries, which you define, that are executed when the routes are triggered. For example,
lets say you have the following customer table.

**customer**

* firstName
* lastName
* email

This library is able to convert this into the following REST API.

* GET: /customer - Returns a list of all customers.
* GET: /customer/:customerId - Returns a single customer
* POST: /customer - Creates a new customer
* PUT: /customer/:customerId - Updates a customer
* DELETE: /customer/:customerId - Deletes a customer.

Please refer to the **example** folder to see how this library is used to achieve the following.

## How to use

This library is pretty simple. You include it in your Express.js application like the following.

```
var express = require('express');
var resquel = require('resquel');

// Create the Express.js application.
var app = express();

// Include the resquel library.
app.use(resquel(config));

// Listen to port 3000.
app.listen(3000);
```

The configuration passed into the resquel library is where the magic happens.

```
{
  "db": {
    "user": "-- YOUR DATABASE USERNAME --",
    "password": "-- YOUR DATABASE PASSWORD --",
    "server": "-- YOUR DATABASE SERVER --",
    "database": "-- YOUR DATABASE NAME --",
    "options": {
      "instanceName": "-- THE SERVER INSTANCE --"
    }
  },
  "routes": [
    {
      "method": "get",
      "endpoint": "/customer",
      "query": "SELECT * FROM customers;"
    },
    {
      "method": "post",
      "endpoint": "/customer",
      "query": "INSERT INTO customers (firstName, lastName, email) VALUES ('{{ data.firstName }}', '{{ data.lastName }}', '{{ data.email }}');SELECT * FROM customers WHERE id=SCOPE_IDENTITY();"
    },
    {
      "method": "get",
      "endpoint": "/customer/:customerId",
      "query": "SELECT * FROM customers WHERE id={{ data.params.customerId }};"
    },
    {
      "method": "put",
      "endpoint": "/customer/:customerId",
      "query": "UPDATE customers SET firstName='{{ data.firstName }}', lastName='{{ data.lastName }}', email='{{ data.email }}' WHERE id={{ data.params.customerId }};SELECT * FROM customers WHERE id={{ data.params.customerId }};"
    },
    {
      "method": "delete",
      "endpoint": "/customer/:customerId",
      "query": "DELETE FROM customers WHERE id={{ data.params.customerId }};"
    }
  ]
}
```

Each route defines a new endpoint and maps a query to that enpoint. Within the query, you have access to the following.

* **data** - The req.body of the request.
* **data.params** - The req.data.params of the request. Like when you use /customer/:customerId
* **query** - The req.query of the request. Used with GET parameters like this /customer?company=1234

Enjoy!

* The Form.io Team
