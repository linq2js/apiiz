import { define, enhance, enhancer } from "./main";
import { rest } from "./rest";
import { graphql } from "./graphql";
import { debounce } from "./concurrency";
import { Dictionary, Resolver } from "./types";
import { loader } from "./loader";
import { memory } from "./memory";
import { include } from "./relation";
import { on } from "./on";
import Joi, { Schema } from "joi";
import gql from "graphql-tag";

const delay = (ms: number = 0) =>
  new Promise((resolve) => setTimeout(resolve, ms));

test("rest api", async () => {
  const api = define({
    get: rest("https://jsonplaceholder.typicode.com/todos/1"),
  });
  await expect(api.get().then((x) => x.id)).resolves.toBe(1);
});

delay;

test("graphql api", async () => {
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
    configs: { ...graphql.configs({ baseUrl: "https://graphql.anilist.co" }) },
    get: graphql<number>(getMediaByIdQuery, "Media", (id) => ({ id })),
  });

  await expect(api.get(1).then((x) => x.id)).resolves.toBe(1);
});

test("highOrderResolver", async () => {
  const cacheStorage: Dictionary = {};
  const cache =
    <P, R>(
      resolver: Resolver<P, R>,
      keyFactory: (payload: P) => string
    ): Resolver<P, R> =>
    (context) => {
      const dispatcher = resolver(context);
      return (payload) => {
        const key = keyFactory(payload);
        if (!cacheStorage[key]) {
          // the origin api and store the result
          cacheStorage[key] = dispatcher(payload);
        }
        return cacheStorage[key];
      };
    };
  const api = define({
    getUserById: enhance(
      rest<number>("https://jsonplaceholder.typicode.com/todos/{id}", {
        params: (id) => ({ id }),
      })
    ).with(cache, (payload) => payload.toString()),
  });

  const p1 = api.getUserById(1);
  const p2 = api.getUserById(1);
  const p3 = api.getUserById(2);
  const p4 = api.getUserById(2);
  expect(p1).toBe(p2);
  expect(p3).toBe(p4);
  await Promise.all([p1, p3]);
});

test("debounce", async () => {
  let done = 0;
  const api = define({
    getUserById: enhance(
      rest<number, { id: number }>(
        "https://jsonplaceholder.typicode.com/todos/{id}",
        { params: (id) => ({ id }) }
      )
    )
      .with(on, { done: () => done++ })
      .with(debounce, 10),
  });

  api.getUserById(1);
  const p1 = api.getUserById(1);
  expect(done).toBe(0);
  await expect(p1.then((x) => x.id)).resolves.toBe(1);
  expect(done).toBe(1);
});

test("loader", async () => {
  type User = { id: number };
  const api = define({
    getUserById: loader(
      rest<number[], User[]>("https://jsonplaceholder.typicode.com/users"),
      { remap: (user, id) => user.id === id }
    ),
  });
  const u1 = api.getUserById(1);
  const u2 = api.getUserById(3);
  const u3 = api.getUserById(1);
  await expect(u1.then((x) => x.id)).resolves.toBe(1);
  await expect(u2.then((x) => x.id)).resolves.toBe(3);
  await expect(u3.then((x) => x.id)).resolves.toBe(1);
});

test("include", async () => {
  type Todo = { id: number; userId: number };
  type User = { id: number; todos?: Todo[] };

  const users: User[] = [{ id: 1 }, { id: 2 }];

  const todos: Todo[] = [
    { id: 1, userId: 1 },
    { id: 2, userId: 1 },
    { id: 3, userId: 2 },
  ];

  const api = define({
    getTodo: loader(
      memory((ids: number[]) =>
        ids.map((id) => todos.find((x) => x.id === id)!)
      )
    ),
    getUser: enhance(
      memory((id: number) => users.find((x) => x.id === id)!)
    ).with(include, (load) =>
      load.value(
        "id",
        "todos",
        memory((userId: number) => todos.filter((x) => x.userId === userId))
      )
    ),
  });
  const user1 = await api.getUser(1);
  const user2 = await api.getUser(2);

  expect(user1.id).toBe(1);
  expect(user1.todos?.[0]?.id).toBe(1);
  expect(user1.todos?.[1]?.id).toBe(2);
  expect(user2.id).toBe(2);
  expect(user2.todos?.[0]?.id).toBe(3);
});

test("validation with enhancer", async () => {
  const validate = <P, R>(resolver: Resolver<P, R>, schema: Schema) =>
    enhancer(resolver, (_, dispatcher, payload) => {
      const result = schema.validate(payload, {
        convert: true,
        abortEarly: true,
      });
      if (result.error) throw result.error;
      return dispatcher(result.value);
    });
  const results: number[] = [];
  const api = define({
    addNumber: enhance(memory((value: any) => results.push(value))).with(
      validate,
      Joi.number()
    ),
  });
  await api.addNumber(1);
  await api.addNumber(2);
  // should convert value to number
  await api.addNumber("3");
  expect(results).toEqual([1, 2, 3]);
  await expect(api.addNumber(true)).rejects.toThrowError();
  expect(results).toEqual([1, 2, 3]);
});
