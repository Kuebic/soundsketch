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
import type * as comments from "../comments.js";
import type * as http from "../http.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_cascade from "../lib/cascade.js";
import type * as lib_r2Client from "../lib/r2Client.js";
import type * as lib_rateLimit from "../lib/rateLimit.js";
import type * as lib_storageKeys from "../lib/storageKeys.js";
import type * as r2 from "../r2.js";
import type * as storage from "../storage.js";
import type * as tracks from "../tracks.js";
import type * as users from "../users.js";
import type * as versions from "../versions.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  comments: typeof comments;
  http: typeof http;
  "lib/access": typeof lib_access;
  "lib/cascade": typeof lib_cascade;
  "lib/r2Client": typeof lib_r2Client;
  "lib/rateLimit": typeof lib_rateLimit;
  "lib/storageKeys": typeof lib_storageKeys;
  r2: typeof r2;
  storage: typeof storage;
  tracks: typeof tracks;
  users: typeof users;
  versions: typeof versions;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
