import { statement } from "@/app/lib/cloud-db";
import {
  classifyJobFunctions,
  serializeJobFunctions,
} from "../../../src/lib/job-functions";

export type AdminJob = {
  id: number;
  title: string;
  company: string;
  deadlineAt: string | null;
  detailUrl: string;
  canonicalUrl: string;
};

export type EditableJobField = "company" | "title" | "deadline";

function isValidDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export async function getAdminJobs() {
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
        WHERE expired_at IS NULL
          AND deleted_at IS NULL
        ORDER BY first_listed_at DESC, id DESC
    `,
  ).all<AdminJob>();

  return result.results;
}

export async function updateAdminJobField(
  jobId: number,
  field: EditableJobField,
  rawValue: string,
) {
  const editedAt = new Date().toISOString();

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
          AND deleted_at IS NULL
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
          AND deleted_at IS NULL
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
        AND deleted_at IS NULL
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
