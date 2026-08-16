import { statement } from "@/app/lib/cloud-db";
import {
  classifyJobFunctions,
  serializeJobFunctions,
} from "../../../src/lib/job-functions";
import {
  isValidDateOnly,
  normalizeManualJobInput,
  type ManualJobInput,
} from "../../../src/lib/manual-job";
import type { ActiveJobFilters } from "../../../src/lib/job-search";
import { nowDhakaIso } from "../../../src/lib/time";

export type AdminJob = {
  id: number;
  title: string;
  company: string;
  deadlineAt: string | null;
  detailUrl: string;
  canonicalUrl: string;
};

export type EditableJobField = "company" | "title" | "deadline";

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

type AdminJobListMode = "active" | "deleted";

async function getAdminJobsByMode(
  filters: ActiveJobFilters,
  mode: AdminJobListMode,
) {
  const conditions =
    mode === "active"
      ? ["expired_at IS NULL", "deleted_at IS NULL"]
      : ["deleted_at IS NOT NULL"];
  const values: unknown[] = [];

  if (filters.query) {
    const pattern = `%${escapeLike(filters.query.toLowerCase())}%`;
    conditions.push(`
      (
        LOWER(COALESCE(admin_title, title)) LIKE ? ESCAPE '\\'
        OR LOWER(COALESCE(admin_company, company)) LIKE ? ESCAPE '\\'
        OR LOWER(job_functions) LIKE ? ESCAPE '\\'
      )
    `);
    values.push(pattern, pattern, pattern);
  }

  if (filters.jobFunction) {
    conditions.push("instr(job_functions, ?) > 0");
    values.push(`|${filters.jobFunction}|`);
  }

  const result = await statement(
    `
        SELECT
          id,
          COALESCE(admin_title, title) AS title,
          COALESCE(admin_company, company) AS company,
          CASE
            WHEN admin_deadline_override = 1 THEN admin_deadline_at
            ELSE deadline_at
          END AS deadlineAt,
          detail_url AS detailUrl,
          canonical_url AS canonicalUrl
        FROM jobs
        WHERE ${conditions.join("\n          AND ")}
        ORDER BY ${mode === "deleted" ? "deleted_at DESC, id DESC" : "first_listed_at DESC, id DESC"}
    `,
    values,
  ).all<AdminJob>();

  return result.results;
}

export function getAdminJobs(filters: ActiveJobFilters) {
  return getAdminJobsByMode(filters, "active");
}

export function getDeletedAdminJobs(filters: ActiveJobFilters) {
  return getAdminJobsByMode(filters, "deleted");
}

export async function addManualJob(input: ManualJobInput) {
  const job = normalizeManualJobInput(input);
  const listedAt = nowDhakaIso();

  try {
    return await statement(
      `
        INSERT INTO jobs (
          title,
          company,
          detail_url,
          canonical_url,
          source_key,
          source_name,
          source_kind,
          source_priority,
          deadline_at,
          job_functions,
          first_seen_at,
          last_seen_at,
          first_listed_at
        )
        VALUES (?, ?, ?, ?, 'admin-manual', 'Dhaka Index Admin', 'manual', 0, ?, ?, ?, ?, ?)
      `,
      [
        job.title,
        job.company,
        job.detailUrl,
        job.detailUrl,
        job.deadlineAt,
        serializeJobFunctions(classifyJobFunctions(job.title)),
        listedAt,
        listedAt,
        listedAt,
      ],
    ).run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (/unique constraint failed:\s*jobs\.canonical_url/i.test(message)) {
      throw new Error("A job with that URL already exists.");
    }

    throw error;
  }
}

export async function updateAdminJobField(
  jobId: number,
  field: EditableJobField,
  rawValue: string,
  allowDeleted = false,
) {
  const editedAt = new Date().toISOString();
  const activeOnlyCondition = allowDeleted ? "" : "\n          AND deleted_at IS NULL";

  if (field === "deadline") {
    const value = rawValue.trim();

    if (value && !isValidDateOnly(value)) {
      throw new Error("Deadline must use YYYY-MM-DD format.");
    }

    return statement(
      `
        UPDATE jobs
        SET
          admin_deadline_at = ?,
          admin_deadline_override = 1,
          admin_edited_at = ?
        WHERE id = ?
          ${activeOnlyCondition}
      `,
      [value || null, editedAt, jobId],
    ).run();
  }

  const value = rawValue.trim();

  if (!value) {
    throw new Error(`${field === "title" ? "Role" : "Company"} cannot be empty.`);
  }

  if (value.length > 240) {
    throw new Error(`${field === "title" ? "Role" : "Company"} is too long.`);
  }

  const overrideColumn = field === "title" ? "admin_title" : "admin_company";
  const scrapedColumn = field === "title" ? "title" : "company";

  if (field === "title") {
    return statement(
      `
        UPDATE jobs
        SET
          admin_title = CASE WHEN ? = title THEN NULL ELSE ? END,
          job_functions = ?,
          admin_edited_at = ?
        WHERE id = ?
          ${activeOnlyCondition}
      `,
      [
        value,
        value,
        serializeJobFunctions(classifyJobFunctions(value)),
        editedAt,
        jobId,
      ],
    ).run();
  }

  return statement(
    `
      UPDATE jobs
      SET
        ${overrideColumn} = CASE WHEN ? = ${scrapedColumn} THEN NULL ELSE ? END,
        admin_edited_at = ?
      WHERE id = ?
        ${activeOnlyCondition}
    `,
    [value, value, editedAt, jobId],
  ).run();
}

export async function deleteAdminJob(jobId: number) {
  const deletedAt = new Date().toISOString();

  return statement(
    `
      UPDATE jobs
      SET
        deleted_at = ?,
        admin_edited_at = ?
      WHERE id = ?
        AND deleted_at IS NULL
    `,
    [deletedAt, deletedAt, jobId],
  ).run();
}

export async function recoverAdminJob(jobId: number) {
  const editedAt = new Date().toISOString();

  return statement(
    `
      UPDATE jobs
      SET
        deleted_at = NULL,
        admin_edited_at = ?
      WHERE id = ?
        AND deleted_at IS NOT NULL
    `,
    [editedAt, jobId],
  ).run();
}
