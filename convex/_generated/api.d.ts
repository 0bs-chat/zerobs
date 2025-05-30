/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as chatInput_actions from "../chatInput/actions.js";
import type * as chatInput_mutations from "../chatInput/mutations.js";
import type * as chatInput_queries from "../chatInput/queries.js";
import type * as chats_actions from "../chats/actions.js";
import type * as chats_mutations from "../chats/mutations.js";
import type * as chats_queries from "../chats/queries.js";
import type * as crons from "../crons.js";
import type * as documents_actions from "../documents/actions.js";
import type * as documents_mutations from "../documents/mutations.js";
import type * as documents_queries from "../documents/queries.js";
import type * as http from "../http.js";
import type * as langchain_agent from "../langchain/agent.js";
import type * as langchain_db from "../langchain/db.js";
import type * as langchain_getTools from "../langchain/getTools.js";
import type * as langchain_index from "../langchain/index.js";
import type * as langchain_models from "../langchain/models.js";
import type * as mcps_actions from "../mcps/actions.js";
import type * as mcps_crud from "../mcps/crud.js";
import type * as mcps_mutations from "../mcps/mutations.js";
import type * as mcps_queries from "../mcps/queries.js";
import type * as projectDocuments_actions from "../projectDocuments/actions.js";
import type * as projectDocuments_mutations from "../projectDocuments/mutations.js";
import type * as projectDocuments_queries from "../projectDocuments/queries.js";
import type * as projects_mutations from "../projects/mutations.js";
import type * as projects_queries from "../projects/queries.js";
import type * as streams_crud from "../streams/crud.js";
import type * as streams_mutations from "../streams/mutations.js";
import type * as streams_queries from "../streams/queries.js";
import type * as utils_flyio_index from "../utils/flyio/index.js";
import type * as utils_flyio_types from "../utils/flyio/types.js";
import type * as utils_helpers from "../utils/helpers.js";

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
  auth: typeof auth;
  "chatInput/actions": typeof chatInput_actions;
  "chatInput/mutations": typeof chatInput_mutations;
  "chatInput/queries": typeof chatInput_queries;
  "chats/actions": typeof chats_actions;
  "chats/mutations": typeof chats_mutations;
  "chats/queries": typeof chats_queries;
  crons: typeof crons;
  "documents/actions": typeof documents_actions;
  "documents/mutations": typeof documents_mutations;
  "documents/queries": typeof documents_queries;
  http: typeof http;
  "langchain/agent": typeof langchain_agent;
  "langchain/db": typeof langchain_db;
  "langchain/getTools": typeof langchain_getTools;
  "langchain/index": typeof langchain_index;
  "langchain/models": typeof langchain_models;
  "mcps/actions": typeof mcps_actions;
  "mcps/crud": typeof mcps_crud;
  "mcps/mutations": typeof mcps_mutations;
  "mcps/queries": typeof mcps_queries;
  "projectDocuments/actions": typeof projectDocuments_actions;
  "projectDocuments/mutations": typeof projectDocuments_mutations;
  "projectDocuments/queries": typeof projectDocuments_queries;
  "projects/mutations": typeof projects_mutations;
  "projects/queries": typeof projects_queries;
  "streams/crud": typeof streams_crud;
  "streams/mutations": typeof streams_mutations;
  "streams/queries": typeof streams_queries;
  "utils/flyio/index": typeof utils_flyio_index;
  "utils/flyio/types": typeof utils_flyio_types;
  "utils/helpers": typeof utils_helpers;
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

export declare const components: {};
