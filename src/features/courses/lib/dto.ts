import {
  CourseDetailSchema,
  CourseListQuerySchema,
  CourseListResponseSchema,
  CourseSummarySchema,
  EnrollmentResponseSchema,
  EnrollmentStatusSchema,
  ExtendedEnrollmentStatusSchema,
  type CourseDetail,
  type CourseListQuery,
  type CourseListResponse,
  type CourseSummary,
  type EnrollmentRequest,
  type EnrollmentResponse,
  type ExtendedEnrollmentStatus,
} from '@/features/courses/backend/schema';

export const ClientCourseListQuerySchema = CourseListQuerySchema;
export const ClientCourseListResponseSchema = CourseListResponseSchema;
export const ClientCourseSummarySchema = CourseSummarySchema;
export const ClientCourseDetailSchema = CourseDetailSchema;
export const ClientEnrollmentResponseSchema = EnrollmentResponseSchema;
export const ClientEnrollmentStatusSchema = EnrollmentStatusSchema;
export const ClientExtendedEnrollmentStatusSchema =
  ExtendedEnrollmentStatusSchema;

export type CourseListQueryDto = CourseListQuery;
export type CourseListResponseDto = CourseListResponse;
export type CourseSummaryDto = CourseSummary;
export type CourseDetailDto = CourseDetail;
export type EnrollmentResponseDto = EnrollmentResponse;
export type EnrollmentRequestDto = EnrollmentRequest;
export type ExtendedEnrollmentStatusDto = ExtendedEnrollmentStatus;
