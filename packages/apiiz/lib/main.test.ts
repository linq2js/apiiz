import { define, on, use } from "./main";
import { rest } from "./rest";
import { graphql } from "./graphql";
import { debounce } from "./concurrency";
import gql from "graphql-tag";
import { Dictionary, Dispatcher, Middleware } from "./types";

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

test("middleware", async () => {
  const cacheStorage: Dictionary = {};
  const cache =
    <P>(keyFactory: (payload: P) => string): Middleware<P> =>
    () => {
      return ((next: Dispatcher) => (payload: any) => {
        const key = keyFactory(payload);
        if (!cacheStorage[key]) {
          // the origin api and store the result
          cacheStorage[key] = next(payload);
        }
        return cacheStorage[key];
      }) as any;
    };
  const api = define({
    getUserById: use(
      rest<number>("https://jsonplaceholder.typicode.com/todos/{id}", {
        params: (id) => ({ id }),
      }),
      cache((payload) => payload.toString())
    ),
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
    getUserById: use(
      rest<number>("https://jsonplaceholder.typicode.com/todos/{id}", {
        params: (id) => ({ id }),
      }),
      on({ done: () => done++ }),
      debounce(10)
    ),
  });
  api.getUserById(1);
  const p1 = api.getUserById(1);
  expect(done).toBe(0);
  await expect(p1.then((x) => x.id)).resolves.toBe(1);
  expect(done).toBe(1);
});
