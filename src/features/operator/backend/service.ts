"use server";

import { formatISO } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import { match } from "ts-pattern";
import {
  failure,
  success,
  type ErrorResult,
  type HandlerResult,
} from "@/backend/http/response";
import type { AppLogger } from "@/backend/hono/context";
import {
  DEFAULT_CATEGORY_ACTIVE_STATE,
  DEFAULT_DIFFICULTY_ACTIVE_STATE,
  REPORT_STATUS_FLOW,
} from "@/features/operator/constants";
import {
  CategoryMutationSchema,
  DifficultyMutationSchema,
  OperatorUserProfileSchema,
  ReportActionRequestSchema,
  ReportDetailSchema,
  ReportFilterQuerySchema,
  ReportListResponseSchema,
  ReportStatus,
  ReportStatusUpdateRequestSchema,
  type Category,
  type ReportDetail,
  type ReportListResponse,
  type CategoryMutation,
  type Difficulty,
  type DifficultyMutation,
  type ReportActionRequest,
  type ReportFilterQuery,
  type ReportStatusUpdateRequest,
} from "@/features/operator/backend/schema";
import {
  createCategory,
  createDifficulty,
  findCategoryByName,
  findDifficultyByLabel,
  getReportDetail,
  getUserProfileByAuthId,
  insertReportAction,
  listCategories,
  listDifficultyLevels,
  listReports,
  updateCategory,
  updateDifficulty,
  updateReportStatus,
} from "@/features/operator/backend/repository";
import {
  operatorErrorCodes,
  type OperatorServiceError,
} from "@/features/operator/backend/error";

type OperatorContext = {
  operatorId: string;
  authUserId: string;
  name: string;
  email: string;
};

type ServiceContext = {
  client: SupabaseClient;
  logger: AppLogger;
};

type WithOperator = ServiceContext & {
  operator: OperatorContext;
};

const ensureOperatorContext = async (
  client: SupabaseClient,
  authUserId: string,
): Promise<HandlerResult<OperatorContext, OperatorServiceError, unknown>> => {
  const profileResult = await getUserProfileByAuthId(client, authUserId);

  if (!profileResult.ok) {
    const errorResult =
      profileResult as ErrorResult<OperatorServiceError, unknown>;

    if (errorResult.status === 404) {
      return failure(
        403,
        operatorErrorCodes.unauthorized,
        "Operator role is required.",
      );
    }

    return failure(
      errorResult.status,
      errorResult.error.code,
      errorResult.error.message,
      errorResult.error.details,
    );
  }

  const profile = profileResult.data;

  const parsedProfile = OperatorUserProfileSchema.safeParse({
    id: profile.id,
    authUserId: profile.authUserId,
    role: profile.role,
    name: profile.name,
    email: profile.email,
  });

  if (!parsedProfile.success) {
    return failure(
      500,
      operatorErrorCodes.validationError,
      "Operator profile is invalid.",
      parsedProfile.error.format(),
    );
  }

  if (parsedProfile.data.role !== "operator") {
    return failure(
      403,
      operatorErrorCodes.forbidden,
      "Operator permissions are required.",
    );
  }

  return success({
    operatorId: parsedProfile.data.id,
    authUserId: parsedProfile.data.authUserId,
    name: parsedProfile.data.name,
    email: parsedProfile.data.email,
  });
};

const resolveReportStatusTransition = (
  current: ReportStatus,
  next: ReportStatus,
) => {
  if (current === next) {
    return {
      allowed: true,
      resolvedAt: match(next)
        .with("resolved", () => formatISO(new Date()))
        .otherwise(() => null),
    } as const;
  }

  const allowedNext = REPORT_STATUS_FLOW[current] ?? [];

  if (!allowedNext.includes(next)) {
    return {
      allowed: false,
      resolvedAt: null,
    } as const;
  }

  return {
    allowed: true,
    resolvedAt: match(next)
      .with("resolved", () => formatISO(new Date()))
      .otherwise(() => null),
  } as const;
};

const parseFilterQuery = (
  raw: unknown,
): HandlerResult<ReportFilterQuery, OperatorServiceError, unknown> => {
  const parsed = ReportFilterQuerySchema.safeParse(raw);

  if (!parsed.success) {
    return failure(
      400,
      operatorErrorCodes.validationError,
      "Invalid report filter parameters.",
      parsed.error.format(),
    );
  }

  return success(parsed.data);
};

const parseStatusPayload = (
  raw: unknown,
): HandlerResult<ReportStatusUpdateRequest, OperatorServiceError, unknown> => {
  const parsed = ReportStatusUpdateRequestSchema.safeParse(raw);

  if (!parsed.success) {
    return failure(
      400,
      operatorErrorCodes.validationError,
      "Invalid report status payload.",
      parsed.error.format(),
    );
  }

  return success(parsed.data);
};

const parseActionPayload = (
  raw: unknown,
): HandlerResult<ReportActionRequest, OperatorServiceError, unknown> => {
  const parsed = ReportActionRequestSchema.safeParse(raw);

  if (!parsed.success) {
    return failure(
      400,
      operatorErrorCodes.validationError,
      "Invalid report action payload.",
      parsed.error.format(),
    );
  }

  return success(parsed.data);
};

const parseCategoryPayload = (
  raw: unknown,
): HandlerResult<CategoryMutation, OperatorServiceError, unknown> => {
  const parsed = CategoryMutationSchema.safeParse(raw);

  if (!parsed.success) {
    return failure(
      400,
      operatorErrorCodes.validationError,
      "Invalid category payload.",
      parsed.error.format(),
    );
  }

  return success(parsed.data);
};

const parseDifficultyPayload = (
  raw: unknown,
): HandlerResult<DifficultyMutation, OperatorServiceError, unknown> => {
  const parsed = DifficultyMutationSchema.safeParse(raw);

  if (!parsed.success) {
    return failure(
      400,
      operatorErrorCodes.validationError,
      "Invalid difficulty payload.",
      parsed.error.format(),
    );
  }

  return success(parsed.data);
};

export const requireOperator = async (
  client: SupabaseClient,
  authUserId: string,
): Promise<HandlerResult<OperatorContext, OperatorServiceError, unknown>> =>
  ensureOperatorContext(client, authUserId);

export const getOperatorReports = async (
  { client, logger, operator }: WithOperator,
  rawQuery: unknown,
): Promise<HandlerResult<ReportListResponse, OperatorServiceError, unknown>> => {
  void operator;

  const queryResult = parseFilterQuery(rawQuery);

  if (!queryResult.ok) {
    const errorResult = queryResult as ErrorResult<
      OperatorServiceError,
      unknown
    >;

    return failure(
      errorResult.status,
      errorResult.error.code,
      errorResult.error.message,
      errorResult.error.details,
    );
  }

  const reportsResult = await listReports(client, queryResult.data);

  if (!reportsResult.ok) {
    const errorResult =
      reportsResult as ErrorResult<OperatorServiceError, unknown>;

    if (errorResult.status >= 500) {
      logger.error("Failed to query report list", errorResult.error);
    }

    return reportsResult;
  }

  const parsed = ReportListResponseSchema.safeParse(reportsResult.data);

  if (!parsed.success) {
    logger.error("Report list response validation failed", parsed.error);
    return failure(
      500,
      operatorErrorCodes.validationError,
      "Report list response is invalid.",
      parsed.error.format(),
    );
  }

  return success(parsed.data);
};

export const getOperatorReportDetail = async (
  { client, logger, operator }: WithOperator,
  reportId: string,
): Promise<HandlerResult<ReportDetail, OperatorServiceError, unknown>> => {
  void operator;

  const reportResult = await getReportDetail(client, reportId);

  if (!reportResult.ok) {
    const errorResult =
      reportResult as ErrorResult<OperatorServiceError, unknown>;

    if (errorResult.status >= 500) {
      logger.error("Failed to fetch report detail", errorResult.error);
    }

    return reportResult;
  }

  const parsed = ReportDetailSchema.safeParse(reportResult.data);

  if (!parsed.success) {
    logger.error("Report detail validation failed", parsed.error);
    return failure(
      500,
      operatorErrorCodes.validationError,
      "Report detail response is invalid.",
      parsed.error.format(),
    );
  }

  return success(parsed.data);
};

export const updateOperatorReportStatus = async (
  { client, logger, operator }: WithOperator,
  reportId: string,
  rawBody: unknown,
): Promise<HandlerResult<ReportDetail, OperatorServiceError, unknown>> => {
  void operator;

  const payloadResult = parseStatusPayload(rawBody);

  if (!payloadResult.ok) {
    const errorResult = payloadResult as ErrorResult<
      OperatorServiceError,
      unknown
    >;

    return failure(
      errorResult.status,
      errorResult.error.code,
      errorResult.error.message,
      errorResult.error.details,
    );
  }

  const existingResult = await getReportDetail(client, reportId);

  if (!existingResult.ok) {
    return existingResult;
  }

  const transition = resolveReportStatusTransition(
    existingResult.data.status,
    payloadResult.data.status,
  );

  if (!transition.allowed) {
    return failure(
      409,
      operatorErrorCodes.invalidStatusTransition,
      "Invalid report status transition.",
    );
  }

  const updateResult = await updateReportStatus(client, {
    reportId,
    status: payloadResult.data.status,
    resolvedAt: transition.resolvedAt,
  });

  if (!updateResult.ok) {
    const errorResult =
      updateResult as ErrorResult<OperatorServiceError, unknown>;

    if (errorResult.status >= 500) {
      logger.error("Failed to update report status", errorResult.error);
    }

    return updateResult;
  }

  const parsed = ReportDetailSchema.safeParse(updateResult.data);

  if (!parsed.success) {
    logger.error("Report status response validation failed", parsed.error);
    return failure(
      500,
      operatorErrorCodes.validationError,
      "Report status response is invalid.",
      parsed.error.format(),
    );
  }

  return success(parsed.data);
};

export const recordOperatorReportAction = async (
  { client, logger, operator }: WithOperator,
  reportId: string,
  rawBody: unknown,
): Promise<HandlerResult<ReportDetail, OperatorServiceError, unknown>> => {
  const payloadResult = parseActionPayload(rawBody);

  if (!payloadResult.ok) {
    const errorResult = payloadResult as ErrorResult<OperatorServiceError, unknown>;

    return failure(
      errorResult.status,
      errorResult.error.code,
      errorResult.error.message,
      errorResult.error.details,
    );
  }

  const reportResult = await getReportDetail(client, reportId);

  if (!reportResult.ok) {
    return reportResult;
  }

  if (reportResult.data.status === "resolved") {
    return failure(
      409,
      operatorErrorCodes.reportAlreadyResolved,
      "This report is already resolved.",
    );
  }

  const actionResult = await insertReportAction(client, {
    reportId,
    actionType: payloadResult.data.actionType,
    actionDetails: payloadResult.data.actionDetails,
    actionedBy: operator.operatorId,
    actionedAt: formatISO(new Date()),
  });

  if (!actionResult.ok) {
    const errorResult =
      actionResult as ErrorResult<OperatorServiceError, unknown>;

    if (errorResult.status >= 500) {
      logger.error("Failed to record report action", errorResult.error);
    }

    return failure(
      errorResult.status,
      errorResult.error.code,
      errorResult.error.message,
      errorResult.error.details,
    );
  }

  const refreshedResult = await getReportDetail(client, reportId);

  if (!refreshedResult.ok) {
    return refreshedResult;
  }

  const parsed = ReportDetailSchema.safeParse(refreshedResult.data);

  if (!parsed.success) {
    logger.error("Report detail validation failed after action", parsed.error);
    return failure(
      500,
      operatorErrorCodes.validationError,
      "Report detail response is invalid.",
      parsed.error.format(),
    );
  }

  return success(parsed.data);
};

export const getOperatorCategories = async ({
  client,
  operator,
}: WithOperator): Promise<HandlerResult<Category[], OperatorServiceError, unknown>> => {
  void operator;

  const result = await listCategories(client);

  return result;
};

export const createOperatorCategory = async (
  { client, logger, operator }: WithOperator,
  rawBody: unknown,
): Promise<HandlerResult<Category, OperatorServiceError, unknown>> => {
  void operator;

  const payloadResult = parseCategoryPayload(rawBody);

  if (!payloadResult.ok) {
    return payloadResult;
  }

  const existingResult = await findCategoryByName(
    client,
    payloadResult.data.name,
  );

  if (!existingResult.ok) {
    const errorResult =
      existingResult as ErrorResult<OperatorServiceError, unknown>;

    if (errorResult.status >= 500) {
      logger.error("Category duplicate check failed", errorResult.error);
    }

    return existingResult;
  }

  if (existingResult.data) {
    return failure(
      409,
      operatorErrorCodes.metadataConflict,
      "Category already exists.",
    );
  }

  const createResult = await createCategory(client, {
    name: payloadResult.data.name,
    isActive: payloadResult.data.isActive ?? DEFAULT_CATEGORY_ACTIVE_STATE,
  });

  return createResult;
};

export const updateOperatorCategory = async (
  { client, logger, operator }: WithOperator,
  categoryId: string,
  rawBody: unknown,
): Promise<HandlerResult<Category, OperatorServiceError, unknown>> => {
  void operator;

  const payloadResult = parseCategoryPayload(rawBody);

  if (!payloadResult.ok) {
    return payloadResult;
  }

  const existingResult = await findCategoryByName(
    client,
    payloadResult.data.name,
  );

  if (!existingResult.ok) {
    const errorResult =
      existingResult as ErrorResult<OperatorServiceError, unknown>;

    if (errorResult.status >= 500) {
      logger.error("Category duplicate check failed", errorResult.error);
    }

    return existingResult;
  }

  if (existingResult.data && existingResult.data.id !== categoryId) {
    return failure(
      409,
      operatorErrorCodes.metadataConflict,
      "Another category with the same name already exists.",
    );
  }

  const updateResult = await updateCategory(client, categoryId, {
    name: payloadResult.data.name,
    isActive: payloadResult.data.isActive,
  });

  return updateResult;
};

export const getOperatorDifficultyLevels = async ({
  client,
  operator,
}: WithOperator): Promise<HandlerResult<Difficulty[], OperatorServiceError, unknown>> => {
  void operator;

  return listDifficultyLevels(client);
};

export const createOperatorDifficulty = async (
  { client, logger, operator }: WithOperator,
  rawBody: unknown,
): Promise<HandlerResult<Difficulty, OperatorServiceError, unknown>> => {
  void operator;

  const payloadResult = parseDifficultyPayload(rawBody);

  if (!payloadResult.ok) {
    return payloadResult;
  }

  const existingResult = await findDifficultyByLabel(
    client,
    payloadResult.data.label,
  );

  if (!existingResult.ok) {
    const errorResult =
      existingResult as ErrorResult<OperatorServiceError, unknown>;

    if (errorResult.status >= 500) {
      logger.error("Difficulty duplicate check failed", errorResult.error);
    }

    return existingResult;
  }

  if (existingResult.data) {
    return failure(
      409,
      operatorErrorCodes.metadataConflict,
      "Difficulty label already exists.",
    );
  }

  return createDifficulty(client, {
    label: payloadResult.data.label,
    isActive: payloadResult.data.isActive ?? DEFAULT_DIFFICULTY_ACTIVE_STATE,
  });
};

export const updateOperatorDifficulty = async (
  { client, logger, operator }: WithOperator,
  difficultyId: string,
  rawBody: unknown,
): Promise<HandlerResult<Difficulty, OperatorServiceError, unknown>> => {
  void operator;

  const payloadResult = parseDifficultyPayload(rawBody);

  if (!payloadResult.ok) {
    return payloadResult;
  }

  const existingResult = await findDifficultyByLabel(
    client,
    payloadResult.data.label,
  );

  if (!existingResult.ok) {
    const errorResult =
      existingResult as ErrorResult<OperatorServiceError, unknown>;

    if (errorResult.status >= 500) {
      logger.error("Difficulty duplicate check failed", errorResult.error);
    }

    return existingResult;
  }

  if (existingResult.data && existingResult.data.id !== difficultyId) {
    return failure(
      409,
      operatorErrorCodes.metadataConflict,
      "Another difficulty with the same label already exists.",
    );
  }

  return updateDifficulty(client, difficultyId, {
    label: payloadResult.data.label,
    isActive: payloadResult.data.isActive,
  });
};
