/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as apiKeys_mutations from "../apiKeys/mutations.js";
import type * as apiKeys_queries from "../apiKeys/queries.js";
import type * as auth from "../auth.js";
import type * as autumn from "../autumn.js";
import type * as chatMessages_crud from "../chatMessages/crud.js";
import type * as chatMessages_helpers from "../chatMessages/helpers.js";
import type * as chatMessages_mutations from "../chatMessages/mutations.js";
import type * as chatMessages_queries from "../chatMessages/queries.js";
import type * as chats_crud from "../chats/crud.js";
import type * as chats_mutations from "../chats/mutations.js";
import type * as chats_queries from "../chats/queries.js";
import type * as crons from "../crons.js";
import type * as documents_actions from "../documents/actions.js";
import type * as documents_crud from "../documents/crud.js";
import type * as documents_mutations from "../documents/mutations.js";
import type * as documents_queries from "../documents/queries.js";
import type * as http from "../http.js";
import type * as langchain_agent from "../langchain/agent.js";
import type * as langchain_db from "../langchain/db.js";
import type * as langchain_helpers from "../langchain/helpers.js";
import type * as langchain_index from "../langchain/index.js";
import type * as langchain_models from "../langchain/models.js";
import type * as langchain_prompts from "../langchain/prompts.js";
import type * as langchain_state from "../langchain/state.js";
import type * as langchain_tools_googleTools from "../langchain/tools/googleTools.js";
import type * as langchain_tools_index from "../langchain/tools/index.js";
import type * as langchain_tools_mcpTools from "../langchain/tools/mcpTools.js";
import type * as langchain_tools_retrievalTools from "../langchain/tools/retrievalTools.js";
import type * as langchain_utils from "../langchain/utils.js";
import type * as mcps_actions from "../mcps/actions.js";
import type * as mcps_crud from "../mcps/crud.js";
import type * as mcps_mutations from "../mcps/mutations.js";
import type * as mcps_queries from "../mcps/queries.js";
import type * as mcps_utils from "../mcps/utils.js";
import type * as migrations from "../migrations.js";
import type * as projectDocuments_mutations from "../projectDocuments/mutations.js";
import type * as projectDocuments_queries from "../projectDocuments/queries.js";
import type * as projects_mutations from "../projects/mutations.js";
import type * as projects_queries from "../projects/queries.js";
import type * as streams_crud from "../streams/crud.js";
import type * as streams_mutations from "../streams/mutations.js";
import type * as streams_queries from "../streams/queries.js";
import type * as usage_mutations from "../usage/mutations.js";
import type * as usage_queries from "../usage/queries.js";
import type * as utils_encryption from "../utils/encryption.js";
import type * as utils_flyio_index from "../utils/flyio/index.js";
import type * as utils_flyio_types from "../utils/flyio/types.js";
import type * as utils_helpers from "../utils/helpers.js";
import type * as utils_oauth_index from "../utils/oauth/index.js";
import type * as utils_oauth_providers from "../utils/oauth/providers.js";
import type * as utils_services_index from "../utils/services/index.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "apiKeys/mutations": typeof apiKeys_mutations;
  "apiKeys/queries": typeof apiKeys_queries;
  auth: typeof auth;
  autumn: typeof autumn;
  "chatMessages/crud": typeof chatMessages_crud;
  "chatMessages/helpers": typeof chatMessages_helpers;
  "chatMessages/mutations": typeof chatMessages_mutations;
  "chatMessages/queries": typeof chatMessages_queries;
  "chats/crud": typeof chats_crud;
  "chats/mutations": typeof chats_mutations;
  "chats/queries": typeof chats_queries;
  crons: typeof crons;
  "documents/actions": typeof documents_actions;
  "documents/crud": typeof documents_crud;
  "documents/mutations": typeof documents_mutations;
  "documents/queries": typeof documents_queries;
  http: typeof http;
  "langchain/agent": typeof langchain_agent;
  "langchain/db": typeof langchain_db;
  "langchain/helpers": typeof langchain_helpers;
  "langchain/index": typeof langchain_index;
  "langchain/models": typeof langchain_models;
  "langchain/prompts": typeof langchain_prompts;
  "langchain/state": typeof langchain_state;
  "langchain/tools/googleTools": typeof langchain_tools_googleTools;
  "langchain/tools/index": typeof langchain_tools_index;
  "langchain/tools/mcpTools": typeof langchain_tools_mcpTools;
  "langchain/tools/retrievalTools": typeof langchain_tools_retrievalTools;
  "langchain/utils": typeof langchain_utils;
  "mcps/actions": typeof mcps_actions;
  "mcps/crud": typeof mcps_crud;
  "mcps/mutations": typeof mcps_mutations;
  "mcps/queries": typeof mcps_queries;
  "mcps/utils": typeof mcps_utils;
  migrations: typeof migrations;
  "projectDocuments/mutations": typeof projectDocuments_mutations;
  "projectDocuments/queries": typeof projectDocuments_queries;
  "projects/mutations": typeof projects_mutations;
  "projects/queries": typeof projects_queries;
  "streams/crud": typeof streams_crud;
  "streams/mutations": typeof streams_mutations;
  "streams/queries": typeof streams_queries;
  "usage/mutations": typeof usage_mutations;
  "usage/queries": typeof usage_queries;
  "utils/encryption": typeof utils_encryption;
  "utils/flyio/index": typeof utils_flyio_index;
  "utils/flyio/types": typeof utils_flyio_types;
  "utils/helpers": typeof utils_helpers;
  "utils/oauth/index": typeof utils_oauth_index;
  "utils/oauth/providers": typeof utils_oauth_providers;
  "utils/services/index": typeof utils_services_index;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {
  migrations: {
    lib: {
      cancel: FunctionReference<
        "mutation",
        "internal",
        { name: string },
        {
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }
      >;
      cancelAll: FunctionReference<
        "mutation",
        "internal",
        { sinceTs?: number },
        Array<{
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }>
      >;
      clearAll: FunctionReference<
        "mutation",
        "internal",
        { before?: number },
        null
      >;
      getStatus: FunctionReference<
        "query",
        "internal",
        { limit?: number; names?: Array<string> },
        Array<{
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }>
      >;
      migrate: FunctionReference<
        "mutation",
        "internal",
        {
          batchSize?: number;
          cursor?: string | null;
          dryRun: boolean;
          fnHandle: string;
          name: string;
          next?: Array<{ fnHandle: string; name: string }>;
        },
        {
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }
      >;
    };
  };
  autumn: {};
};
