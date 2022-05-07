# `apiiz`

Create API mappings with ease

## Installation

**with NPM**

```bash
npm i apiiz --save
```

**with YARN**

```bash
yarn add apiiz
```

## Peer dependencies

- Install dataloader if you use loader resolver (see example)

## Features

1. REST API supported
1. GraphQL API supported
1. Dataloader supported
1. Enhancers supported
1. Highly extensible
1. Fully Typescript supported

## Usages

### Defining REST API

```js
import { define } from "apiiz";
import { rest } from "apiiz/rest";

const api = define({
  getUserById: rest("https://yourserver.com/api/getUserById/{id}", {
    // convert api payload to URL params
    params: (payload) => ({ id: payload }),
  }),
  // if your API requires user id as query param, just do this
  getUserById2: rest("https://yourserver.com/api/getUserById", {
    // convert api payload to URL params
    query: (id) => ({ id }),
  }),
});

// apiiz will generate an object that has getUserById method
// a API mapped method returns a promise object. The promise object will resolve when request completed and reject if there is any HTTP error
api.getUserById(1);
```

### Defining GraphQL API

```js
import { define } from "apiiz";
import gql from "graphql-tag";
import { graphql } from "apiiz/graphql";

const getMediaByIdQuery = gql`
  query GetMediaById($id: Int!) {
    Media(id: $id) {
      id
      startDate {
        year
        month
        day
      }
      season
      tags {
        id
      }
    }
  }
`;

const api = define({
  // graphql() can retrieve query object or query string
  getMediaById: graphql(getMediaByIdQuery, {
    url: "https://yourserver.com/graphql",
    // map payload to variables
    vars: (payload) => ({ id: payload }),
  }), // this API will return { Media: { id, name, ... } }
  getMediaById2: graphql(
    getMediaByIdQuery,
    // select Media prop of data object that returned from server
    "Media",
    {
      url: "https://yourserver.com/graphql",
      vars: (payload) => ({ id: payload }),
    } // this API will return { id, name, ... }
  ),
});
```

### Using HTTP configs

```js
const api = define({
  configs: {
    // headers builder
    headers: () => ({
      // pass access token that is saved in localStorage
      authorization: localStorage.getItem("token"),
    }),
    http: { baseUrl: "https://yourserver.com/api" },
  },
  // the url will prepend baseUrl from http configs
  getUserById: rest("/getUserById/{id}", { params: (id) => ({ id }) }),
});
```

### Using dataloader

apiiz uses dataloader package for handling batch requests. Let say you have an API get users by id list

```js
import { loader } from "apiiz/loader";
import { rest } from "apiiz/rest";
const api = define({
  configs: { http: { baseUrl: "https://yourserver.com/api" } },
  // the url will prepend baseUrl from http configs
  getUserById: loader(
    rest("/getUsers", {
      method: "post",
      // passing ids to request body
      body: (ids) => ({ ids }),
    }),
    {
      // if you are not sure the user list that is returned from server has same order with id, use remap() to make it right
      remap: (user, id) => user.id === id,
      // other dataloader options
    }
  ),
});

api.getUserById(1);
api.getUserById(2);
api.getUserById(1); // duplicated
api.getUserById(3);
// all getUserById requests will be delayed in awhile and only one getUsers request sends to server
```

### Handling errors

```js
const api = define({
  configs: {
    // this is global error handler, it will be called by all API providers (rest, graphql)
    onError(e) {
      console.log(e);
    },
    // by default, dismissErrors = false, if you set dismissErrors = true, all errors are dismissed and the API will return the promise that runs forever. The error handlers still recieve errors
    dismissErrors: false,
    ...rest.configs({
      // this is error handler for REST API only
      onError(e) {},
    }),
    ...graphql.configs({
      // this is error handler for GraphQL API only
      onError(e) {},
    }),
  },
});
```

### Using enhancers

apiiz provides enhancer machanism, where you can control requests working flow with ease

```js
import { use, define } from "apiiz";
import { rest } from "apiiz/rest";

// simple cache enhancer
const cache = (originalResolver, keyFactory) => (context) => {
  const originalDispatcher = originalResolver(context);
  const cacheStorage = context.__cache || (context.__cache = {});
  // return a new dispatcher
  return (payload) => {
    // generate the cache key
    const key = keyFactory(payload);
    // if the key is not exist in the cache, call originalDispatcher to get result and store the result to the cache
    if (!cacheStorage[key]) {
      cacheStorage[key] = originalDispatcher(payload);
    }
    return cacheStorage[key];
  };
};

const api = define({
  getUserById: enhance(rest("/getUserById")).with(
    cache,
    // this arg will pass to cache()
    (payload) =>
      // generate cache key according to api payload
      `getUserById:${payload}`
  ),
});

const p1 = api.getUserById(1);
const p1 = api.getUserById(1);
const p1 = api.getUserById(1);
console.log(p1 === p2); // true
// only one request sent
```

### Validating payload

You can create validate() enhancer that uses Joi/Yup for validating API payload

```js
import { define, enhancer, enhance } from "apiiz";
import { memory } from "apiiz/memory";
import Joi from "joi";

// a validate fn retrieves Joi schema
const validate = (resolver, schema) =>
  // using enhancer() to create new enhancer quickly
  enhancer(resolver, (context, dispatcher, payload) => {
    // validate the payload and correct payload types if possible
    const result = schema.validate(payload, {
      convert: true,
      abortEarly: true,
    });
    // throw error if any
    if (result.error) throw result.error;
    // using the validated value as new payload
    return dispatcher(result.value);
  });
const database = [];
const api = define({
  addNumber: enhance(
    // create a memory API, just push a value to database object
    memory((value) => database.push(value))
  ).with(
    validate,
    // payload must be number
    Joi.number()
  ),
});

api.addNumber(1);
api.addNumber(2);
api.addNumber("3"); // '3' will be converted to 3
api.addNumber("abcdef"); // an error will be thrown
```

### Server APIs

apiiz can be used for both backend and frontend, you can take advantages of data batch loading, caching, validating

```js
import prisma from "./prisma";
import { define, enhancer, enhance } from "apiiz";
import { memory } from "apiiz/memory";
import { validate } from "./enhancers/validate";
import Joi from "joi";

// create a simple route register enhancer
const route = (resolver, method, path, payloadSelector) => {
  return (context) => {
    // get express app object from configs
    const app = context.configs.app;
    const dispatcher = resolver(dispatcher);
    app[method]((req, res) => {
      // get payload from req
      const payload = payloadSelector(req);
      // dispatch API body and send the result/error to client
      dispatcher(payload).then(
        (result) => res.json(result),
        (error) => res.status(400).json(error)
      );
    });
    return dispatcher;
  };
};

const api = define({
  getUser: enhance(
    // using loader for batch loading
    loader(
      // you can create new prisma API creator in this case
      // we use memory for basic example
      memory((ids) => prisma.user.findMany({ where: { id: { in: ids } } })),
      // the users that returned from prisma might has wrong order, so need to re-order those users
      { remap: (user, id) => user.id === id }
    )
  )
    .with(validate, Joi.number())
    // the route enhancer must be last one to make sure it can receive all enhanced results of previous ones
    .with(route, "get", "/user/:id", (req) => req.params.id),
});
```

## API References

https://linq2js.github.io/apiiz/
