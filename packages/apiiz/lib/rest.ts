import {
  Dictionary,
  ErrorBase,
  foreverPromise,
  HttpConfigs,
  HttpMethod,
  OptionBuilder,
  Resolver,
} from "./main";
import { getOption } from "./utils";

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

const apiCreator =
  <P = void, R = any>(url: string, options?: RestOptions<P>): Resolver<P, R> =>
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
  };

const configsBuilder = (configs: RestConfigs) => ({ $rest: configs });

export const rest = Object.assign(apiCreator, { configs: configsBuilder });
