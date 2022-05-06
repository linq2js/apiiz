import {
  Dictionary,
  ErrorBase,
  foreverPromise,
  HttpConfigs,
  HttpMethod,
  OptionBuilder,
  Resolver,
} from "./main";

export interface RestOptions<P = any> extends Omit<HttpConfigs<P>, "baseUrl"> {
  method?: HttpMethod;
  onError?(error: RestError): void;
  params?: OptionBuilder<P, Dictionary>;
  query?: OptionBuilder<P, Dictionary>;
  body?: OptionBuilder<P>;
  dismissErrors?: boolean;
}

export class RestError extends ErrorBase {
  constructor(e: any) {
    super(e);
  }
}

export interface RestConfigs extends RestOptions, HttpConfigs {}

export const rest = Object.assign(
  <P = void, R = any>(url: string, options?: RestOptions<P>): Resolver<P, R> =>
    ({ configs, http }) => {
      const restConfigs = configs.$rest as RestConfigs | undefined;
      const baseUrl = restConfigs?.baseUrl ?? configs.http?.baseUrl ?? "";
      return (async (payload?: P): Promise<R> => {
        const allOptions: RestOptions[] = [];
        if (configs.http) allOptions.push({ ...configs.http });
        if (restConfigs) allOptions.push(restConfigs);
        if (options) allOptions.push(options);

        const headers: Dictionary = {};
        const query: Dictionary = {};
        const params: Dictionary = {};

        let body: any;
        for (const options of allOptions) {
          if (options.headers) {
            Object.assign(
              headers,
              typeof options.headers === "function"
                ? options.headers(payload)
                : options.headers
            );
          }
          if (options.params) {
            Object.assign(
              params,
              typeof options.params === "function"
                ? options.params(payload)
                : options.params
            );
          }
          if (options.query) {
            Object.assign(
              query,
              typeof options.query === "function"
                ? options.query(payload)
                : options.query
            );
          }
          if (options.body) {
            body =
              typeof options.body === "function"
                ? options.body(payload)
                : options.body;
          }
        }
        try {
          const res = await http({
            url: `${baseUrl}${url}`.replace(
              /\{([^{}]+)\}/g,
              (_, k) => params[k] ?? ""
            ),
            method: options?.method ?? "get",
            headers,
            query,
            body,
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
    },
  {
    configs: (configs: RestConfigs) => ({ $rest: configs }),
  }
);
