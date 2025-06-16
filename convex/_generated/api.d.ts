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
import type * as auth from "../auth.js";
import type * as chatInputs_mutations from "../chatInputs/mutations.js";
import type * as chatInputs_queries from "../chatInputs/queries.js";
import type * as chats_actions from "../chats/actions.js";
import type * as chats_crud from "../chats/crud.js";
import type * as chats_mutations from "../chats/mutations.js";
import type * as chats_queries from "../chats/queries.js";
import type * as checkpointer_checkpointer from "../checkpointer/checkpointer.js";
import type * as checkpointer_mutations from "../checkpointer/mutations.js";
import type * as checkpointer_queries from "../checkpointer/queries.js";
import type * as crons from "../crons.js";
import type * as documents_actions from "../documents/actions.js";
import type * as documents_crud from "../documents/crud.js";
import type * as documents_mutations from "../documents/mutations.js";
import type * as documents_queries from "../documents/queries.js";
import type * as http from "../http.js";
import type * as langchain_agent from "../langchain/agent.js";
import type * as langchain_db from "../langchain/db.js";
import type * as langchain_getTools from "../langchain/getTools.js";
import type * as langchain_index from "../langchain/index.js";
import type * as langchain_models from "../langchain/models.js";
import type * as langchain_state from "../langchain/state.js";
import type * as mcps_actions from "../mcps/actions.js";
import type * as mcps_crud from "../mcps/crud.js";
import type * as mcps_mutations from "../mcps/mutations.js";
import type * as mcps_queries from "../mcps/queries.js";
import type * as mcps_utils from "../mcps/utils.js";
import type * as projectDocuments_mutations from "../projectDocuments/mutations.js";
import type * as projectDocuments_queries from "../projectDocuments/queries.js";
import type * as projects_mutations from "../projects/mutations.js";
import type * as projects_queries from "../projects/queries.js";
import type * as streams_crud from "../streams/crud.js";
import type * as streams_mutations from "../streams/mutations.js";
import type * as streams_queries from "../streams/queries.js";
import type * as utils_encryption from "../utils/encryption.js";
import type * as utils_flyio_index from "../utils/flyio/index.js";
import type * as utils_flyio_types from "../utils/flyio/types.js";
import type * as utils_helpers from "../utils/helpers.js";
import type * as utils_oauth_github_repo from "../utils/oauth/github_repo.js";
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
  auth: typeof auth;
  "chatInputs/mutations": typeof chatInputs_mutations;
  "chatInputs/queries": typeof chatInputs_queries;
  "chats/actions": typeof chats_actions;
  "chats/crud": typeof chats_crud;
  "chats/mutations": typeof chats_mutations;
  "chats/queries": typeof chats_queries;
  "checkpointer/checkpointer": typeof checkpointer_checkpointer;
  "checkpointer/mutations": typeof checkpointer_mutations;
  "checkpointer/queries": typeof checkpointer_queries;
  crons: typeof crons;
  "documents/actions": typeof documents_actions;
  "documents/crud": typeof documents_crud;
  "documents/mutations": typeof documents_mutations;
  "documents/queries": typeof documents_queries;
  http: typeof http;
  "langchain/agent": typeof langchain_agent;
  "langchain/db": typeof langchain_db;
  "langchain/getTools": typeof langchain_getTools;
  "langchain/index": typeof langchain_index;
  "langchain/models": typeof langchain_models;
  "langchain/state": typeof langchain_state;
  "mcps/actions": typeof mcps_actions;
  "mcps/crud": typeof mcps_crud;
  "mcps/mutations": typeof mcps_mutations;
  "mcps/queries": typeof mcps_queries;
  "mcps/utils": typeof mcps_utils;
  "projectDocuments/mutations": typeof projectDocuments_mutations;
  "projectDocuments/queries": typeof projectDocuments_queries;
  "projects/mutations": typeof projects_mutations;
  "projects/queries": typeof projects_queries;
  "streams/crud": typeof streams_crud;
  "streams/mutations": typeof streams_mutations;
  "streams/queries": typeof streams_queries;
  "utils/encryption": typeof utils_encryption;
  "utils/flyio/index": typeof utils_flyio_index;
  "utils/flyio/types": typeof utils_flyio_types;
  "utils/helpers": typeof utils_helpers;
  "utils/oauth/github_repo": typeof utils_oauth_github_repo;
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
  workflow: {
    journal: {
      load: FunctionReference<
        "query",
        "internal",
        { workflowId: string },
        {
          inProgress: Array<{
            _creationTime: number;
            _id: string;
            step: {
              args: any;
              argsSize: number;
              completedAt?: number;
              functionType: "query" | "mutation" | "action";
              handle: string;
              inProgress: boolean;
              name: string;
              runResult?:
                | { kind: "success"; returnValue: any }
                | { error: string; kind: "failed" }
                | { kind: "canceled" };
              startedAt: number;
              workId?: string;
            };
            stepNumber: number;
            workflowId: string;
          }>;
          journalEntries: Array<{
            _creationTime: number;
            _id: string;
            step: {
              args: any;
              argsSize: number;
              completedAt?: number;
              functionType: "query" | "mutation" | "action";
              handle: string;
              inProgress: boolean;
              name: string;
              runResult?:
                | { kind: "success"; returnValue: any }
                | { error: string; kind: "failed" }
                | { kind: "canceled" };
              startedAt: number;
              workId?: string;
            };
            stepNumber: number;
            workflowId: string;
          }>;
          logLevel: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
          ok: boolean;
          workflow: {
            _creationTime: number;
            _id: string;
            args: any;
            generationNumber: number;
            logLevel?: any;
            name?: string;
            onComplete?: { context?: any; fnHandle: string };
            runResult?:
              | { kind: "success"; returnValue: any }
              | { error: string; kind: "failed" }
              | { kind: "canceled" };
            startedAt?: any;
            state?: any;
            workflowHandle: string;
          };
        }
      >;
      startStep: FunctionReference<
        "mutation",
        "internal",
        {
          generationNumber: number;
          name: string;
          retry?:
            | boolean
            | { base: number; initialBackoffMs: number; maxAttempts: number };
          schedulerOptions?: { runAt?: number } | { runAfter?: number };
          step: {
            args: any;
            argsSize: number;
            completedAt?: number;
            functionType: "query" | "mutation" | "action";
            handle: string;
            inProgress: boolean;
            name: string;
            runResult?:
              | { kind: "success"; returnValue: any }
              | { error: string; kind: "failed" }
              | { kind: "canceled" };
            startedAt: number;
            workId?: string;
          };
          workflowId: string;
          workpoolOptions?: {
            defaultRetryBehavior?: {
              base: number;
              initialBackoffMs: number;
              maxAttempts: number;
            };
            logLevel?: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
            maxParallelism?: number;
            retryActionsByDefault?: boolean;
          };
        },
        {
          _creationTime: number;
          _id: string;
          step: {
            args: any;
            argsSize: number;
            completedAt?: number;
            functionType: "query" | "mutation" | "action";
            handle: string;
            inProgress: boolean;
            name: string;
            runResult?:
              | { kind: "success"; returnValue: any }
              | { error: string; kind: "failed" }
              | { kind: "canceled" };
            startedAt: number;
            workId?: string;
          };
          stepNumber: number;
          workflowId: string;
        }
      >;
    };
    workflow: {
      cancel: FunctionReference<
        "mutation",
        "internal",
        { workflowId: string },
        null
      >;
      cleanup: FunctionReference<
        "mutation",
        "internal",
        { workflowId: string },
        boolean
      >;
      complete: FunctionReference<
        "mutation",
        "internal",
        {
          generationNumber: number;
          now: number;
          runResult:
            | { kind: "success"; returnValue: any }
            | { error: string; kind: "failed" }
            | { kind: "canceled" };
          workflowId: string;
        },
        null
      >;
      create: FunctionReference<
        "mutation",
        "internal",
        {
          maxParallelism?: number;
          onComplete?: { context?: any; fnHandle: string };
          validateAsync?: boolean;
          workflowArgs: any;
          workflowHandle: string;
          workflowName: string;
        },
        string
      >;
      getStatus: FunctionReference<
        "query",
        "internal",
        { workflowId: string },
        {
          inProgress: Array<{
            _creationTime: number;
            _id: string;
            step: {
              args: any;
              argsSize: number;
              completedAt?: number;
              functionType: "query" | "mutation" | "action";
              handle: string;
              inProgress: boolean;
              name: string;
              runResult?:
                | { kind: "success"; returnValue: any }
                | { error: string; kind: "failed" }
                | { kind: "canceled" };
              startedAt: number;
              workId?: string;
            };
            stepNumber: number;
            workflowId: string;
          }>;
          logLevel: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
          workflow: {
            _creationTime: number;
            _id: string;
            args: any;
            generationNumber: number;
            logLevel?: any;
            name?: string;
            onComplete?: { context?: any; fnHandle: string };
            runResult?:
              | { kind: "success"; returnValue: any }
              | { error: string; kind: "failed" }
              | { kind: "canceled" };
            startedAt?: any;
            state?: any;
            workflowHandle: string;
          };
        }
      >;
    };
  };
  prosemirrorSync: {
    lib: {
      deleteDocument: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        null
      >;
      deleteSnapshots: FunctionReference<
        "mutation",
        "internal",
        { afterVersion?: number; beforeVersion?: number; id: string },
        null
      >;
      deleteSteps: FunctionReference<
        "mutation",
        "internal",
        {
          afterVersion?: number;
          beforeTs: number;
          deleteNewerThanLatestSnapshot?: boolean;
          id: string;
        },
        null
      >;
      getSnapshot: FunctionReference<
        "query",
        "internal",
        { id: string; version?: number },
        { content: null } | { content: string; version: number }
      >;
      getSteps: FunctionReference<
        "query",
        "internal",
        { id: string; version: number },
        {
          clientIds: Array<string | number>;
          steps: Array<string>;
          version: number;
        }
      >;
      latestVersion: FunctionReference<
        "query",
        "internal",
        { id: string },
        null | number
      >;
      submitSnapshot: FunctionReference<
        "mutation",
        "internal",
        {
          content: string;
          id: string;
          pruneSnapshots?: boolean;
          version: number;
        },
        null
      >;
      submitSteps: FunctionReference<
        "mutation",
        "internal",
        {
          clientId: string | number;
          id: string;
          steps: Array<string>;
          version: number;
        },
        | {
            clientIds: Array<string | number>;
            status: "needs-rebase";
            steps: Array<string>;
          }
        | { status: "synced" }
      >;
    };
  };
};
