import axios from "axios";
import {
  HttpConfigs,
  Dictionary,
  Resolver,
  OptionBuilder,
  getPropValue,
} from "./main";

export interface GraphQLConfigs extends HttpConfigs, GraphQLOptions {}

export interface GraphQLOptions<P = any>
  extends Omit<HttpConfigs, "urlPrefix"> {
  vars?: OptionBuilder<P, Dictionary>;
}

function getGqlString(doc: any) {
  return doc.loc && doc.loc.source.body;
}

export class GraphQLError extends Error {
  constructor(public errors: Error[]) {
    super(errors[0].message);
  }
}

export interface GraphQLApiCreator {
  <P = void, R = any>(query: any, options?: GraphQLOptions<P>): Resolver<P, R>;

  <P = void, R = any>(
    query: any,
    path: string,
    options: GraphQLOptions<P>
  ): Resolver<P, R>;
}

const graphqlApiCreator: GraphQLApiCreator = (
  query: any,
  ...args: any[]
): Resolver => {
  if (typeof query !== "string") query = getGqlString(query) ?? "";
  let path: string | undefined;
  let options: GraphQLOptions | undefined;

  if (typeof args[0] === "string") {
    [path, options] = args;
  } else {
    [options] = args;
  }
  return (configs) => {
    const graphqlConfigs = configs.$graphql as GraphQLConfigs | undefined;
    const urlPrefix =
      graphqlConfigs?.urlPrefix ?? configs.http?.urlPrefix ?? "";
    return async (payload: any): Promise<any> => {
      const allOptions: GraphQLOptions[] = [];
      if (configs.http) allOptions.push({ ...configs.http });
      if (graphqlConfigs) allOptions.push(graphqlConfigs);
      if (options) allOptions.push(options);

      const headers: Dictionary = {};
      const variables: Dictionary = {};

      for (const options of allOptions) {
        if (options.headers) {
          Object.assign(
            headers,
            typeof options.headers === "function"
              ? options.headers(payload)
              : options.headers
          );
        }

        if (options.vars) {
          Object.assign(
            variables,
            typeof options.vars === "function"
              ? options.vars(payload)
              : options.vars
          );
        }
      }

      const res = await axios({
        url: urlPrefix,
        method: "post",
        headers,
        data: {
          query,
          variables,
        },
      });

      const graphqlData = res.data;

      if (graphqlData?.errors?.length) {
        const errors = graphqlData?.errors as Error[];
        throw new GraphQLError(errors);
      }

      if (path) {
        return getPropValue(graphqlData.data, path);
      }
      return graphqlData.data;
    };
  };
};

const graphqlConfigsBuilder = (configs: GraphQLConfigs) => ({
  $graphql: configs,
});

export const graphql = Object.assign(graphqlApiCreator, {
  configs: graphqlConfigsBuilder,
});
