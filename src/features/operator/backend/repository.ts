"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  failure,
  success,
  type HandlerResult,
} from "@/backend/http/response";
import { TABLE_NAMES, REPORTS_DEFAULT_PAGE_SIZE, REPORTS_MAX_PAGE_SIZE } from "@/features/operator/constants";
import {
  CategorySchema,
  CategoryTableRowSchema,
  DifficultySchema,
  DifficultyTableRowSchema,
  ReportActionSchema,
  ReportActionTableRowSchema,
  ReportDetailSchema,
  ReportListResponseSchema,
  ReportStatus,
  ReportSummarySchema,
  ReportTableRowSchema,
  OperatorUserProfileSchema,
  type UserRole,
  type OperatorUserProfile,
  type Category,
  type CategoryTableRow,
  type Difficulty,
  type DifficultyTableRow,
  type ReportAction,
  type ReportActionTableRow,
  type ReportDetail,
  type ReportListResponse,
  type ReportFilterQuery,
  type ReportSummary,
  type ReportTableRow,
} from "@/features/operator/backend/schema";
import {
  operatorErrorCodes,
  type OperatorServiceError,
} from "@/features/operator/backend/error";

type RepositoryResult<T> = Promise<
  HandlerResult<T, OperatorServiceError, unknown>
>;

const normalizeTimestamp = (value: string | null) => {
  if (!value) {
    return value;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toISOString();
};

const normalizeReportRow = (row: ReportTableRow): ReportTableRow => ({
  ...row,
  reported_at: normalizeTimestamp(row.reported_at) ?? row.reported_at,
  resolved_at: normalizeTimestamp(row.resolved_at),
  created_at: normalizeTimestamp(row.created_at) ?? row.created_at,
  updated_at: normalizeTimestamp(row.updated_at) ?? row.updated_at,
  actions: row.actions?.map((action) => ({
    ...action,
    actioned_at:
      normalizeTimestamp(action.actioned_at) ?? action.actioned_at,
    created_at:
      normalizeTimestamp(action.created_at) ?? action.created_at,
    updated_at:
      normalizeTimestamp(action.updated_at) ?? action.updated_at,
  })),
});

const normalizeActionRow = (
  row: ReportActionTableRow | Record<string, unknown>,
): ReportActionTableRow => {
  const candidate = row as ReportActionTableRow;
  return {
    ...candidate,
    actioned_at: normalizeTimestamp(candidate.actioned_at) ?? candidate.actioned_at,
    created_at: normalizeTimestamp(candidate.created_at) ?? candidate.created_at,
    updated_at: normalizeTimestamp(candidate.updated_at) ?? candidate.updated_at,
  };
};

const normalizeCategoryRow = (
  row: CategoryTableRow,
): CategoryTableRow => ({
  ...row,
  created_at: normalizeTimestamp(row.created_at) ?? row.created_at,
  updated_at: normalizeTimestamp(row.updated_at) ?? row.updated_at,
});

const normalizeDifficultyRow = (
  row: DifficultyTableRow,
): DifficultyTableRow => ({
  ...row,
  created_at: normalizeTimestamp(row.created_at) ?? row.created_at,
  updated_at: normalizeTimestamp(row.updated_at) ?? row.updated_at,
});

const buildReportSummary = (
  row: ReportTableRow,
  reporterMap: Map<string, { id: string; name: string; email: string }>,
  actionGroups: Map<string, ReportActionTableRow[]>,
): ReportSummary | null => {
  const reporter = reporterMap.get(row.reported_by);

  if (!reporter) {
    return null;
  }

  const actions = actionGroups.get(row.id) ?? [];

  const latestAction = actions[0];

  const summaryCandidate = {
    id: row.id,
    status: row.status as ReportStatus,
    target: {
      type: row.target_type,
      id: row.target_id,
    },
    reason: row.reason,
    details: row.details ?? null,
    reporter,
    reportedAt: row.reported_at,
    resolvedAt: row.resolved_at ?? null,
    actionCount: actions.length,
    latestActionAt: latestAction?.actioned_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  const parsed = ReportSummarySchema.safeParse(summaryCandidate);

  if (!parsed.success) {
    return null;
  }

  return parsed.data;
};

const buildReportDetail = (
  row: ReportTableRow,
  reporterMap: Map<string, { id: string; name: string; email: string }>,
  actionGroups: Map<string, ReportActionTableRow[]>,
  actionUserMap: Map<string, { id: string; name: string; email: string }>,
): ReportDetail | null => {
  const summary = buildReportSummary(row, reporterMap, actionGroups);

  if (!summary) {
    return null;
  }

  const actions = actionGroups
    .get(row.id)
    ?.map((actionRow) => {
      const actor = actionUserMap.get(actionRow.actioned_by);

      if (!actor) {
        return null;
      }

      const candidate = {
        id: actionRow.id,
        reportId: actionRow.report_id,
        actionType: actionRow.action_type,
        actionDetails: actionRow.action_details ?? null,
        actionedBy: actor,
        actionedAt: actionRow.actioned_at,
        createdAt: actionRow.created_at,
        updatedAt: actionRow.updated_at,
      };

      const parsed = ReportActionSchema.safeParse(candidate);

      if (!parsed.success) {
        return null;
      }

      return parsed.data;
    })
    .filter((action): action is ReportAction => action !== null);

  if (!actions) {
    return null;
  }

  const detailCandidate = {
    ...summary,
    actions,
  };

  const parsed = ReportDetailSchema.safeParse(detailCandidate);

  if (!parsed.success) {
    return null;
  }

  return parsed.data;
};

const fetchUsersByIds = async (
  client: SupabaseClient,
  ids: string[],
) => {
  const uniqueIds = Array.from(new Set(ids));

  if (uniqueIds.length === 0) {
    return new Map<string, { id: string; name: string; email: string }>();
  }

  const { data, error } = await client
    .from(TABLE_NAMES.users)
    .select("id, name, email")
    .in("id", uniqueIds);

  if (error) {
    throw error;
  }

  const map = new Map<string, { id: string; name: string; email: string }>();

  for (const row of data ?? []) {
    if (
      typeof row?.id === "string" &&
      typeof row?.name === "string" &&
      typeof row?.email === "string"
    ) {
      map.set(row.id, {
        id: row.id,
        name: row.name,
        email: row.email,
      });
    }
  }

  return map;
};

const fetchActionsByReportIds = async (
  client: SupabaseClient,
  reportIds: string[],
) => {
  if (reportIds.length === 0) {
    return {
      actionGroups: new Map<string, ReportActionTableRow[]>(),
      actionUserIds: [] as string[],
    };
  }

  const { data, error } = await client
    .from(TABLE_NAMES.reportActions)
    .select(
      [
        "id",
        "report_id",
        "action_type",
        "action_details",
        "actioned_by",
        "actioned_at",
        "created_at",
        "updated_at",
      ].join(", "),
    )
    .in("report_id", reportIds)
    .order("actioned_at", { ascending: false });

  if (error) {
    throw error;
  }

  const actionGroups = new Map<string, ReportActionTableRow[]>();
  const actorIds = new Set<string>();

  for (const raw of data ?? []) {
    if (!raw || typeof raw !== "object") {
      continue;
    }

    const parsed = ReportActionTableRowSchema.safeParse(
      normalizeActionRow(raw as Record<string, unknown>),
    );

    if (!parsed.success) {
      continue;
    }

    const bucket = actionGroups.get(parsed.data.report_id) ?? [];
    bucket.push(parsed.data);
    actionGroups.set(parsed.data.report_id, bucket);
    actorIds.add(parsed.data.actioned_by);
  }

  return {
    actionGroups,
    actionUserIds: Array.from(actorIds),
  };
};

export const listReports = async (
  client: SupabaseClient,
  query: ReportFilterQuery,
): RepositoryResult<ReportListResponse> => {
  const page = query.page ?? 1;
  const pageSizeCandidate = query.pageSize ?? REPORTS_DEFAULT_PAGE_SIZE;
  const pageSize = Math.min(pageSizeCandidate, REPORTS_MAX_PAGE_SIZE);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let builder = client
    .from(TABLE_NAMES.reports)
    .select(
      [
        "id",
        "reported_by",
        "target_type",
        "target_id",
        "reason",
        "details",
        "status",
        "reported_at",
        "resolved_at",
        "created_at",
        "updated_at",
      ].join(", "),
      { count: "exact" },
    )
    .order("reported_at", { ascending: false })
    .range(from, to);

  if (query.status) {
    builder = builder.eq("status", query.status);
  }

  if (query.targetType) {
    builder = builder.eq("target_type", query.targetType);
  }

  if (query.search) {
    builder = builder.ilike("reason", `%${query.search}%`);
  }

  const { data, error, count } = await builder;

  if (error) {
    return failure(
      500,
      operatorErrorCodes.repositoryError,
      error.message,
      error,
    );
  }

  const normalizedRows: ReportTableRow[] = [];
  const reporterIds: string[] = [];

  for (const row of data ?? []) {
    const parsed = ReportTableRowSchema.safeParse(
      normalizeReportRow(row as ReportTableRow),
    );

    if (!parsed.success) {
      return failure(
        500,
        operatorErrorCodes.validationError,
        "Report record validation failed.",
        parsed.error.format(),
      );
    }

    normalizedRows.push(parsed.data);
    reporterIds.push(parsed.data.reported_by);
  }

  let actionsResult;

  try {
    actionsResult = await fetchActionsByReportIds(
      client,
      normalizedRows.map((row) => row.id),
    );
  } catch (actionsError) {
    return failure(
      500,
      operatorErrorCodes.repositoryError,
      "Failed to fetch report actions.",
      actionsError,
    );
  }

  let reporterMap;

  try {
    reporterMap = await fetchUsersByIds(client, reporterIds);
  } catch (reporterError) {
    return failure(
      500,
      operatorErrorCodes.repositoryError,
      "Failed to fetch reporter information.",
      reporterError,
    );
  }

  let actionUserMap;

  try {
    actionUserMap = await fetchUsersByIds(client, actionsResult.actionUserIds);
  } catch (actionUserError) {
    return failure(
      500,
      operatorErrorCodes.repositoryError,
      "Failed to fetch action actor information.",
      actionUserError,
    );
  }

  const summaries = normalizedRows
    .map((row) =>
      buildReportSummary(row, reporterMap, actionsResult.actionGroups),
    )
    .filter((item): item is ReportSummary => item !== null);

  const responseCandidate: ReportListResponse = {
    reports: summaries,
    total: count ?? summaries.length,
  };

  const parsedResponse = ReportListResponseSchema.safeParse(responseCandidate);

  if (!parsedResponse.success) {
    return failure(
      500,
      operatorErrorCodes.validationError,
      "Report list response is invalid.",
      parsedResponse.error.format(),
    );
  }

  return success(parsedResponse.data);
};

export const getReportDetail = async (
  client: SupabaseClient,
  reportId: string,
): RepositoryResult<ReportDetail> => {
  const { data, error } = await client
    .from(TABLE_NAMES.reports)
    .select(
      [
        "id",
        "reported_by",
        "target_type",
        "target_id",
        "reason",
        "details",
        "status",
        "reported_at",
        "resolved_at",
        "created_at",
        "updated_at",
      ].join(", "),
    )
    .eq("id", reportId)
    .maybeSingle();

  if (error) {
    return failure(
      500,
      operatorErrorCodes.repositoryError,
      error.message,
      error,
    );
  }

  if (!data) {
    return failure(
      404,
      operatorErrorCodes.reportNotFound,
      "Report not found.",
    );
  }

  const parsedRow = ReportTableRowSchema.safeParse(
    normalizeReportRow(data as ReportTableRow),
  );

  if (!parsedRow.success) {
    return failure(
      500,
      operatorErrorCodes.validationError,
      "Report detail record is invalid.",
      parsedRow.error.format(),
    );
  }

  let actionsResult;

  try {
    actionsResult = await fetchActionsByReportIds(client, [reportId]);
  } catch (actionsError) {
    return failure(
      500,
      operatorErrorCodes.repositoryError,
      "Failed to fetch report actions.",
      actionsError,
    );
  }

  let reporterMap;

  try {
    reporterMap = await fetchUsersByIds(client, [parsedRow.data.reported_by]);
  } catch (reporterError) {
    return failure(
      500,
      operatorErrorCodes.repositoryError,
      "Failed to fetch reporter information.",
      reporterError,
    );
  }

  let actionUserMap;

  try {
    actionUserMap = await fetchUsersByIds(
      client,
      actionsResult.actionUserIds,
    );
  } catch (actionUserError) {
    return failure(
      500,
      operatorErrorCodes.repositoryError,
      "Failed to fetch action actor information.",
      actionUserError,
    );
  }

  const detail = buildReportDetail(
    parsedRow.data,
    reporterMap,
    actionsResult.actionGroups,
    actionUserMap,
  );

  if (!detail) {
    return failure(
      500,
      operatorErrorCodes.validationError,
      "Report detail response is invalid.",
    );
  }

  return success(detail);
};

export const updateReportStatus = async (
  client: SupabaseClient,
  params: { reportId: string; status: ReportStatus; resolvedAt: string | null },
): RepositoryResult<ReportDetail> => {
  const { data, error } = await client
    .from(TABLE_NAMES.reports)
    .update({
      status: params.status,
      resolved_at: params.resolvedAt,
    })
    .eq("id", params.reportId)
    .select(
      [
        "id",
        "reported_by",
        "target_type",
        "target_id",
        "reason",
        "details",
        "status",
        "reported_at",
        "resolved_at",
        "created_at",
        "updated_at",
      ].join(", "),
    )
    .maybeSingle();

  if (error) {
    return failure(
      500,
      operatorErrorCodes.repositoryError,
      error.message,
      error,
    );
  }

  if (!data) {
    return failure(
      404,
      operatorErrorCodes.reportNotFound,
      "Report not found.",
    );
  }

  const parsedRow = ReportTableRowSchema.safeParse(
    normalizeReportRow(data as ReportTableRow),
  );

  if (!parsedRow.success) {
    return failure(
      500,
      operatorErrorCodes.validationError,
      "Report status update response is invalid.",
      parsedRow.error.format(),
    );
  }

  return getReportDetail(client, params.reportId);
};

export const insertReportAction = async (
  client: SupabaseClient,
  params: {
    reportId: string;
    actionType: string;
    actionDetails: string;
    actionedBy: string;
    actionedAt: string;
  },
): RepositoryResult<ReportAction> => {
  const { data, error } = await client
    .from(TABLE_NAMES.reportActions)
    .insert({
      report_id: params.reportId,
      action_type: params.actionType,
      action_details: params.actionDetails,
      actioned_by: params.actionedBy,
      actioned_at: params.actionedAt,
    })
    .select(
      [
        "id",
        "report_id",
        "action_type",
        "action_details",
        "actioned_by",
        "actioned_at",
        "created_at",
        "updated_at",
      ].join(", "),
    )
    .single();

  if (error) {
    return failure(
      500,
      operatorErrorCodes.repositoryError,
      error.message,
      error,
    );
  }

  const parsedRow = ReportActionTableRowSchema.safeParse(
    normalizeActionRow(data as ReportActionTableRow),
  );

  if (!parsedRow.success) {
    return failure(
      500,
      operatorErrorCodes.validationError,
      "Report action record is invalid.",
      parsedRow.error.format(),
    );
  }

  const [actionUserMap] = await Promise.all([
    fetchUsersByIds(client, [parsedRow.data.actioned_by]),
  ]);

  const actor = actionUserMap.get(parsedRow.data.actioned_by);

  if (!actor) {
    return failure(
      500,
      operatorErrorCodes.validationError,
      "Failed to resolve action actor.",
    );
  }

  const builtAction = ReportActionSchema.safeParse({
    id: parsedRow.data.id,
    reportId: parsedRow.data.report_id,
    actionType: parsedRow.data.action_type,
    actionDetails: parsedRow.data.action_details ?? null,
    actionedBy: actor,
    actionedAt: parsedRow.data.actioned_at,
    createdAt: parsedRow.data.created_at,
    updatedAt: parsedRow.data.updated_at,
  });

  if (!builtAction.success) {
    return failure(
      500,
      operatorErrorCodes.validationError,
      "Report action response is invalid.",
      builtAction.error.format(),
    );
  }

  return success(builtAction.data, 201);
};

export const listCategories = async (
  client: SupabaseClient,
): RepositoryResult<Category[]> => {
  const { data, error } = await client
    .from(TABLE_NAMES.courseCategories)
    .select("id, name, is_active, created_at, updated_at")
    .order("name", { ascending: true });

  if (error) {
    return failure(
      500,
      operatorErrorCodes.repositoryError,
      "Failed to fetch categories.",
      error,
    );
  }

  const categories = (data ?? []).map((row) => {
    const parsed = CategoryTableRowSchema.safeParse(
      normalizeCategoryRow(row as CategoryTableRow),
    );

    if (!parsed.success) {
      return null;
    }

    const candidate = {
      id: parsed.data.id,
      name: parsed.data.name,
      isActive: parsed.data.is_active,
      createdAt: parsed.data.created_at,
      updatedAt: parsed.data.updated_at,
    };

    const normalized = CategorySchema.safeParse(candidate);

    return normalized.success ? normalized.data : null;
  });

  const filtered = categories.filter(
    (category): category is Category => category !== null,
  );

  return success(filtered);
};

export const findCategoryByName = async (
  client: SupabaseClient,
  name: string,
): RepositoryResult<Category | null> => {
  const { data, error } = await client
    .from(TABLE_NAMES.courseCategories)
    .select("id, name, is_active, created_at, updated_at")
    .ilike("name", name)
    .maybeSingle();

  if (error) {
    return failure(
      500,
      operatorErrorCodes.repositoryError,
      "Failed to fetch category.",
      error,
    );
  }

  if (!data) {
    return success(null);
  }

  const parsed = CategoryTableRowSchema.safeParse(
    normalizeCategoryRow(data as CategoryTableRow),
  );

  if (!parsed.success) {
    return failure(
      500,
      operatorErrorCodes.validationError,
      "Category record is invalid.",
      parsed.error.format(),
    );
  }

  const normalized = CategorySchema.safeParse({
    id: parsed.data.id,
    name: parsed.data.name,
    isActive: parsed.data.is_active,
    createdAt: parsed.data.created_at,
    updatedAt: parsed.data.updated_at,
  });

  if (!normalized.success) {
    return failure(
      500,
      operatorErrorCodes.validationError,
      "Category response is invalid.",
      normalized.error.format(),
    );
  }

  return success(normalized.data);
};

export const createCategory = async (
  client: SupabaseClient,
  payload: { name: string; isActive: boolean },
): RepositoryResult<Category> => {
  const { data, error } = await client
    .from(TABLE_NAMES.courseCategories)
    .insert({
      name: payload.name,
      is_active: payload.isActive,
    })
    .select("id, name, is_active, created_at, updated_at")
    .single();

  if (error) {
    return failure(
      500,
      operatorErrorCodes.repositoryError,
      "Failed to create category.",
      error,
    );
  }

  const parsed = CategoryTableRowSchema.safeParse(
    normalizeCategoryRow(data as CategoryTableRow),
  );

  if (!parsed.success) {
    return failure(
      500,
      operatorErrorCodes.validationError,
      "Category creation result is invalid.",
      parsed.error.format(),
    );
  }

  const normalized = CategorySchema.safeParse({
    id: parsed.data.id,
    name: parsed.data.name,
    isActive: parsed.data.is_active,
    createdAt: parsed.data.created_at,
    updatedAt: parsed.data.updated_at,
  });

  if (!normalized.success) {
    return failure(
      500,
      operatorErrorCodes.validationError,
      "Category response is invalid.",
      normalized.error.format(),
    );
  }

  return success(normalized.data, 201);
};

export const updateCategory = async (
  client: SupabaseClient,
  categoryId: string,
  payload: { name?: string; isActive?: boolean },
): RepositoryResult<Category> => {
  const updates: Record<string, unknown> = {};

  if (payload.name !== undefined) {
    updates.name = payload.name;
  }

  if (payload.isActive !== undefined) {
    updates.is_active = payload.isActive;
  }

  const { data, error } = await client
    .from(TABLE_NAMES.courseCategories)
    .update(updates)
    .eq("id", categoryId)
    .select("id, name, is_active, created_at, updated_at")
    .maybeSingle();

  if (error) {
    return failure(
      500,
      operatorErrorCodes.repositoryError,
      "Failed to update category.",
      error,
    );
  }

  if (!data) {
    return failure(
      404,
      operatorErrorCodes.metadataNotFound,
      "Category not found.",
    );
  }

  const parsed = CategoryTableRowSchema.safeParse(
    normalizeCategoryRow(data as CategoryTableRow),
  );

  if (!parsed.success) {
    return failure(
      500,
      operatorErrorCodes.validationError,
      "Category update result is invalid.",
      parsed.error.format(),
    );
  }

  const normalized = CategorySchema.safeParse({
    id: parsed.data.id,
    name: parsed.data.name,
    isActive: parsed.data.is_active,
    createdAt: parsed.data.created_at,
    updatedAt: parsed.data.updated_at,
  });

  if (!normalized.success) {
    return failure(
      500,
      operatorErrorCodes.validationError,
      "Category response is invalid.",
      normalized.error.format(),
    );
  }

  return success(normalized.data);
};

export const listDifficultyLevels = async (
  client: SupabaseClient,
): RepositoryResult<Difficulty[]> => {
  const { data, error } = await client
    .from(TABLE_NAMES.difficultyLevels)
    .select("id, label, is_active, created_at, updated_at")
    .order("label", { ascending: true });

  if (error) {
    return failure(
      500,
      operatorErrorCodes.repositoryError,
      "Failed to fetch difficulty levels.",
      error,
    );
  }

  const difficulties = (data ?? []).map((row) => {
    const parsed = DifficultyTableRowSchema.safeParse(
      normalizeDifficultyRow(row as DifficultyTableRow),
    );

    if (!parsed.success) {
      return null;
    }

    const candidate = {
      id: parsed.data.id,
      label: parsed.data.label,
      isActive: parsed.data.is_active,
      createdAt: parsed.data.created_at,
      updatedAt: parsed.data.updated_at,
    };

    const normalized = DifficultySchema.safeParse(candidate);

    return normalized.success ? normalized.data : null;
  });

  const filtered = difficulties.filter(
    (item): item is Difficulty => item !== null,
  );

  return success(filtered);
};

export const findDifficultyByLabel = async (
  client: SupabaseClient,
  label: string,
): RepositoryResult<Difficulty | null> => {
  const { data, error } = await client
    .from(TABLE_NAMES.difficultyLevels)
    .select("id, label, is_active, created_at, updated_at")
    .ilike("label", label)
    .maybeSingle();

  if (error) {
    return failure(
      500,
      operatorErrorCodes.repositoryError,
      "Failed to fetch difficulty level.",
      error,
    );
  }

  if (!data) {
    return success(null);
  }

  const parsed = DifficultyTableRowSchema.safeParse(
    normalizeDifficultyRow(data as DifficultyTableRow),
  );

  if (!parsed.success) {
    return failure(
      500,
      operatorErrorCodes.validationError,
      "Difficulty level record is invalid.",
      parsed.error.format(),
    );
  }

  const normalized = DifficultySchema.safeParse({
    id: parsed.data.id,
    label: parsed.data.label,
    isActive: parsed.data.is_active,
    createdAt: parsed.data.created_at,
    updatedAt: parsed.data.updated_at,
  });

  if (!normalized.success) {
    return failure(
      500,
      operatorErrorCodes.validationError,
      "Difficulty level response is invalid.",
      normalized.error.format(),
    );
  }

  return success(normalized.data);
};

export const createDifficulty = async (
  client: SupabaseClient,
  payload: { label: string; isActive: boolean },
): RepositoryResult<Difficulty> => {
  const { data, error } = await client
    .from(TABLE_NAMES.difficultyLevels)
    .insert({
      label: payload.label,
      is_active: payload.isActive,
    })
    .select("id, label, is_active, created_at, updated_at")
    .single();

  if (error) {
    return failure(
      500,
      operatorErrorCodes.repositoryError,
      "Failed to create difficulty level.",
      error,
    );
  }

  const parsed = DifficultyTableRowSchema.safeParse(
    normalizeDifficultyRow(data as DifficultyTableRow),
  );

  if (!parsed.success) {
    return failure(
      500,
      operatorErrorCodes.validationError,
      "Difficulty level creation result is invalid.",
      parsed.error.format(),
    );
  }

  const normalized = DifficultySchema.safeParse({
    id: parsed.data.id,
    label: parsed.data.label,
    isActive: parsed.data.is_active,
    createdAt: parsed.data.created_at,
    updatedAt: parsed.data.updated_at,
  });

  if (!normalized.success) {
    return failure(
      500,
      operatorErrorCodes.validationError,
      "Difficulty level response is invalid.",
      normalized.error.format(),
    );
  }

  return success(normalized.data, 201);
};

export const updateDifficulty = async (
  client: SupabaseClient,
  difficultyId: string,
  payload: { label?: string; isActive?: boolean },
): RepositoryResult<Difficulty> => {
  const updates: Record<string, unknown> = {};

  if (payload.label !== undefined) {
    updates.label = payload.label;
  }

  if (payload.isActive !== undefined) {
    updates.is_active = payload.isActive;
  }

  const { data, error } = await client
    .from(TABLE_NAMES.difficultyLevels)
    .update(updates)
    .eq("id", difficultyId)
    .select("id, label, is_active, created_at, updated_at")
    .maybeSingle();

  if (error) {
    return failure(
      500,
      operatorErrorCodes.repositoryError,
      "Failed to update difficulty level.",
      error,
    );
  }

  if (!data) {
    return failure(
      404,
      operatorErrorCodes.metadataNotFound,
      "Difficulty level not found.",
    );
  }

  const parsed = DifficultyTableRowSchema.safeParse(
    normalizeDifficultyRow(data as DifficultyTableRow),
  );

  if (!parsed.success) {
    return failure(
      500,
      operatorErrorCodes.validationError,
      "Difficulty level update result is invalid.",
      parsed.error.format(),
    );
  }

  const normalized = DifficultySchema.safeParse({
    id: parsed.data.id,
    label: parsed.data.label,
    isActive: parsed.data.is_active,
    createdAt: parsed.data.created_at,
    updatedAt: parsed.data.updated_at,
  });

  if (!normalized.success) {
    return failure(
      500,
      operatorErrorCodes.validationError,
      "Difficulty level response is invalid.",
      normalized.error.format(),
    );
  }

  return success(normalized.data);
};

export const getUserProfileByAuthId = async (
  client: SupabaseClient,
  authUserId: string,
): RepositoryResult<OperatorUserProfile> => {
  const { data, error } = await client
    .from(TABLE_NAMES.users)
    .select("id, auth_user_id, role, name, email")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) {
    return failure(
      500,
      operatorErrorCodes.repositoryError,
      "Failed to fetch user profile.",
      error,
    );
  }

  if (!data) {
    return failure(
      404,
      operatorErrorCodes.unauthorized,
      "User profile not found.",
    );
  }

  const parsed = OperatorUserProfileSchema.safeParse({
    id: data.id,
    authUserId: data.auth_user_id,
    role: data.role,
    name: data.name,
    email: data.email,
  });

  if (!parsed.success) {
    return failure(
      500,
      operatorErrorCodes.validationError,
      "User profile data is invalid.",
      parsed.error.format(),
    );
  }

  return success(parsed.data);
};
