import { define, enhance } from "./main";
import { include } from "./relation";
import { rest } from "./rest";
import { Resolver } from "./types";

type Todo = { id: number; title: string };

type User = {
  id: number;
  name: string;
  todoIds: number[] | undefined;
  todos: Todo[];
  maangerId: number | undefined;
  manager: User | undefined;
};

const getTodo = rest<number, Todo>("");
const getUser: Resolver<number, User> = enhance(
  rest<number, User>("/user/{id}", { params: (id) => ({ id }) })
).with(include, (load) =>
  load
    .multiple("todoIds", "todos", getTodo)
    .single("maangerId", "manager", getUser)
);

const api = define({
  getTodoById: getTodo,
  getUserById: getUser,
});

api.getTodoById(1);
