import {
  HttpConfigs,
  Dictionary,
  Resolver,
  OptionBuilder,
  getPropValue,
  ErrorBase,
  foreverPromise,
} from "./main";
import { getOption } from "./utils";

export interface GraphQLConfigs extends HttpConfigs, GraphQLOptions {}

export interface GraphQLOptions<P = any> extends Omit<HttpConfigs, "baseUrl"> {
  url?: string;
  vars?: OptionBuilder<P, Dictionary>;
  onError?(error: GraphQLError): void;
  dismissErrors?: boolean;
}

function getQueryText(doc: any) {
  return doc.loc && doc.loc.source.body;
}

export class GraphQLError extends ErrorBase {
  constructor(firstError: any, public others: Error[] = []) {
    super(firstError);
  }
}

export interface GraphQLApiCreator {
  <P = void | any, R = any>(query: any, options?: GraphQLOptions<P>): Resolver<
    P,
    R
  >;
  <P = void | any, R = any>(
    query: any,
    vars: (payload: P) => Dictionary
  ): Resolver<P, R>;

  <P = void, R = any>(
    query: any,
    path: string,
    vars: (payload: P) => Dictionary
  ): Resolver<P, R>;

  <P = void, R = any>(
    query: any,
    path: string,
    options?: GraphQLOptions<P>
  ): Resolver<P, R>;
}

const apiCreator: GraphQLApiCreator = (
  query: any,
  ...args: any[]
): Resolver => {
  if (typeof query !== "string") query = getQueryText(query) ?? "";
  let path: string | undefined;
  let options: GraphQLOptions | undefined;

  if (typeof args[0] === "string") {
    [path, options] = args;
  } else {
    [options] = args;
  }

  if (typeof options === "function") {
    options = { vars: options as Function };
  }

  return ({ configs, http }) => {
    const graphqlConfigs = configs.$graphql as GraphQLConfigs | undefined;
    const baseUrl = graphqlConfigs?.baseUrl ?? configs.http?.baseUrl ?? "";
    return async (payload: any): Promise<any> => {
      const headers: Dictionary = {
        ...getOption(configs.http?.headers, payload),
        ...getOption(graphqlConfigs?.headers, payload),
        ...getOption(options?.headers, payload),
      };

      const variables: Dictionary = {
        ...getOption(graphqlConfigs?.vars, payload),
        ...getOption(options?.vars, payload),
      };

      try {
        const res = await http({
          url: `${baseUrl}${options?.url ?? ""}`,
          method: "post",
          headers,
          body: { query, variables },
        });

        const graphqlData = res.data;

        if (graphqlData?.errors?.length) {
          const errors = graphqlData?.errors as Error[];
          throw new GraphQLError(errors[0], errors);
        }

        if (path) {
          return getPropValue(graphqlData.data, path);
        }
        return graphqlData.data;
      } catch (e) {
        const error = e instanceof GraphQLError ? e : new GraphQLError(e);
        configs.onError?.(error);
        graphqlConfigs?.onError?.(error);
        options?.onError?.(error);
        if (
          options?.dismissErrors ||
          graphqlConfigs?.dismissErrors ||
          configs.dismissErrors
        ) {
          return foreverPromise;
        }
        throw e;
      }
    };
  };
};

const configsBuilder = (configs: GraphQLConfigs) => ({ $graphql: configs });

export const graphql = Object.assign(apiCreator, { configs: configsBuilder });
