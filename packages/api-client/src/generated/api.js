"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGetOtpHealthQueryOptions = exports.getGetOtpHealthQueryKey = exports.getOtpHealth = exports.usePostOtpCleanup = exports.getPostOtpCleanupMutationOptions = exports.postOtpCleanup = exports.useDeleteEntitlementsId = exports.getDeleteEntitlementsIdMutationOptions = exports.deleteEntitlementsId = exports.usePutEntitlementsId = exports.getPutEntitlementsIdMutationOptions = exports.putEntitlementsId = exports.useGetEntitlementsId = exports.getGetEntitlementsIdQueryOptions = exports.getGetEntitlementsIdQueryKey = exports.getEntitlementsId = exports.useGetEntitlementsSearch = exports.getGetEntitlementsSearchQueryOptions = exports.getGetEntitlementsSearchQueryKey = exports.getEntitlementsSearch = exports.usePostEntitlementsRevoke = exports.getPostEntitlementsRevokeMutationOptions = exports.postEntitlementsRevoke = exports.usePostEntitlementsRefresh = exports.getPostEntitlementsRefreshMutationOptions = exports.postEntitlementsRefresh = exports.usePostEntitlementsGrant = exports.getPostEntitlementsGrantMutationOptions = exports.postEntitlementsGrant = exports.usePostEntitlements = exports.getPostEntitlementsMutationOptions = exports.postEntitlements = exports.useGetEntitlements = exports.getGetEntitlementsQueryOptions = exports.getGetEntitlementsQueryKey = exports.getEntitlements = exports.usePostApiV1CompaniesCompanyIdBatchesBatchIdAdjust = exports.getPostApiV1CompaniesCompanyIdBatchesBatchIdAdjustMutationOptions = exports.postApiV1CompaniesCompanyIdBatchesBatchIdAdjust = exports.useGetApiV1CompaniesCompanyIdBatchesBatchId = exports.getGetApiV1CompaniesCompanyIdBatchesBatchIdQueryOptions = exports.getGetApiV1CompaniesCompanyIdBatchesBatchIdQueryKey = exports.getApiV1CompaniesCompanyIdBatchesBatchId = exports.usePostApiV1CompaniesCompanyIdBatches = exports.getPostApiV1CompaniesCompanyIdBatchesMutationOptions = exports.postApiV1CompaniesCompanyIdBatches = exports.useGetApiV1CompaniesCompanyIdBatches = exports.getGetApiV1CompaniesCompanyIdBatchesQueryOptions = exports.getGetApiV1CompaniesCompanyIdBatchesQueryKey = exports.getApiV1CompaniesCompanyIdBatches = void 0;
exports.postProrationPoliciesIdDeactivate = exports.usePostProrationPoliciesIdActivate = exports.getPostProrationPoliciesIdActivateMutationOptions = exports.postProrationPoliciesIdActivate = exports.useDeleteProrationPoliciesId = exports.getDeleteProrationPoliciesIdMutationOptions = exports.deleteProrationPoliciesId = exports.usePutProrationPoliciesId = exports.getPutProrationPoliciesIdMutationOptions = exports.putProrationPoliciesId = exports.useGetProrationPoliciesId = exports.getGetProrationPoliciesIdQueryOptions = exports.getGetProrationPoliciesIdQueryKey = exports.getProrationPoliciesId = exports.useGetProrationPoliciesUpgradeTypeUpgradeType = exports.getGetProrationPoliciesUpgradeTypeUpgradeTypeQueryOptions = exports.getGetProrationPoliciesUpgradeTypeUpgradeTypeQueryKey = exports.getProrationPoliciesUpgradeTypeUpgradeType = exports.useGetProrationPoliciesSearch = exports.getGetProrationPoliciesSearchQueryOptions = exports.getGetProrationPoliciesSearchQueryKey = exports.getProrationPoliciesSearch = exports.useGetProrationPoliciesDowngradeTypeDowngradeType = exports.getGetProrationPoliciesDowngradeTypeDowngradeTypeQueryOptions = exports.getGetProrationPoliciesDowngradeTypeDowngradeTypeQueryKey = exports.getProrationPoliciesDowngradeTypeDowngradeType = exports.useGetProrationPoliciesByName = exports.getGetProrationPoliciesByNameQueryOptions = exports.getGetProrationPoliciesByNameQueryKey = exports.getProrationPoliciesByName = exports.useGetProrationPoliciesActive = exports.getGetProrationPoliciesActiveQueryOptions = exports.getGetProrationPoliciesActiveQueryKey = exports.getProrationPoliciesActive = exports.usePostProrationPolicies = exports.getPostProrationPoliciesMutationOptions = exports.postProrationPolicies = exports.useGetProrationPolicies = exports.getGetProrationPoliciesQueryOptions = exports.getGetProrationPoliciesQueryKey = exports.getProrationPolicies = exports.useGetPlanItemsPlanItemIdEntitlements = exports.getGetPlanItemsPlanItemIdEntitlementsQueryOptions = exports.getGetPlanItemsPlanItemIdEntitlementsQueryKey = exports.getPlanItemsPlanItemIdEntitlements = exports.useGetOtpStats = exports.getGetOtpStatsQueryOptions = exports.getGetOtpStatsQueryKey = exports.getOtpStats = exports.useGetOtpHealth = void 0;
exports.useGetSubscriptionsSubscriptionIdEntitlements = exports.getGetSubscriptionsSubscriptionIdEntitlementsQueryOptions = exports.getGetSubscriptionsSubscriptionIdEntitlementsQueryKey = exports.getSubscriptionsSubscriptionIdEntitlements = exports.usePutProrationPoliciesIdUpgradeType = exports.getPutProrationPoliciesIdUpgradeTypeMutationOptions = exports.putProrationPoliciesIdUpgradeType = exports.usePostProrationPoliciesIdRestore = exports.getPostProrationPoliciesIdRestoreMutationOptions = exports.postProrationPoliciesIdRestore = exports.useHeadProrationPoliciesIdExists = exports.getHeadProrationPoliciesIdExistsMutationOptions = exports.headProrationPoliciesIdExists = exports.usePutProrationPoliciesIdDowngradeType = exports.getPutProrationPoliciesIdDowngradeTypeMutationOptions = exports.putProrationPoliciesIdDowngradeType = exports.usePostProrationPoliciesIdDeactivate = exports.getPostProrationPoliciesIdDeactivateMutationOptions = void 0;
/**
 * Generated by orval v6.31.0 🍺
 * Do not edit manually.
 * B2B Suite API
 * Auth Service for B2B Suite – admin, employee, attendance, etc.
 * OpenAPI spec version: 1.0
 */
var react_query_1 = require("@tanstack/react-query");
var axios_instance_1 = require("../axios-instance");
/**
 * @summary List batches with filters
 */
var getApiV1CompaniesCompanyIdBatches = function (companyId, params, signal) {
    return (0, axios_instance_1.customAxiosInstance)({ url: "http://localhost:8080/api/v1/api/v1/companies/".concat(companyId, "/batches"), method: 'GET', params: params, signal: signal
    });
};
exports.getApiV1CompaniesCompanyIdBatches = getApiV1CompaniesCompanyIdBatches;
var getGetApiV1CompaniesCompanyIdBatchesQueryKey = function (companyId, params) {
    return __spreadArray(["http://localhost:8080/api/v1/api/v1/companies/".concat(companyId, "/batches")], (params ? [params] : []), true);
};
exports.getGetApiV1CompaniesCompanyIdBatchesQueryKey = getGetApiV1CompaniesCompanyIdBatchesQueryKey;
var getGetApiV1CompaniesCompanyIdBatchesQueryOptions = function (companyId, params, options) {
    var _a;
    var queryOptions = (options !== null && options !== void 0 ? options : {}).query;
    var queryKey = (_a = queryOptions === null || queryOptions === void 0 ? void 0 : queryOptions.queryKey) !== null && _a !== void 0 ? _a : (0, exports.getGetApiV1CompaniesCompanyIdBatchesQueryKey)(companyId, params);
    var queryFn = function (_a) {
        var signal = _a.signal;
        return (0, exports.getApiV1CompaniesCompanyIdBatches)(companyId, params, signal);
    };
    return __assign({ queryKey: queryKey, queryFn: queryFn, enabled: !!(companyId) }, queryOptions);
};
exports.getGetApiV1CompaniesCompanyIdBatchesQueryOptions = getGetApiV1CompaniesCompanyIdBatchesQueryOptions;
/**
 * @summary List batches with filters
 */
var useGetApiV1CompaniesCompanyIdBatches = function (companyId, params, options) {
    var queryOptions = (0, exports.getGetApiV1CompaniesCompanyIdBatchesQueryOptions)(companyId, params, options);
    var query = (0, react_query_1.useQuery)(queryOptions);
    query.queryKey = queryOptions.queryKey;
    return query;
};
exports.useGetApiV1CompaniesCompanyIdBatches = useGetApiV1CompaniesCompanyIdBatches;
/**
 * @summary Create a new batch
 */
var postApiV1CompaniesCompanyIdBatches = function (companyId, handlerCreateBatchRequest) {
    return (0, axios_instance_1.customAxiosInstance)({ url: "http://localhost:8080/api/v1/api/v1/companies/".concat(companyId, "/batches"), method: 'POST',
        headers: { 'Content-Type': 'application/json', },
        data: handlerCreateBatchRequest });
};
exports.postApiV1CompaniesCompanyIdBatches = postApiV1CompaniesCompanyIdBatches;
var getPostApiV1CompaniesCompanyIdBatchesMutationOptions = function (options) {
    var mutationOptions = (options !== null && options !== void 0 ? options : {}).mutation;
    var mutationFn = function (props) {
        var _a = props !== null && props !== void 0 ? props : {}, companyId = _a.companyId, data = _a.data;
        return (0, exports.postApiV1CompaniesCompanyIdBatches)(companyId, data);
    };
    return __assign({ mutationFn: mutationFn }, mutationOptions);
};
exports.getPostApiV1CompaniesCompanyIdBatchesMutationOptions = getPostApiV1CompaniesCompanyIdBatchesMutationOptions;
/**
* @summary Create a new batch
*/
var usePostApiV1CompaniesCompanyIdBatches = function (options) {
    var mutationOptions = (0, exports.getPostApiV1CompaniesCompanyIdBatchesMutationOptions)(options);
    return (0, react_query_1.useMutation)(mutationOptions);
};
exports.usePostApiV1CompaniesCompanyIdBatches = usePostApiV1CompaniesCompanyIdBatches;
/**
 * @summary Get batch by ID
 */
var getApiV1CompaniesCompanyIdBatchesBatchId = function (companyId, batchId, signal) {
    return (0, axios_instance_1.customAxiosInstance)({ url: "http://localhost:8080/api/v1/api/v1/companies/".concat(companyId, "/batches/").concat(batchId), method: 'GET', signal: signal
    });
};
exports.getApiV1CompaniesCompanyIdBatchesBatchId = getApiV1CompaniesCompanyIdBatchesBatchId;
var getGetApiV1CompaniesCompanyIdBatchesBatchIdQueryKey = function (companyId, batchId) {
    return ["http://localhost:8080/api/v1/api/v1/companies/".concat(companyId, "/batches/").concat(batchId)];
};
exports.getGetApiV1CompaniesCompanyIdBatchesBatchIdQueryKey = getGetApiV1CompaniesCompanyIdBatchesBatchIdQueryKey;
var getGetApiV1CompaniesCompanyIdBatchesBatchIdQueryOptions = function (companyId, batchId, options) {
    var _a;
    var queryOptions = (options !== null && options !== void 0 ? options : {}).query;
    var queryKey = (_a = queryOptions === null || queryOptions === void 0 ? void 0 : queryOptions.queryKey) !== null && _a !== void 0 ? _a : (0, exports.getGetApiV1CompaniesCompanyIdBatchesBatchIdQueryKey)(companyId, batchId);
    var queryFn = function (_a) {
        var signal = _a.signal;
        return (0, exports.getApiV1CompaniesCompanyIdBatchesBatchId)(companyId, batchId, signal);
    };
    return __assign({ queryKey: queryKey, queryFn: queryFn, enabled: !!(companyId && batchId) }, queryOptions);
};
exports.getGetApiV1CompaniesCompanyIdBatchesBatchIdQueryOptions = getGetApiV1CompaniesCompanyIdBatchesBatchIdQueryOptions;
/**
 * @summary Get batch by ID
 */
var useGetApiV1CompaniesCompanyIdBatchesBatchId = function (companyId, batchId, options) {
    var queryOptions = (0, exports.getGetApiV1CompaniesCompanyIdBatchesBatchIdQueryOptions)(companyId, batchId, options);
    var query = (0, react_query_1.useQuery)(queryOptions);
    query.queryKey = queryOptions.queryKey;
    return query;
};
exports.useGetApiV1CompaniesCompanyIdBatchesBatchId = useGetApiV1CompaniesCompanyIdBatchesBatchId;
/**
 * @summary Adjust batch quantity (increase/decrease)
 */
var postApiV1CompaniesCompanyIdBatchesBatchIdAdjust = function (companyId, batchId, handlerAdjustBatchRequest) {
    return (0, axios_instance_1.customAxiosInstance)({ url: "http://localhost:8080/api/v1/api/v1/companies/".concat(companyId, "/batches/").concat(batchId, "/adjust"), method: 'POST',
        headers: { 'Content-Type': 'application/json', },
        data: handlerAdjustBatchRequest });
};
exports.postApiV1CompaniesCompanyIdBatchesBatchIdAdjust = postApiV1CompaniesCompanyIdBatchesBatchIdAdjust;
var getPostApiV1CompaniesCompanyIdBatchesBatchIdAdjustMutationOptions = function (options) {
    var mutationOptions = (options !== null && options !== void 0 ? options : {}).mutation;
    var mutationFn = function (props) {
        var _a = props !== null && props !== void 0 ? props : {}, companyId = _a.companyId, batchId = _a.batchId, data = _a.data;
        return (0, exports.postApiV1CompaniesCompanyIdBatchesBatchIdAdjust)(companyId, batchId, data);
    };
    return __assign({ mutationFn: mutationFn }, mutationOptions);
};
exports.getPostApiV1CompaniesCompanyIdBatchesBatchIdAdjustMutationOptions = getPostApiV1CompaniesCompanyIdBatchesBatchIdAdjustMutationOptions;
/**
* @summary Adjust batch quantity (increase/decrease)
*/
var usePostApiV1CompaniesCompanyIdBatchesBatchIdAdjust = function (options) {
    var mutationOptions = (0, exports.getPostApiV1CompaniesCompanyIdBatchesBatchIdAdjustMutationOptions)(options);
    return (0, react_query_1.useMutation)(mutationOptions);
};
exports.usePostApiV1CompaniesCompanyIdBatchesBatchIdAdjust = usePostApiV1CompaniesCompanyIdBatchesBatchIdAdjust;
/**
 * @summary List entitlements with filters and pagination
 */
var getEntitlements = function (params, signal) {
    return (0, axios_instance_1.customAxiosInstance)({ url: "http://localhost:8080/api/v1/entitlements", method: 'GET', params: params, signal: signal
    });
};
exports.getEntitlements = getEntitlements;
var getGetEntitlementsQueryKey = function (params) {
    return __spreadArray(["http://localhost:8080/api/v1/entitlements"], (params ? [params] : []), true);
};
exports.getGetEntitlementsQueryKey = getGetEntitlementsQueryKey;
var getGetEntitlementsQueryOptions = function (params, options) {
    var _a;
    var queryOptions = (options !== null && options !== void 0 ? options : {}).query;
    var queryKey = (_a = queryOptions === null || queryOptions === void 0 ? void 0 : queryOptions.queryKey) !== null && _a !== void 0 ? _a : (0, exports.getGetEntitlementsQueryKey)(params);
    var queryFn = function (_a) {
        var signal = _a.signal;
        return (0, exports.getEntitlements)(params, signal);
    };
    return __assign({ queryKey: queryKey, queryFn: queryFn }, queryOptions);
};
exports.getGetEntitlementsQueryOptions = getGetEntitlementsQueryOptions;
/**
 * @summary List entitlements with filters and pagination
 */
var useGetEntitlements = function (params, options) {
    var queryOptions = (0, exports.getGetEntitlementsQueryOptions)(params, options);
    var query = (0, react_query_1.useQuery)(queryOptions);
    query.queryKey = queryOptions.queryKey;
    return query;
};
exports.useGetEntitlements = useGetEntitlements;
/**
 * @summary Create a new entitlement
 */
var postEntitlements = function (handlerCreateEntitlementRequest) {
    return (0, axios_instance_1.customAxiosInstance)({ url: "http://localhost:8080/api/v1/entitlements", method: 'POST',
        headers: { 'Content-Type': 'application/json', },
        data: handlerCreateEntitlementRequest });
};
exports.postEntitlements = postEntitlements;
var getPostEntitlementsMutationOptions = function (options) {
    var mutationOptions = (options !== null && options !== void 0 ? options : {}).mutation;
    var mutationFn = function (props) {
        var data = (props !== null && props !== void 0 ? props : {}).data;
        return (0, exports.postEntitlements)(data);
    };
    return __assign({ mutationFn: mutationFn }, mutationOptions);
};
exports.getPostEntitlementsMutationOptions = getPostEntitlementsMutationOptions;
/**
* @summary Create a new entitlement
*/
var usePostEntitlements = function (options) {
    var mutationOptions = (0, exports.getPostEntitlementsMutationOptions)(options);
    return (0, react_query_1.useMutation)(mutationOptions);
};
exports.usePostEntitlements = usePostEntitlements;
/**
 * @summary Grant all entitlements of a plan to a subscription
 */
var postEntitlementsGrant = function (handlerGrantRequestBody) {
    return (0, axios_instance_1.customAxiosInstance)({ url: "http://localhost:8080/api/v1/entitlements/grant", method: 'POST',
        headers: { 'Content-Type': 'application/json', },
        data: handlerGrantRequestBody });
};
exports.postEntitlementsGrant = postEntitlementsGrant;
var getPostEntitlementsGrantMutationOptions = function (options) {
    var mutationOptions = (options !== null && options !== void 0 ? options : {}).mutation;
    var mutationFn = function (props) {
        var data = (props !== null && props !== void 0 ? props : {}).data;
        return (0, exports.postEntitlementsGrant)(data);
    };
    return __assign({ mutationFn: mutationFn }, mutationOptions);
};
exports.getPostEntitlementsGrantMutationOptions = getPostEntitlementsGrantMutationOptions;
/**
* @summary Grant all entitlements of a plan to a subscription
*/
var usePostEntitlementsGrant = function (options) {
    var mutationOptions = (0, exports.getPostEntitlementsGrantMutationOptions)(options);
    return (0, react_query_1.useMutation)(mutationOptions);
};
exports.usePostEntitlementsGrant = usePostEntitlementsGrant;
/**
 * @summary Refresh entitlements for a subscription (revoke + grant)
 */
var postEntitlementsRefresh = function (handlerGrantRequestBody) {
    return (0, axios_instance_1.customAxiosInstance)({ url: "http://localhost:8080/api/v1/entitlements/refresh", method: 'POST',
        headers: { 'Content-Type': 'application/json', },
        data: handlerGrantRequestBody });
};
exports.postEntitlementsRefresh = postEntitlementsRefresh;
var getPostEntitlementsRefreshMutationOptions = function (options) {
    var mutationOptions = (options !== null && options !== void 0 ? options : {}).mutation;
    var mutationFn = function (props) {
        var data = (props !== null && props !== void 0 ? props : {}).data;
        return (0, exports.postEntitlementsRefresh)(data);
    };
    return __assign({ mutationFn: mutationFn }, mutationOptions);
};
exports.getPostEntitlementsRefreshMutationOptions = getPostEntitlementsRefreshMutationOptions;
/**
* @summary Refresh entitlements for a subscription (revoke + grant)
*/
var usePostEntitlementsRefresh = function (options) {
    var mutationOptions = (0, exports.getPostEntitlementsRefreshMutationOptions)(options);
    return (0, react_query_1.useMutation)(mutationOptions);
};
exports.usePostEntitlementsRefresh = usePostEntitlementsRefresh;
/**
 * @summary Revoke all entitlements from a subscription
 */
var postEntitlementsRevoke = function (handlerGrantRequestBody) {
    return (0, axios_instance_1.customAxiosInstance)({ url: "http://localhost:8080/api/v1/entitlements/revoke", method: 'POST',
        headers: { 'Content-Type': 'application/json', },
        data: handlerGrantRequestBody });
};
exports.postEntitlementsRevoke = postEntitlementsRevoke;
var getPostEntitlementsRevokeMutationOptions = function (options) {
    var mutationOptions = (options !== null && options !== void 0 ? options : {}).mutation;
    var mutationFn = function (props) {
        var data = (props !== null && props !== void 0 ? props : {}).data;
        return (0, exports.postEntitlementsRevoke)(data);
    };
    return __assign({ mutationFn: mutationFn }, mutationOptions);
};
exports.getPostEntitlementsRevokeMutationOptions = getPostEntitlementsRevokeMutationOptions;
/**
* @summary Revoke all entitlements from a subscription
*/
var usePostEntitlementsRevoke = function (options) {
    var mutationOptions = (0, exports.getPostEntitlementsRevokeMutationOptions)(options);
    return (0, react_query_1.useMutation)(mutationOptions);
};
exports.usePostEntitlementsRevoke = usePostEntitlementsRevoke;
/**
 * @summary Search entitlements by query string
 */
var getEntitlementsSearch = function (params, signal) {
    return (0, axios_instance_1.customAxiosInstance)({ url: "http://localhost:8080/api/v1/entitlements/search", method: 'GET', params: params, signal: signal
    });
};
exports.getEntitlementsSearch = getEntitlementsSearch;
var getGetEntitlementsSearchQueryKey = function (params) {
    return __spreadArray(["http://localhost:8080/api/v1/entitlements/search"], (params ? [params] : []), true);
};
exports.getGetEntitlementsSearchQueryKey = getGetEntitlementsSearchQueryKey;
var getGetEntitlementsSearchQueryOptions = function (params, options) {
    var _a;
    var queryOptions = (options !== null && options !== void 0 ? options : {}).query;
    var queryKey = (_a = queryOptions === null || queryOptions === void 0 ? void 0 : queryOptions.queryKey) !== null && _a !== void 0 ? _a : (0, exports.getGetEntitlementsSearchQueryKey)(params);
    var queryFn = function (_a) {
        var signal = _a.signal;
        return (0, exports.getEntitlementsSearch)(params, signal);
    };
    return __assign({ queryKey: queryKey, queryFn: queryFn }, queryOptions);
};
exports.getGetEntitlementsSearchQueryOptions = getGetEntitlementsSearchQueryOptions;
/**
 * @summary Search entitlements by query string
 */
var useGetEntitlementsSearch = function (params, options) {
    var queryOptions = (0, exports.getGetEntitlementsSearchQueryOptions)(params, options);
    var query = (0, react_query_1.useQuery)(queryOptions);
    query.queryKey = queryOptions.queryKey;
    return query;
};
exports.useGetEntitlementsSearch = useGetEntitlementsSearch;
/**
 * @summary Get entitlement by ID
 */
var getEntitlementsId = function (id, signal) {
    return (0, axios_instance_1.customAxiosInstance)({ url: "http://localhost:8080/api/v1/entitlements/".concat(id), method: 'GET', signal: signal
    });
};
exports.getEntitlementsId = getEntitlementsId;
var getGetEntitlementsIdQueryKey = function (id) {
    return ["http://localhost:8080/api/v1/entitlements/".concat(id)];
};
exports.getGetEntitlementsIdQueryKey = getGetEntitlementsIdQueryKey;
var getGetEntitlementsIdQueryOptions = function (id, options) {
    var _a;
    var queryOptions = (options !== null && options !== void 0 ? options : {}).query;
    var queryKey = (_a = queryOptions === null || queryOptions === void 0 ? void 0 : queryOptions.queryKey) !== null && _a !== void 0 ? _a : (0, exports.getGetEntitlementsIdQueryKey)(id);
    var queryFn = function (_a) {
        var signal = _a.signal;
        return (0, exports.getEntitlementsId)(id, signal);
    };
    return __assign({ queryKey: queryKey, queryFn: queryFn, enabled: !!(id) }, queryOptions);
};
exports.getGetEntitlementsIdQueryOptions = getGetEntitlementsIdQueryOptions;
/**
 * @summary Get entitlement by ID
 */
var useGetEntitlementsId = function (id, options) {
    var queryOptions = (0, exports.getGetEntitlementsIdQueryOptions)(id, options);
    var query = (0, react_query_1.useQuery)(queryOptions);
    query.queryKey = queryOptions.queryKey;
    return query;
};
exports.useGetEntitlementsId = useGetEntitlementsId;
/**
 * @summary Update an existing entitlement
 */
var putEntitlementsId = function (id, handlerUpdateEntitlementRequest) {
    return (0, axios_instance_1.customAxiosInstance)({ url: "http://localhost:8080/api/v1/entitlements/".concat(id), method: 'PUT',
        headers: { 'Content-Type': 'application/json', },
        data: handlerUpdateEntitlementRequest });
};
exports.putEntitlementsId = putEntitlementsId;
var getPutEntitlementsIdMutationOptions = function (options) {
    var mutationOptions = (options !== null && options !== void 0 ? options : {}).mutation;
    var mutationFn = function (props) {
        var _a = props !== null && props !== void 0 ? props : {}, id = _a.id, data = _a.data;
        return (0, exports.putEntitlementsId)(id, data);
    };
    return __assign({ mutationFn: mutationFn }, mutationOptions);
};
exports.getPutEntitlementsIdMutationOptions = getPutEntitlementsIdMutationOptions;
/**
* @summary Update an existing entitlement
*/
var usePutEntitlementsId = function (options) {
    var mutationOptions = (0, exports.getPutEntitlementsIdMutationOptions)(options);
    return (0, react_query_1.useMutation)(mutationOptions);
};
exports.usePutEntitlementsId = usePutEntitlementsId;
/**
 * @summary Delete an entitlement
 */
var deleteEntitlementsId = function (id) {
    return (0, axios_instance_1.customAxiosInstance)({ url: "http://localhost:8080/api/v1/entitlements/".concat(id), method: 'DELETE' });
};
exports.deleteEntitlementsId = deleteEntitlementsId;
var getDeleteEntitlementsIdMutationOptions = function (options) {
    var mutationOptions = (options !== null && options !== void 0 ? options : {}).mutation;
    var mutationFn = function (props) {
        var id = (props !== null && props !== void 0 ? props : {}).id;
        return (0, exports.deleteEntitlementsId)(id);
    };
    return __assign({ mutationFn: mutationFn }, mutationOptions);
};
exports.getDeleteEntitlementsIdMutationOptions = getDeleteEntitlementsIdMutationOptions;
/**
* @summary Delete an entitlement
*/
var useDeleteEntitlementsId = function (options) {
    var mutationOptions = (0, exports.getDeleteEntitlementsIdMutationOptions)(options);
    return (0, react_query_1.useMutation)(mutationOptions);
};
exports.useDeleteEntitlementsId = useDeleteEntitlementsId;
/**
 * Manually cleanup expired OTPs
 * @summary Cleanup Expired OTPs
 */
var postOtpCleanup = function () {
    return (0, axios_instance_1.customAxiosInstance)({ url: "http://localhost:8080/api/v1/otp/cleanup", method: 'POST' });
};
exports.postOtpCleanup = postOtpCleanup;
var getPostOtpCleanupMutationOptions = function (options) {
    var mutationOptions = (options !== null && options !== void 0 ? options : {}).mutation;
    var mutationFn = function () {
        return (0, exports.postOtpCleanup)();
    };
    return __assign({ mutationFn: mutationFn }, mutationOptions);
};
exports.getPostOtpCleanupMutationOptions = getPostOtpCleanupMutationOptions;
/**
* @summary Cleanup Expired OTPs
*/
var usePostOtpCleanup = function (options) {
    var mutationOptions = (0, exports.getPostOtpCleanupMutationOptions)(options);
    return (0, react_query_1.useMutation)(mutationOptions);
};
exports.usePostOtpCleanup = usePostOtpCleanup;
/**
 * Check OTP service health
 * @summary OTP Health Check
 */
var getOtpHealth = function (signal) {
    return (0, axios_instance_1.customAxiosInstance)({ url: "http://localhost:8080/api/v1/otp/health", method: 'GET', signal: signal
    });
};
exports.getOtpHealth = getOtpHealth;
var getGetOtpHealthQueryKey = function () {
    return ["http://localhost:8080/api/v1/otp/health"];
};
exports.getGetOtpHealthQueryKey = getGetOtpHealthQueryKey;
var getGetOtpHealthQueryOptions = function (options) {
    var _a;
    var queryOptions = (options !== null && options !== void 0 ? options : {}).query;
    var queryKey = (_a = queryOptions === null || queryOptions === void 0 ? void 0 : queryOptions.queryKey) !== null && _a !== void 0 ? _a : (0, exports.getGetOtpHealthQueryKey)();
    var queryFn = function (_a) {
        var signal = _a.signal;
        return (0, exports.getOtpHealth)(signal);
    };
    return __assign({ queryKey: queryKey, queryFn: queryFn }, queryOptions);
};
exports.getGetOtpHealthQueryOptions = getGetOtpHealthQueryOptions;
/**
 * @summary OTP Health Check
 */
var useGetOtpHealth = function (options) {
    var queryOptions = (0, exports.getGetOtpHealthQueryOptions)(options);
    var query = (0, react_query_1.useQuery)(queryOptions);
    query.queryKey = queryOptions.queryKey;
    return query;
};
exports.useGetOtpHealth = useGetOtpHealth;
/**
 * Get OTP service statistics
 * @summary Get OTP Statistics
 */
var getOtpStats = function (signal) {
    return (0, axios_instance_1.customAxiosInstance)({ url: "http://localhost:8080/api/v1/otp/stats", method: 'GET', signal: signal
    });
};
exports.getOtpStats = getOtpStats;
var getGetOtpStatsQueryKey = function () {
    return ["http://localhost:8080/api/v1/otp/stats"];
};
exports.getGetOtpStatsQueryKey = getGetOtpStatsQueryKey;
var getGetOtpStatsQueryOptions = function (options) {
    var _a;
    var queryOptions = (options !== null && options !== void 0 ? options : {}).query;
    var queryKey = (_a = queryOptions === null || queryOptions === void 0 ? void 0 : queryOptions.queryKey) !== null && _a !== void 0 ? _a : (0, exports.getGetOtpStatsQueryKey)();
    var queryFn = function (_a) {
        var signal = _a.signal;
        return (0, exports.getOtpStats)(signal);
    };
    return __assign({ queryKey: queryKey, queryFn: queryFn }, queryOptions);
};
exports.getGetOtpStatsQueryOptions = getGetOtpStatsQueryOptions;
/**
 * @summary Get OTP Statistics
 */
var useGetOtpStats = function (options) {
    var queryOptions = (0, exports.getGetOtpStatsQueryOptions)(options);
    var query = (0, react_query_1.useQuery)(queryOptions);
    query.queryKey = queryOptions.queryKey;
    return query;
};
exports.useGetOtpStats = useGetOtpStats;
/**
 * @summary Get all entitlements for a plan item
 */
var getPlanItemsPlanItemIdEntitlements = function (planItemId, signal) {
    return (0, axios_instance_1.customAxiosInstance)({ url: "http://localhost:8080/api/v1/plan-items/".concat(planItemId, "/entitlements"), method: 'GET', signal: signal
    });
};
exports.getPlanItemsPlanItemIdEntitlements = getPlanItemsPlanItemIdEntitlements;
var getGetPlanItemsPlanItemIdEntitlementsQueryKey = function (planItemId) {
    return ["http://localhost:8080/api/v1/plan-items/".concat(planItemId, "/entitlements")];
};
exports.getGetPlanItemsPlanItemIdEntitlementsQueryKey = getGetPlanItemsPlanItemIdEntitlementsQueryKey;
var getGetPlanItemsPlanItemIdEntitlementsQueryOptions = function (planItemId, options) {
    var _a;
    var queryOptions = (options !== null && options !== void 0 ? options : {}).query;
    var queryKey = (_a = queryOptions === null || queryOptions === void 0 ? void 0 : queryOptions.queryKey) !== null && _a !== void 0 ? _a : (0, exports.getGetPlanItemsPlanItemIdEntitlementsQueryKey)(planItemId);
    var queryFn = function (_a) {
        var signal = _a.signal;
        return (0, exports.getPlanItemsPlanItemIdEntitlements)(planItemId, signal);
    };
    return __assign({ queryKey: queryKey, queryFn: queryFn, enabled: !!(planItemId) }, queryOptions);
};
exports.getGetPlanItemsPlanItemIdEntitlementsQueryOptions = getGetPlanItemsPlanItemIdEntitlementsQueryOptions;
/**
 * @summary Get all entitlements for a plan item
 */
var useGetPlanItemsPlanItemIdEntitlements = function (planItemId, options) {
    var queryOptions = (0, exports.getGetPlanItemsPlanItemIdEntitlementsQueryOptions)(planItemId, options);
    var query = (0, react_query_1.useQuery)(queryOptions);
    query.queryKey = queryOptions.queryKey;
    return query;
};
exports.useGetPlanItemsPlanItemIdEntitlements = useGetPlanItemsPlanItemIdEntitlements;
/**
 * @summary List proration policies with filters
 */
var getProrationPolicies = function (params, signal) {
    return (0, axios_instance_1.customAxiosInstance)({ url: "http://localhost:8080/api/v1/proration-policies", method: 'GET', params: params, signal: signal
    });
};
exports.getProrationPolicies = getProrationPolicies;
var getGetProrationPoliciesQueryKey = function (params) {
    return __spreadArray(["http://localhost:8080/api/v1/proration-policies"], (params ? [params] : []), true);
};
exports.getGetProrationPoliciesQueryKey = getGetProrationPoliciesQueryKey;
var getGetProrationPoliciesQueryOptions = function (params, options) {
    var _a;
    var queryOptions = (options !== null && options !== void 0 ? options : {}).query;
    var queryKey = (_a = queryOptions === null || queryOptions === void 0 ? void 0 : queryOptions.queryKey) !== null && _a !== void 0 ? _a : (0, exports.getGetProrationPoliciesQueryKey)(params);
    var queryFn = function (_a) {
        var signal = _a.signal;
        return (0, exports.getProrationPolicies)(params, signal);
    };
    return __assign({ queryKey: queryKey, queryFn: queryFn }, queryOptions);
};
exports.getGetProrationPoliciesQueryOptions = getGetProrationPoliciesQueryOptions;
/**
 * @summary List proration policies with filters
 */
var useGetProrationPolicies = function (params, options) {
    var queryOptions = (0, exports.getGetProrationPoliciesQueryOptions)(params, options);
    var query = (0, react_query_1.useQuery)(queryOptions);
    query.queryKey = queryOptions.queryKey;
    return query;
};
exports.useGetProrationPolicies = useGetProrationPolicies;
/**
 * @summary Create a new proration policy
 */
var postProrationPolicies = function (handlerCreateProrationPolicyRequest) {
    return (0, axios_instance_1.customAxiosInstance)({ url: "http://localhost:8080/api/v1/proration-policies", method: 'POST',
        headers: { 'Content-Type': 'application/json', },
        data: handlerCreateProrationPolicyRequest });
};
exports.postProrationPolicies = postProrationPolicies;
var getPostProrationPoliciesMutationOptions = function (options) {
    var mutationOptions = (options !== null && options !== void 0 ? options : {}).mutation;
    var mutationFn = function (props) {
        var data = (props !== null && props !== void 0 ? props : {}).data;
        return (0, exports.postProrationPolicies)(data);
    };
    return __assign({ mutationFn: mutationFn }, mutationOptions);
};
exports.getPostProrationPoliciesMutationOptions = getPostProrationPoliciesMutationOptions;
/**
* @summary Create a new proration policy
*/
var usePostProrationPolicies = function (options) {
    var mutationOptions = (0, exports.getPostProrationPoliciesMutationOptions)(options);
    return (0, react_query_1.useMutation)(mutationOptions);
};
exports.usePostProrationPolicies = usePostProrationPolicies;
/**
 * @summary Get all active proration policies
 */
var getProrationPoliciesActive = function (signal) {
    return (0, axios_instance_1.customAxiosInstance)({ url: "http://localhost:8080/api/v1/proration-policies/active", method: 'GET', signal: signal
    });
};
exports.getProrationPoliciesActive = getProrationPoliciesActive;
var getGetProrationPoliciesActiveQueryKey = function () {
    return ["http://localhost:8080/api/v1/proration-policies/active"];
};
exports.getGetProrationPoliciesActiveQueryKey = getGetProrationPoliciesActiveQueryKey;
var getGetProrationPoliciesActiveQueryOptions = function (options) {
    var _a;
    var queryOptions = (options !== null && options !== void 0 ? options : {}).query;
    var queryKey = (_a = queryOptions === null || queryOptions === void 0 ? void 0 : queryOptions.queryKey) !== null && _a !== void 0 ? _a : (0, exports.getGetProrationPoliciesActiveQueryKey)();
    var queryFn = function (_a) {
        var signal = _a.signal;
        return (0, exports.getProrationPoliciesActive)(signal);
    };
    return __assign({ queryKey: queryKey, queryFn: queryFn }, queryOptions);
};
exports.getGetProrationPoliciesActiveQueryOptions = getGetProrationPoliciesActiveQueryOptions;
/**
 * @summary Get all active proration policies
 */
var useGetProrationPoliciesActive = function (options) {
    var queryOptions = (0, exports.getGetProrationPoliciesActiveQueryOptions)(options);
    var query = (0, react_query_1.useQuery)(queryOptions);
    query.queryKey = queryOptions.queryKey;
    return query;
};
exports.useGetProrationPoliciesActive = useGetProrationPoliciesActive;
/**
 * @summary Get proration policy by name
 */
var getProrationPoliciesByName = function (params, signal) {
    return (0, axios_instance_1.customAxiosInstance)({ url: "http://localhost:8080/api/v1/proration-policies/by-name", method: 'GET', params: params, signal: signal
    });
};
exports.getProrationPoliciesByName = getProrationPoliciesByName;
var getGetProrationPoliciesByNameQueryKey = function (params) {
    return __spreadArray(["http://localhost:8080/api/v1/proration-policies/by-name"], (params ? [params] : []), true);
};
exports.getGetProrationPoliciesByNameQueryKey = getGetProrationPoliciesByNameQueryKey;
var getGetProrationPoliciesByNameQueryOptions = function (params, options) {
    var _a;
    var queryOptions = (options !== null && options !== void 0 ? options : {}).query;
    var queryKey = (_a = queryOptions === null || queryOptions === void 0 ? void 0 : queryOptions.queryKey) !== null && _a !== void 0 ? _a : (0, exports.getGetProrationPoliciesByNameQueryKey)(params);
    var queryFn = function (_a) {
        var signal = _a.signal;
        return (0, exports.getProrationPoliciesByName)(params, signal);
    };
    return __assign({ queryKey: queryKey, queryFn: queryFn }, queryOptions);
};
exports.getGetProrationPoliciesByNameQueryOptions = getGetProrationPoliciesByNameQueryOptions;
/**
 * @summary Get proration policy by name
 */
var useGetProrationPoliciesByName = function (params, options) {
    var queryOptions = (0, exports.getGetProrationPoliciesByNameQueryOptions)(params, options);
    var query = (0, react_query_1.useQuery)(queryOptions);
    query.queryKey = queryOptions.queryKey;
    return query;
};
exports.useGetProrationPoliciesByName = useGetProrationPoliciesByName;
/**
 * @summary Get proration policies by downgrade type
 */
var getProrationPoliciesDowngradeTypeDowngradeType = function (downgradeType, signal) {
    return (0, axios_instance_1.customAxiosInstance)({ url: "http://localhost:8080/api/v1/proration-policies/downgrade-type/".concat(downgradeType), method: 'GET', signal: signal
    });
};
exports.getProrationPoliciesDowngradeTypeDowngradeType = getProrationPoliciesDowngradeTypeDowngradeType;
var getGetProrationPoliciesDowngradeTypeDowngradeTypeQueryKey = function (downgradeType) {
    return ["http://localhost:8080/api/v1/proration-policies/downgrade-type/".concat(downgradeType)];
};
exports.getGetProrationPoliciesDowngradeTypeDowngradeTypeQueryKey = getGetProrationPoliciesDowngradeTypeDowngradeTypeQueryKey;
var getGetProrationPoliciesDowngradeTypeDowngradeTypeQueryOptions = function (downgradeType, options) {
    var _a;
    var queryOptions = (options !== null && options !== void 0 ? options : {}).query;
    var queryKey = (_a = queryOptions === null || queryOptions === void 0 ? void 0 : queryOptions.queryKey) !== null && _a !== void 0 ? _a : (0, exports.getGetProrationPoliciesDowngradeTypeDowngradeTypeQueryKey)(downgradeType);
    var queryFn = function (_a) {
        var signal = _a.signal;
        return (0, exports.getProrationPoliciesDowngradeTypeDowngradeType)(downgradeType, signal);
    };
    return __assign({ queryKey: queryKey, queryFn: queryFn, enabled: !!(downgradeType) }, queryOptions);
};
exports.getGetProrationPoliciesDowngradeTypeDowngradeTypeQueryOptions = getGetProrationPoliciesDowngradeTypeDowngradeTypeQueryOptions;
/**
 * @summary Get proration policies by downgrade type
 */
var useGetProrationPoliciesDowngradeTypeDowngradeType = function (downgradeType, options) {
    var queryOptions = (0, exports.getGetProrationPoliciesDowngradeTypeDowngradeTypeQueryOptions)(downgradeType, options);
    var query = (0, react_query_1.useQuery)(queryOptions);
    query.queryKey = queryOptions.queryKey;
    return query;
};
exports.useGetProrationPoliciesDowngradeTypeDowngradeType = useGetProrationPoliciesDowngradeTypeDowngradeType;
/**
 * @summary Search proration policies by query
 */
var getProrationPoliciesSearch = function (params, signal) {
    return (0, axios_instance_1.customAxiosInstance)({ url: "http://localhost:8080/api/v1/proration-policies/search", method: 'GET', params: params, signal: signal
    });
};
exports.getProrationPoliciesSearch = getProrationPoliciesSearch;
var getGetProrationPoliciesSearchQueryKey = function (params) {
    return __spreadArray(["http://localhost:8080/api/v1/proration-policies/search"], (params ? [params] : []), true);
};
exports.getGetProrationPoliciesSearchQueryKey = getGetProrationPoliciesSearchQueryKey;
var getGetProrationPoliciesSearchQueryOptions = function (params, options) {
    var _a;
    var queryOptions = (options !== null && options !== void 0 ? options : {}).query;
    var queryKey = (_a = queryOptions === null || queryOptions === void 0 ? void 0 : queryOptions.queryKey) !== null && _a !== void 0 ? _a : (0, exports.getGetProrationPoliciesSearchQueryKey)(params);
    var queryFn = function (_a) {
        var signal = _a.signal;
        return (0, exports.getProrationPoliciesSearch)(params, signal);
    };
    return __assign({ queryKey: queryKey, queryFn: queryFn }, queryOptions);
};
exports.getGetProrationPoliciesSearchQueryOptions = getGetProrationPoliciesSearchQueryOptions;
/**
 * @summary Search proration policies by query
 */
var useGetProrationPoliciesSearch = function (params, options) {
    var queryOptions = (0, exports.getGetProrationPoliciesSearchQueryOptions)(params, options);
    var query = (0, react_query_1.useQuery)(queryOptions);
    query.queryKey = queryOptions.queryKey;
    return query;
};
exports.useGetProrationPoliciesSearch = useGetProrationPoliciesSearch;
/**
 * @summary Get proration policies by upgrade type
 */
var getProrationPoliciesUpgradeTypeUpgradeType = function (upgradeType, signal) {
    return (0, axios_instance_1.customAxiosInstance)({ url: "http://localhost:8080/api/v1/proration-policies/upgrade-type/".concat(upgradeType), method: 'GET', signal: signal
    });
};
exports.getProrationPoliciesUpgradeTypeUpgradeType = getProrationPoliciesUpgradeTypeUpgradeType;
var getGetProrationPoliciesUpgradeTypeUpgradeTypeQueryKey = function (upgradeType) {
    return ["http://localhost:8080/api/v1/proration-policies/upgrade-type/".concat(upgradeType)];
};
exports.getGetProrationPoliciesUpgradeTypeUpgradeTypeQueryKey = getGetProrationPoliciesUpgradeTypeUpgradeTypeQueryKey;
var getGetProrationPoliciesUpgradeTypeUpgradeTypeQueryOptions = function (upgradeType, options) {
    var _a;
    var queryOptions = (options !== null && options !== void 0 ? options : {}).query;
    var queryKey = (_a = queryOptions === null || queryOptions === void 0 ? void 0 : queryOptions.queryKey) !== null && _a !== void 0 ? _a : (0, exports.getGetProrationPoliciesUpgradeTypeUpgradeTypeQueryKey)(upgradeType);
    var queryFn = function (_a) {
        var signal = _a.signal;
        return (0, exports.getProrationPoliciesUpgradeTypeUpgradeType)(upgradeType, signal);
    };
    return __assign({ queryKey: queryKey, queryFn: queryFn, enabled: !!(upgradeType) }, queryOptions);
};
exports.getGetProrationPoliciesUpgradeTypeUpgradeTypeQueryOptions = getGetProrationPoliciesUpgradeTypeUpgradeTypeQueryOptions;
/**
 * @summary Get proration policies by upgrade type
 */
var useGetProrationPoliciesUpgradeTypeUpgradeType = function (upgradeType, options) {
    var queryOptions = (0, exports.getGetProrationPoliciesUpgradeTypeUpgradeTypeQueryOptions)(upgradeType, options);
    var query = (0, react_query_1.useQuery)(queryOptions);
    query.queryKey = queryOptions.queryKey;
    return query;
};
exports.useGetProrationPoliciesUpgradeTypeUpgradeType = useGetProrationPoliciesUpgradeTypeUpgradeType;
/**
 * @summary Get proration policy by ID
 */
var getProrationPoliciesId = function (id, signal) {
    return (0, axios_instance_1.customAxiosInstance)({ url: "http://localhost:8080/api/v1/proration-policies/".concat(id), method: 'GET', signal: signal
    });
};
exports.getProrationPoliciesId = getProrationPoliciesId;
var getGetProrationPoliciesIdQueryKey = function (id) {
    return ["http://localhost:8080/api/v1/proration-policies/".concat(id)];
};
exports.getGetProrationPoliciesIdQueryKey = getGetProrationPoliciesIdQueryKey;
var getGetProrationPoliciesIdQueryOptions = function (id, options) {
    var _a;
    var queryOptions = (options !== null && options !== void 0 ? options : {}).query;
    var queryKey = (_a = queryOptions === null || queryOptions === void 0 ? void 0 : queryOptions.queryKey) !== null && _a !== void 0 ? _a : (0, exports.getGetProrationPoliciesIdQueryKey)(id);
    var queryFn = function (_a) {
        var signal = _a.signal;
        return (0, exports.getProrationPoliciesId)(id, signal);
    };
    return __assign({ queryKey: queryKey, queryFn: queryFn, enabled: !!(id) }, queryOptions);
};
exports.getGetProrationPoliciesIdQueryOptions = getGetProrationPoliciesIdQueryOptions;
/**
 * @summary Get proration policy by ID
 */
var useGetProrationPoliciesId = function (id, options) {
    var queryOptions = (0, exports.getGetProrationPoliciesIdQueryOptions)(id, options);
    var query = (0, react_query_1.useQuery)(queryOptions);
    query.queryKey = queryOptions.queryKey;
    return query;
};
exports.useGetProrationPoliciesId = useGetProrationPoliciesId;
/**
 * @summary Update proration policy
 */
var putProrationPoliciesId = function (id, handlerUpdateProrationPolicyRequest) {
    return (0, axios_instance_1.customAxiosInstance)({ url: "http://localhost:8080/api/v1/proration-policies/".concat(id), method: 'PUT',
        headers: { 'Content-Type': 'application/json', },
        data: handlerUpdateProrationPolicyRequest });
};
exports.putProrationPoliciesId = putProrationPoliciesId;
var getPutProrationPoliciesIdMutationOptions = function (options) {
    var mutationOptions = (options !== null && options !== void 0 ? options : {}).mutation;
    var mutationFn = function (props) {
        var _a = props !== null && props !== void 0 ? props : {}, id = _a.id, data = _a.data;
        return (0, exports.putProrationPoliciesId)(id, data);
    };
    return __assign({ mutationFn: mutationFn }, mutationOptions);
};
exports.getPutProrationPoliciesIdMutationOptions = getPutProrationPoliciesIdMutationOptions;
/**
* @summary Update proration policy
*/
var usePutProrationPoliciesId = function (options) {
    var mutationOptions = (0, exports.getPutProrationPoliciesIdMutationOptions)(options);
    return (0, react_query_1.useMutation)(mutationOptions);
};
exports.usePutProrationPoliciesId = usePutProrationPoliciesId;
/**
 * @summary Soft delete proration policy
 */
var deleteProrationPoliciesId = function (id) {
    return (0, axios_instance_1.customAxiosInstance)({ url: "http://localhost:8080/api/v1/proration-policies/".concat(id), method: 'DELETE' });
};
exports.deleteProrationPoliciesId = deleteProrationPoliciesId;
var getDeleteProrationPoliciesIdMutationOptions = function (options) {
    var mutationOptions = (options !== null && options !== void 0 ? options : {}).mutation;
    var mutationFn = function (props) {
        var id = (props !== null && props !== void 0 ? props : {}).id;
        return (0, exports.deleteProrationPoliciesId)(id);
    };
    return __assign({ mutationFn: mutationFn }, mutationOptions);
};
exports.getDeleteProrationPoliciesIdMutationOptions = getDeleteProrationPoliciesIdMutationOptions;
/**
* @summary Soft delete proration policy
*/
var useDeleteProrationPoliciesId = function (options) {
    var mutationOptions = (0, exports.getDeleteProrationPoliciesIdMutationOptions)(options);
    return (0, react_query_1.useMutation)(mutationOptions);
};
exports.useDeleteProrationPoliciesId = useDeleteProrationPoliciesId;
/**
 * @summary Activate a proration policy
 */
var postProrationPoliciesIdActivate = function (id) {
    return (0, axios_instance_1.customAxiosInstance)({ url: "http://localhost:8080/api/v1/proration-policies/".concat(id, "/activate"), method: 'POST' });
};
exports.postProrationPoliciesIdActivate = postProrationPoliciesIdActivate;
var getPostProrationPoliciesIdActivateMutationOptions = function (options) {
    var mutationOptions = (options !== null && options !== void 0 ? options : {}).mutation;
    var mutationFn = function (props) {
        var id = (props !== null && props !== void 0 ? props : {}).id;
        return (0, exports.postProrationPoliciesIdActivate)(id);
    };
    return __assign({ mutationFn: mutationFn }, mutationOptions);
};
exports.getPostProrationPoliciesIdActivateMutationOptions = getPostProrationPoliciesIdActivateMutationOptions;
/**
* @summary Activate a proration policy
*/
var usePostProrationPoliciesIdActivate = function (options) {
    var mutationOptions = (0, exports.getPostProrationPoliciesIdActivateMutationOptions)(options);
    return (0, react_query_1.useMutation)(mutationOptions);
};
exports.usePostProrationPoliciesIdActivate = usePostProrationPoliciesIdActivate;
/**
 * @summary Deactivate a proration policy
 */
var postProrationPoliciesIdDeactivate = function (id) {
    return (0, axios_instance_1.customAxiosInstance)({ url: "http://localhost:8080/api/v1/proration-policies/".concat(id, "/deactivate"), method: 'POST' });
};
exports.postProrationPoliciesIdDeactivate = postProrationPoliciesIdDeactivate;
var getPostProrationPoliciesIdDeactivateMutationOptions = function (options) {
    var mutationOptions = (options !== null && options !== void 0 ? options : {}).mutation;
    var mutationFn = function (props) {
        var id = (props !== null && props !== void 0 ? props : {}).id;
        return (0, exports.postProrationPoliciesIdDeactivate)(id);
    };
    return __assign({ mutationFn: mutationFn }, mutationOptions);
};
exports.getPostProrationPoliciesIdDeactivateMutationOptions = getPostProrationPoliciesIdDeactivateMutationOptions;
/**
* @summary Deactivate a proration policy
*/
var usePostProrationPoliciesIdDeactivate = function (options) {
    var mutationOptions = (0, exports.getPostProrationPoliciesIdDeactivateMutationOptions)(options);
    return (0, react_query_1.useMutation)(mutationOptions);
};
exports.usePostProrationPoliciesIdDeactivate = usePostProrationPoliciesIdDeactivate;
/**
 * @summary Update downgrade type of a proration policy
 */
var putProrationPoliciesIdDowngradeType = function (id, handlerUpdateDowngradeTypeRequest) {
    return (0, axios_instance_1.customAxiosInstance)({ url: "http://localhost:8080/api/v1/proration-policies/".concat(id, "/downgrade-type"), method: 'PUT',
        headers: { 'Content-Type': 'application/json', },
        data: handlerUpdateDowngradeTypeRequest });
};
exports.putProrationPoliciesIdDowngradeType = putProrationPoliciesIdDowngradeType;
var getPutProrationPoliciesIdDowngradeTypeMutationOptions = function (options) {
    var mutationOptions = (options !== null && options !== void 0 ? options : {}).mutation;
    var mutationFn = function (props) {
        var _a = props !== null && props !== void 0 ? props : {}, id = _a.id, data = _a.data;
        return (0, exports.putProrationPoliciesIdDowngradeType)(id, data);
    };
    return __assign({ mutationFn: mutationFn }, mutationOptions);
};
exports.getPutProrationPoliciesIdDowngradeTypeMutationOptions = getPutProrationPoliciesIdDowngradeTypeMutationOptions;
/**
* @summary Update downgrade type of a proration policy
*/
var usePutProrationPoliciesIdDowngradeType = function (options) {
    var mutationOptions = (0, exports.getPutProrationPoliciesIdDowngradeTypeMutationOptions)(options);
    return (0, react_query_1.useMutation)(mutationOptions);
};
exports.usePutProrationPoliciesIdDowngradeType = usePutProrationPoliciesIdDowngradeType;
/**
 * @summary Check if proration policy exists
 */
var headProrationPoliciesIdExists = function (id, signal) {
    return (0, axios_instance_1.customAxiosInstance)({ url: "http://localhost:8080/api/v1/proration-policies/".concat(id, "/exists"), method: 'HEAD', signal: signal
    });
};
exports.headProrationPoliciesIdExists = headProrationPoliciesIdExists;
var getHeadProrationPoliciesIdExistsMutationOptions = function (options) {
    var mutationOptions = (options !== null && options !== void 0 ? options : {}).mutation;
    var mutationFn = function (props) {
        var id = (props !== null && props !== void 0 ? props : {}).id;
        return (0, exports.headProrationPoliciesIdExists)(id);
    };
    return __assign({ mutationFn: mutationFn }, mutationOptions);
};
exports.getHeadProrationPoliciesIdExistsMutationOptions = getHeadProrationPoliciesIdExistsMutationOptions;
/**
* @summary Check if proration policy exists
*/
var useHeadProrationPoliciesIdExists = function (options) {
    var mutationOptions = (0, exports.getHeadProrationPoliciesIdExistsMutationOptions)(options);
    return (0, react_query_1.useMutation)(mutationOptions);
};
exports.useHeadProrationPoliciesIdExists = useHeadProrationPoliciesIdExists;
/**
 * @summary Restore a soft-deleted proration policy
 */
var postProrationPoliciesIdRestore = function (id) {
    return (0, axios_instance_1.customAxiosInstance)({ url: "http://localhost:8080/api/v1/proration-policies/".concat(id, "/restore"), method: 'POST' });
};
exports.postProrationPoliciesIdRestore = postProrationPoliciesIdRestore;
var getPostProrationPoliciesIdRestoreMutationOptions = function (options) {
    var mutationOptions = (options !== null && options !== void 0 ? options : {}).mutation;
    var mutationFn = function (props) {
        var id = (props !== null && props !== void 0 ? props : {}).id;
        return (0, exports.postProrationPoliciesIdRestore)(id);
    };
    return __assign({ mutationFn: mutationFn }, mutationOptions);
};
exports.getPostProrationPoliciesIdRestoreMutationOptions = getPostProrationPoliciesIdRestoreMutationOptions;
/**
* @summary Restore a soft-deleted proration policy
*/
var usePostProrationPoliciesIdRestore = function (options) {
    var mutationOptions = (0, exports.getPostProrationPoliciesIdRestoreMutationOptions)(options);
    return (0, react_query_1.useMutation)(mutationOptions);
};
exports.usePostProrationPoliciesIdRestore = usePostProrationPoliciesIdRestore;
/**
 * @summary Update upgrade type of a proration policy
 */
var putProrationPoliciesIdUpgradeType = function (id, handlerUpdateUpgradeTypeRequest) {
    return (0, axios_instance_1.customAxiosInstance)({ url: "http://localhost:8080/api/v1/proration-policies/".concat(id, "/upgrade-type"), method: 'PUT',
        headers: { 'Content-Type': 'application/json', },
        data: handlerUpdateUpgradeTypeRequest });
};
exports.putProrationPoliciesIdUpgradeType = putProrationPoliciesIdUpgradeType;
var getPutProrationPoliciesIdUpgradeTypeMutationOptions = function (options) {
    var mutationOptions = (options !== null && options !== void 0 ? options : {}).mutation;
    var mutationFn = function (props) {
        var _a = props !== null && props !== void 0 ? props : {}, id = _a.id, data = _a.data;
        return (0, exports.putProrationPoliciesIdUpgradeType)(id, data);
    };
    return __assign({ mutationFn: mutationFn }, mutationOptions);
};
exports.getPutProrationPoliciesIdUpgradeTypeMutationOptions = getPutProrationPoliciesIdUpgradeTypeMutationOptions;
/**
* @summary Update upgrade type of a proration policy
*/
var usePutProrationPoliciesIdUpgradeType = function (options) {
    var mutationOptions = (0, exports.getPutProrationPoliciesIdUpgradeTypeMutationOptions)(options);
    return (0, react_query_1.useMutation)(mutationOptions);
};
exports.usePutProrationPoliciesIdUpgradeType = usePutProrationPoliciesIdUpgradeType;
/**
 * @summary Get all entitlements for a subscription
 */
var getSubscriptionsSubscriptionIdEntitlements = function (subscriptionId, signal) {
    return (0, axios_instance_1.customAxiosInstance)({ url: "http://localhost:8080/api/v1/subscriptions/".concat(subscriptionId, "/entitlements"), method: 'GET', signal: signal
    });
};
exports.getSubscriptionsSubscriptionIdEntitlements = getSubscriptionsSubscriptionIdEntitlements;
var getGetSubscriptionsSubscriptionIdEntitlementsQueryKey = function (subscriptionId) {
    return ["http://localhost:8080/api/v1/subscriptions/".concat(subscriptionId, "/entitlements")];
};
exports.getGetSubscriptionsSubscriptionIdEntitlementsQueryKey = getGetSubscriptionsSubscriptionIdEntitlementsQueryKey;
var getGetSubscriptionsSubscriptionIdEntitlementsQueryOptions = function (subscriptionId, options) {
    var _a;
    var queryOptions = (options !== null && options !== void 0 ? options : {}).query;
    var queryKey = (_a = queryOptions === null || queryOptions === void 0 ? void 0 : queryOptions.queryKey) !== null && _a !== void 0 ? _a : (0, exports.getGetSubscriptionsSubscriptionIdEntitlementsQueryKey)(subscriptionId);
    var queryFn = function (_a) {
        var signal = _a.signal;
        return (0, exports.getSubscriptionsSubscriptionIdEntitlements)(subscriptionId, signal);
    };
    return __assign({ queryKey: queryKey, queryFn: queryFn, enabled: !!(subscriptionId) }, queryOptions);
};
exports.getGetSubscriptionsSubscriptionIdEntitlementsQueryOptions = getGetSubscriptionsSubscriptionIdEntitlementsQueryOptions;
/**
 * @summary Get all entitlements for a subscription
 */
var useGetSubscriptionsSubscriptionIdEntitlements = function (subscriptionId, options) {
    var queryOptions = (0, exports.getGetSubscriptionsSubscriptionIdEntitlementsQueryOptions)(subscriptionId, options);
    var query = (0, react_query_1.useQuery)(queryOptions);
    query.queryKey = queryOptions.queryKey;
    return query;
};
exports.useGetSubscriptionsSubscriptionIdEntitlements = useGetSubscriptionsSubscriptionIdEntitlements;
