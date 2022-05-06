import axios from "axios";
import { Dictionary, HttpConfigs, OptionBuilder, Resolver } from "./main";

export interface RestOptions<P = any> extends Omit<HttpConfigs<P>, "baseUrl"> {
  type?: "get" | "post" | "head" | "options" | "put" | "delete" | "patch";
  params?: OptionBuilder<P, Dictionary>;
  query?: OptionBuilder<P, Dictionary>;
  body?: OptionBuilder<P>;
}

export interface RestConfigs extends RestOptions, HttpConfigs {}

export const rest = Object.assign(
  <P = void, R = any>(url: string, options?: RestOptions<P>): Resolver<P, R> =>
    (configs) => {
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
        const res = await axios({
          url: `${baseUrl}${url}`.replace(
            /\{([^{}]+)\}/g,
            (_, k) => params[k] ?? ""
          ),
          method: options?.type ?? "get",
          headers,
          params: query,
          data: body,
        });
        return res.data as R;
      }) as any;
    },
  {
    configs: (configs: RestConfigs) => ({ $rest: configs }),
  }
);
