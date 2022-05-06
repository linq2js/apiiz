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
1. Middleare supported
1. Fully Typescript supported

## Usages

### Defining simple REST API

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
    headers(payload) {
      return {
        // pass access token that is saved in localStorage
        authorization: localStorage.getItem("token"),
      };
    },
    http: { baseUrl: "https://yourserver.com/api" },
  },
  // the url will prepend baseUrl from http configs
  getUserById: rest("/getUserById/{id}", { params: (id) => ({ id }) }),
});
```

### Using dataloader

apiiz uses dataloader package for handling batch requests. Let say you have an API get users by id list

```js
import { transform } from "apiiz";
import { loader } from "apiiz/loader";
import { rest } from "apiiz/rest";
const api = define({
  configs: { http: { baseUrl: "https://yourserver.com/api" } },
  // the url will prepend baseUrl from http configs
  getUserById: loader(
    // we are not sure the user list that is returned from server has same other with id list
    // so we use transform resolver to re-order the result
    transform(
      rest("/getUsers", {
        method: "post",
        // passing ids to request body
        body: (ids) => ({ ids }),
      }),
      (users, ids) => ids.map((id) => users.find((x) => x.id === id))
    )
    // passing dataloader options
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

### Using middleware

apiiz provides middleware machanism, where you can control requests working flow with ease

```js
import { use, define } from "apiiz";
import { rest } from "apiiz/rest";

// simple cache middleware
const cache = (keyFactory) => (context) => {
  const cacheStorage = context.__cache || (context.__cache = {});
  return (next) => (payload) => {
    const key = keyFactory(payload);
    if (!cacheStorage[key]) {
      // the origin api and store the result
      cacheStorage[key] = next(payload);
    }
    return cacheStorage[key];
  };
};

const api = define({
  getUserById: use(
    rest("/getUserById"),
    // generate cache key according to api payload
    cache((payload) => `getUserById:${payload}`)
  ),
});

api.getUserById(1);
api.getUserById(1);
api.getUserById(1);
// only one request sent
```

## API References

https://linq2js.github.io/apiiz/
