/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as apiKeys_actions from "../apiKeys/actions.js";
import type * as apiKeys_mutations from "../apiKeys/mutations.js";
import type * as apiKeys_queries from "../apiKeys/queries.js";
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
import type * as langchain_agent from "../langchain/agent.js";
import type * as langchain_db from "../langchain/db.js";
import type * as langchain_helpers from "../langchain/helpers.js";
import type * as langchain_index from "../langchain/index.js";
import type * as langchain_models from "../langchain/models.js";
import type * as langchain_prompts from "../langchain/prompts.js";
import type * as langchain_state from "../langchain/state.js";
import type * as langchain_tools from "../langchain/tools.js";
import type * as mcps_actions from "../mcps/actions.js";
import type * as mcps_crud from "../mcps/crud.js";
import type * as mcps_mutations from "../mcps/mutations.js";
import type * as mcps_queries from "../mcps/queries.js";
import type * as mcps_utils from "../mcps/utils.js";
import type * as projectDocuments_mutations from "../projectDocuments/mutations.js";
import type * as projectDocuments_queries from "../projectDocuments/queries.js";
import type * as projects_mutations from "../projects/mutations.js";
import type * as projects_queries from "../projects/queries.js";
import type * as schemaUtils from "../schemaUtils.js";
import type * as streams_crud from "../streams/crud.js";
import type * as streams_mutations from "../streams/mutations.js";
import type * as streams_queries from "../streams/queries.js";
import type * as utils_encryption from "../utils/encryption.js";
import type * as utils_flyio_index from "../utils/flyio/index.js";
import type * as utils_flyio_types from "../utils/flyio/types.js";
import type * as utils_helpers from "../utils/helpers.js";
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
  "apiKeys/actions": typeof apiKeys_actions;
  "apiKeys/mutations": typeof apiKeys_mutations;
  "apiKeys/queries": typeof apiKeys_queries;
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
  "langchain/agent": typeof langchain_agent;
  "langchain/db": typeof langchain_db;
  "langchain/helpers": typeof langchain_helpers;
  "langchain/index": typeof langchain_index;
  "langchain/models": typeof langchain_models;
  "langchain/prompts": typeof langchain_prompts;
  "langchain/state": typeof langchain_state;
  "langchain/tools": typeof langchain_tools;
  "mcps/actions": typeof mcps_actions;
  "mcps/crud": typeof mcps_crud;
  "mcps/mutations": typeof mcps_mutations;
  "mcps/queries": typeof mcps_queries;
  "mcps/utils": typeof mcps_utils;
  "projectDocuments/mutations": typeof projectDocuments_mutations;
  "projectDocuments/queries": typeof projectDocuments_queries;
  "projects/mutations": typeof projects_mutations;
  "projects/queries": typeof projects_queries;
  schemaUtils: typeof schemaUtils;
  "streams/crud": typeof streams_crud;
  "streams/mutations": typeof streams_mutations;
  "streams/queries": typeof streams_queries;
  "utils/encryption": typeof utils_encryption;
  "utils/flyio/index": typeof utils_flyio_index;
  "utils/flyio/types": typeof utils_flyio_types;
  "utils/helpers": typeof utils_helpers;
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

export declare const components: {};
