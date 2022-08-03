import {
  Dictionary,
  ErrorBase,
  HttpConfigs,
  HttpMethod,
  OptionFactory,
  Resolver,
} from "./main";
import { CancelToken } from "./types";
import { foreverPromise, getOption } from "./utils";

export interface RestOptions<P = any> extends Omit<HttpConfigs<P>, "baseUrl"> {
  method?: HttpMethod;
  onError?(error: RestError): void;
  params?: OptionFactory<P, Dictionary>;
  query?: OptionFactory<P, Dictionary>;
  body?: OptionFactory<P, {} | null | undefined>;
  dismissErrors?: boolean;
  token?: OptionFactory<P, CancelToken | undefined>;
}

export class RestError extends ErrorBase {
  constructor(e: any) {
    super(e);
  }
}

export interface RestConfigs extends Omit<RestOptions, "token">, HttpConfigs {}

const create =
  <P = void, R = any>(
    url: OptionFactory<P, string>,
    options?: RestOptions<P>
  ): Resolver<P, R> =>
  ({ configs, http }) => {
    const restConfigs = configs.$rest as RestConfigs | undefined;
    const baseUrl = restConfigs?.baseUrl ?? configs.http?.baseUrl ?? "";
    return (async (payload?: P): Promise<R> => {
      const headers: Dictionary = {
        ...getOption(configs.http?.headers, payload),
        ...getOption(restConfigs?.headers, payload),
        ...getOption(options?.headers, payload),
      };
      const query: Dictionary = {
        ...getOption(options?.query, payload),
      };
      const params: Dictionary = {
        ...getOption(options?.params, payload),
      };
      const body = getOption(options?.body, payload);

      try {
        const res = await http({
          url: `${baseUrl}${getOption(url, payload)}`.replace(
            /\{([^{}]+)\}/g,
            (_, k) => params[k] ?? ""
          ),
          method: options?.method ?? "get",
          headers,
          query,
          body,
          token: getOption(options?.token, payload),
        });

        return res.data as R;
      } catch (e) {
        const error = new RestError(e);
        configs.onError?.(error);
        restConfigs?.onError?.(error);
        options?.onError?.(error);
        if (
          options?.dismissErrors ||
          restConfigs?.dismissErrors ||
          configs.dismissErrors
        ) {
          return foreverPromise;
        }
        throw e;
      }
    }) as any;
  };

const configure = (configs: RestConfigs) => ({ $rest: configs });

const createRestMethod =
  (method: HttpMethod) =>
  <P = void, R = any>(url: string, options?: Omit<RestOptions<P>, "method">) =>
    create<P, R>(url, { method: method, ...options });

/**
 * create a dispatcher that works with RESTful API
 */
export const rest = Object.assign(create, {
  configs: configure,
  post: createRestMethod("post"),
  patch: createRestMethod("patch"),
  put: createRestMethod("put"),
  get: createRestMethod("get"),
  delete: createRestMethod("delete"),
  options: createRestMethod("options"),
  head: createRestMethod("head"),
});
