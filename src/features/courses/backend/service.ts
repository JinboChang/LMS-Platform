import type { SupabaseClient, User } from "@supabase/supabase-js";
import { formatISO } from "date-fns";
import { match } from "ts-pattern";
import {
  failure,
  success,
  type ErrorResult,
  type HandlerResult,
} from "@/backend/http/response";
import {
  courseErrorCodes,
  enrollmentErrorCodes,
  type CourseServiceError,
  type EnrollmentServiceError,
} from "./error";
import {
  CourseDetailSchema,
  CourseListQuerySchema,
  CourseListResponseSchema,
  CourseSummarySchema,
  EnrollmentResponseSchema,
  EnrollmentSnapshotSchema,
  type CourseDetail,
  type CourseListQuery,
  type CourseListResponse,
  type CourseSummary,
  type EnrollmentRequest,
  type EnrollmentUpdate,
} from "./schema";
import {
  fetchActiveCategories,
  fetchActiveDifficultyLevels,
  fetchActiveEnrollmentCounts,
  fetchCourseById,
  fetchCourseList,
  fetchEnrollmentByCourse,
  fetchEnrollmentById,
  fetchEnrollmentsByCourseIds,
  fetchLearnerProfile,
  insertEnrollment,
  updateEnrollmentStatus,
} from "./repository";

type ServiceContext = {
  accessToken?: string;
};

type LearnerContext = {
  learnerId: string;
  authUserId: string;
};

const sortOptionLabels = {
  latest: "최신순",
  popular: "인기순",
} as const;

const buildThumbnailUrl = (courseId: string) =>
  `https://picsum.photos/seed/${encodeURIComponent(courseId)}/640/360`;

const createSummary = (description: string) => {
  const trimmed = description.trim();

  if (trimmed.length <= 140) {
    return trimmed;
  }

  return `${trimmed.slice(0, 137)}...`;
};

const buildEnrollmentSnapshot = (
  enrollment?: {
    id: string;
    status: "active" | "cancelled";
    updated_at: string | null;
  } | null,
) => {
  if (!enrollment) {
    return null;
  }

  const parsed = EnrollmentSnapshotSchema.safeParse({
    id: enrollment.id,
    status: enrollment.status,
    updatedAt: enrollment.updated_at ?? formatISO(new Date()),
  });

  return parsed.success ? parsed.data : null;
};

const parseQuery = (
  raw: unknown,
): HandlerResult<CourseListQuery, CourseServiceError, unknown> => {
  const parsed = CourseListQuerySchema.safeParse(raw);

  if (!parsed.success) {
    return failure(
      400,
      courseErrorCodes.invalidQuery,
      "검색 조건이 올바르지 않습니다.",
      parsed.error.format(),
    );
  }

  return success(parsed.data);
};

const resolveAuthUser = async (
  client: SupabaseClient,
  accessToken?: string,
): Promise<User | null> => {
  if (!accessToken) {
    return null;
  }

  const response = await client.auth.getUser(accessToken);

  if (response.error || !response.data.user) {
    return null;
  }

  return response.data.user;
};

const resolveLearnerContext = async (
  client: SupabaseClient,
  accessToken?: string,
): Promise<LearnerContext | null> => {
  const authUser = await resolveAuthUser(client, accessToken);

  if (!authUser) {
    return null;
  }

  const profileResult = await fetchLearnerProfile(client, authUser.id);

  if (!profileResult.data || profileResult.error) {
    return null;
  }

  if (profileResult.data.role !== "learner") {
    return null;
  }

  return {
    learnerId: profileResult.data.id,
    authUserId: authUser.id,
  };
};

const mapCourseSummary = (
  base: CourseSummary,
  enrollmentSnapshot: CourseSummary["enrollment"],
  activeCount: number,
): CourseSummary => ({
  ...base,
  activeEnrollmentCount: activeCount,
  enrollment: enrollmentSnapshot,
  enrollmentStatus: enrollmentSnapshot?.status ?? "none",
  isEnrolled: enrollmentSnapshot?.status === "active",
});

export const listCourses = async (
  client: SupabaseClient,
  rawQuery: unknown,
  context: ServiceContext,
): Promise<HandlerResult<CourseListResponse, CourseServiceError, unknown>> => {
  const parsedQuery = parseQuery(rawQuery);

  if (!parsedQuery.ok) {
    const { status, error: queryError } = parsedQuery as ErrorResult<
      CourseServiceError,
      unknown
    >;

    return failure(status, queryError.code, queryError.message, queryError.details);
  }

  const query = parsedQuery.data;

  const learnerContext = await resolveLearnerContext(
    client,
    context.accessToken,
  );

  const [categories, difficultyLevels] = await Promise.all([
    fetchActiveCategories(client),
    fetchActiveDifficultyLevels(client),
  ]);

  const { data: courseRows, error } = await fetchCourseList(client, query);

  if (error) {
    return failure(
      500,
      courseErrorCodes.fetchFailed,
      "코스를 불러오지 못했습니다.",
      error.message,
    );
  }

  const validRows = courseRows.filter(
    (row) => row.category && row.difficulty && row.instructor,
  );

  const courseIds = validRows.map((row) => row.id);

  const [activeCounts, learnerEnrollments] = await Promise.all([
    fetchActiveEnrollmentCounts(client, courseIds),
    learnerContext
      ? fetchEnrollmentsByCourseIds(client, learnerContext.learnerId, courseIds)
      : Promise.resolve([]),
  ]);

  const enrollmentMap = learnerEnrollments.reduce(
    (acc, enrollment) => acc.set(enrollment.course_id, enrollment),
    new Map<string, (typeof learnerEnrollments)[number]>(),
  );

  const summaries = validRows
    .map((row) => {
      const enrollmentSnapshot = buildEnrollmentSnapshot(
        enrollmentMap.get(row.id)
          ? {
              id: enrollmentMap.get(row.id)!.id,
              status: enrollmentMap.get(row.id)!.status,
              updated_at: enrollmentMap.get(row.id)!.updated_at,
            }
          : null,
      );

      const summaryCandidate = {
        id: row.id,
        title: row.title,
        summary: createSummary(row.description),
        thumbnailUrl: buildThumbnailUrl(row.id),
        category: {
          id: row.category!.id,
          name: row.category!.name,
        },
        difficulty: {
          id: row.difficulty!.id,
          label: row.difficulty!.label,
        },
        instructor: {
          id: row.instructor!.id,
          name: row.instructor!.name,
        },
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        activeEnrollmentCount: activeCounts.get(row.id) ?? 0,
        enrollment: enrollmentSnapshot,
        enrollmentStatus: enrollmentSnapshot?.status ?? "none",
        isEnrolled: enrollmentSnapshot?.status === "active",
      };

      const parsedSummary = CourseSummarySchema.safeParse(summaryCandidate);

      if (!parsedSummary.success) {
        return null;
      }

      return mapCourseSummary(
        parsedSummary.data,
        enrollmentSnapshot,
        activeCounts.get(row.id) ?? 0,
      );
    })
    .filter((summary): summary is CourseSummary => summary !== null);

  const sorted = match(query.sort)
    .with("popular", () =>
      [...summaries].sort((a, b) => {
        if (a.activeEnrollmentCount === b.activeEnrollmentCount) {
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }

        return b.activeEnrollmentCount - a.activeEnrollmentCount;
      }),
    )
    .otherwise(() =>
      [...summaries].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    );

  const limited = sorted.slice(0, query.limit);

  const responseCandidate = {
    items: limited,
    filters: {
      categories,
      difficultyLevels,
      sortOptions: Object.entries(sortOptionLabels).map(([value, label]) => ({
        value,
        label,
      })),
    },
  };

  const responseParse = CourseListResponseSchema.safeParse(responseCandidate);

  if (!responseParse.success) {
    return failure(
      500,
      courseErrorCodes.fetchFailed,
      "코스 목록 응답을 구성하지 못했습니다.",
      responseParse.error.format(),
    );
  }

  return success(responseParse.data);
};

export const getCourseDetail = async (
  client: SupabaseClient,
  courseId: string,
  context: ServiceContext,
): Promise<HandlerResult<CourseDetail, CourseServiceError, unknown>> => {
  const { data: course, error } = await fetchCourseById(client, courseId);

  if (error) {
    return failure(
      500,
      courseErrorCodes.fetchFailed,
      "코스를 조회하지 못했습니다.",
      error.message,
    );
  }

  if (!course) {
    return failure(404, courseErrorCodes.notFound, "코스를 찾을 수 없습니다.");
  }

  if (course.status !== "published") {
    return failure(
      403,
      courseErrorCodes.notPublished,
      "공개 상태가 아닌 코스입니다.",
    );
  }

  if (!course.category || !course.difficulty || !course.instructor) {
    return failure(
      500,
      courseErrorCodes.fetchFailed,
      "코스 메타데이터가 손상되었습니다.",
    );
  }

  const learnerContext = await resolveLearnerContext(
    client,
    context.accessToken,
  );

  const [activeCounts, enrollment] = await Promise.all([
    fetchActiveEnrollmentCounts(client, [course.id]),
    learnerContext
      ? fetchEnrollmentByCourse(client, learnerContext.learnerId, course.id).then(
          (result) => result.data,
        )
      : Promise.resolve(null),
  ]);

  const enrollmentSnapshot = buildEnrollmentSnapshot(
    enrollment
      ? {
          id: enrollment.id,
          status: enrollment.status,
          updated_at: enrollment.updated_at,
        }
      : null,
  );

  const detailCandidate = {
    id: course.id,
    title: course.title,
    summary: createSummary(course.description),
    thumbnailUrl: buildThumbnailUrl(course.id),
    category: {
      id: course.category.id,
      name: course.category.name,
    },
    difficulty: {
      id: course.difficulty.id,
      label: course.difficulty.label,
    },
    instructor: {
      id: course.instructor.id,
      name: course.instructor.name,
    },
    createdAt: course.created_at,
    updatedAt: course.updated_at,
    activeEnrollmentCount: activeCounts.get(course.id) ?? 0,
    enrollment: enrollmentSnapshot,
    enrollmentStatus: enrollmentSnapshot?.status ?? "none",
    isEnrolled: enrollmentSnapshot?.status === "active",
    description: course.description,
    curriculum: course.curriculum,
    status: course.status,
  };

  const detailParse = CourseDetailSchema.safeParse(detailCandidate);

  if (!detailParse.success) {
    return failure(
      500,
      courseErrorCodes.fetchFailed,
      "코스 상세 응답을 구성하지 못했습니다.",
      detailParse.error.format(),
    );
  }

  return success(detailParse.data);
};

const ensureLearner = async (
  client: SupabaseClient,
  context: ServiceContext,
): Promise<HandlerResult<LearnerContext, EnrollmentServiceError>> => {
  if (!context.accessToken) {
    return failure(
      401,
      enrollmentErrorCodes.unauthorized,
      "로그인이 필요합니다.",
    );
  }

  const learnerContext = await resolveLearnerContext(
    client,
    context.accessToken,
  );

  if (!learnerContext) {
    return failure(
      403,
      enrollmentErrorCodes.learnerProfileMissing,
      "학습자 프로필을 찾을 수 없습니다.",
    );
  }

  return success(learnerContext);
};

const toEnrollmentResponse = (
  payload: unknown,
): HandlerResult<unknown, EnrollmentServiceError, unknown> => {
  const parsed = EnrollmentResponseSchema.safeParse(payload);

  if (!parsed.success) {
    return failure(
      500,
      enrollmentErrorCodes.enrollmentUpdateFailed,
      "수강 내역 응답을 구성하지 못했습니다.",
      parsed.error.format(),
    );
  }

  return success(parsed.data);
};

export const enrollCourse = async (
  client: SupabaseClient,
  body: EnrollmentRequest,
  context: ServiceContext,
): Promise<HandlerResult<unknown, EnrollmentServiceError, unknown>> => {
  const learnerResult = await ensureLearner(client, context);

  if (!learnerResult.ok) {
    return learnerResult;
  }

  const { learnerId } = learnerResult.data;

  const { data: course } = await fetchCourseById(client, body.courseId);

  if (!course || course.status !== "published") {
    return failure(
      409,
      enrollmentErrorCodes.courseUnavailable,
      "신청할 수 없는 코스입니다.",
    );
  }

  const existing = await fetchEnrollmentByCourse(
    client,
    learnerId,
    body.courseId,
  );

  if (existing.data) {
    if (existing.data.status === "active") {
      return failure(
        409,
        enrollmentErrorCodes.duplicateEnrollment,
        "이미 수강 중인 코스입니다.",
      );
    }

    const updated = await updateEnrollmentStatus(
      client,
      existing.data.id,
      "active",
    );

    if (!updated.data || updated.error) {
      return failure(
        500,
        enrollmentErrorCodes.enrollmentUpdateFailed,
        "수강 신청 상태를 갱신하지 못했습니다.",
        updated.error?.message,
      );
    }

    return toEnrollmentResponse({
      enrollment: {
        id: updated.data.id,
        status: updated.data.status,
        updatedAt: updated.data.updated_at,
      },
      courseId: updated.data.course_id,
    });
  }

  const inserted = await insertEnrollment(client, learnerId, body.courseId);

  if (!inserted.data || inserted.error) {
    const code = match(inserted.error?.code)
      .with("23505", () => enrollmentErrorCodes.duplicateEnrollment)
      .otherwise(() => enrollmentErrorCodes.enrollmentCreateFailed);

    return failure(
      code === enrollmentErrorCodes.duplicateEnrollment ? 409 : 500,
      code,
      code === enrollmentErrorCodes.duplicateEnrollment
        ? "이미 수강 중인 코스입니다."
        : "수강 신청에 실패했습니다.",
      inserted.error?.message,
    );
  }

  return toEnrollmentResponse({
    enrollment: {
      id: inserted.data.id,
      status: inserted.data.status,
      updatedAt: inserted.data.updated_at,
    },
    courseId: inserted.data.course_id,
  });
};

export const cancelEnrollment = async (
  client: SupabaseClient,
  enrollmentId: string,
  update: EnrollmentUpdate,
  context: ServiceContext,
): Promise<HandlerResult<unknown, EnrollmentServiceError, unknown>> => {
  if (update.status !== "cancelled") {
    return failure(
      400,
      enrollmentErrorCodes.invalidPayload,
      "지원하지 않는 수강 상태입니다.",
    );
  }

  const learnerResult = await ensureLearner(client, context);

  if (!learnerResult.ok) {
    return learnerResult;
  }

  const { learnerId } = learnerResult.data;

  const enrollmentResult = await fetchEnrollmentById(client, enrollmentId);

  if (!enrollmentResult.data || enrollmentResult.error) {
    return failure(
      404,
      enrollmentErrorCodes.enrollmentNotFound,
      "수강 이력을 찾을 수 없습니다.",
      enrollmentResult.error?.message,
    );
  }

  if (enrollmentResult.data.learner_id !== learnerId) {
    return failure(
      403,
      enrollmentErrorCodes.unauthorized,
      "본인 수강 이력만 취소할 수 있습니다.",
    );
  }

  if (enrollmentResult.data.status === "cancelled") {
    return toEnrollmentResponse({
      enrollment: {
        id: enrollmentResult.data.id,
        status: enrollmentResult.data.status,
        updatedAt: enrollmentResult.data.updated_at,
      },
      courseId: enrollmentResult.data.course_id,
    });
  }

  const updated = await updateEnrollmentStatus(
    client,
    enrollmentResult.data.id,
    "cancelled",
  );

  if (!updated.data || updated.error) {
    return failure(
      500,
      enrollmentErrorCodes.enrollmentUpdateFailed,
      "수강 취소에 실패했습니다.",
      updated.error?.message,
    );
  }

  return toEnrollmentResponse({
    enrollment: {
      id: updated.data.id,
      status: updated.data.status,
      updatedAt: updated.data.updated_at,
    },
    courseId: updated.data.course_id,
  });
};

