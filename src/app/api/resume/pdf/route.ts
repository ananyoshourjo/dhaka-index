import { NextResponse } from "next/server";

import type {
  ResumeContent,
  ResumePublicationStatus,
  ResumeSectionId,
  ResumeSectionKey,
} from "@/lib/resume";
import {
  hasResumeContent,
  isResumeSectionKey,
  normalizeResumeCustomSections,
  normalizeResumeSectionOrder,
  normalizeResumeSectionTitles,
} from "@/lib/resume-schema";
import { getCloudflareEnv } from "@/lib/cloudflare";
import { getProfilePhotoDataUrl } from "@/lib/profile-photo";
import { normalizeResumeLink } from "@/lib/resume-links";
import { getSession } from "@/lib/session";

const MAX_REQUEST_BYTES = 1024 * 1024;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function contactLink(text: string, href: string) {
  let safeHref = "";
  const normalized = href.trim();
  const candidate = normalized.startsWith("//")
    ? `https:${normalized}`
    : /^[a-z][a-z\d+.-]*:/i.test(normalized)
      ? normalized
      : `https://${normalized}`;

  try {
    const url = new URL(candidate);

    if (["http:", "https:", "mailto:", "tel:"].includes(url.protocol)) {
      safeHref = url.toString();
    }
  } catch {
    safeHref = "";
  }

  return safeHref
    ? `<a class="link" href="${escapeHtml(safeHref)}">${escapeHtml(text)}</a>`
    : escapeHtml(text);
}

function externalLink(text: string, href: string) {
  const safeHref = normalizeResumeLink(href);

  return safeHref
    ? `<a class="link" href="${escapeHtml(safeHref)}">${escapeHtml(text)}</a>`
    : escapeHtml(text);
}

function publicationStatusLabel(status: ResumePublicationStatus) {
  if (status === "inPress") {
    return "In press";
  }

  if (status === "underReview") {
    return "Under review";
  }

  return "";
}

function linkedinHref(value: string) {
  return `https://linkedin.com/${value.replace(/^\/+/, "")}`;
}

function sanitizeResumeForPdf(
  resume: ResumeContent,
  photoUrl: string,
): ResumeContent {
  const customSections = normalizeResumeCustomSections(resume.customSections);

  return {
    ...resume,
    sectionTitles: normalizeResumeSectionTitles(resume.sectionTitles),
    customSections,
    sectionOrder: normalizeResumeSectionOrder(
      resume.sectionOrder,
      customSections.map((section) => section.id),
    ),
    contact: {
      ...resume.contact,
      photoUrl,
    },
  };
}

function section(title: string, body: string) {
  if (!body) {
    return "";
  }

  return `
    <section>
      ${title.trim() ? `<h3>${escapeHtml(title)}</h3>` : ""}
      ${body}
    </section>
  `;
}

function pairRows<T>(items: T[]) {
  const rows: Array<[T, T | null]> = [];

  for (let index = 0; index < items.length; index += 2) {
    rows.push([items[index], items[index + 1] ?? null]);
  }

  return rows;
}

function renderPlaceAndDates(place: string | undefined, dates: string) {
  const safePlace = place ? escapeHtml(place) : "";
  const safeDates = escapeHtml(dates);

  if (!safePlace) {
    return safeDates;
  }

  return `<span class="normal">${safePlace}</span>${safeDates ? " · " : ""}${safeDates}`;
}

function buildResumeHtml(
  resume: ResumeContent,
  sectionOrder: ResumeSectionId[],
) {
  const work = resume.workExperience
    .filter((item) => item.included)
    .map(
      (item, index) => `
        <div class="block">
          <div class="row strong">
            <p>${index + 1}. ${escapeHtml(item.role)} - <em>${escapeHtml(item.company)}</em></p>
            <p>${renderPlaceAndDates(item.place, item.dates)}</p>
          </div>
          <ul>
            ${item.bullets
              .filter((bullet) => bullet.included && bullet.text)
              .map((bullet) => `<li>${escapeHtml(bullet.text)}</li>`)
              .join("")}
          </ul>
        </div>
      `,
    )
    .join("");

  const education = resume.education.filter((item) => item.included);
  const publications = (resume.publications ?? []).filter(
    (item) => item.included,
  );
  const certifications = (resume.certifications ?? []).filter(
    (item) => item.included,
  );
  const achievements = resume.achievements.filter((item) => item.included);
  const activities = resume.activities.filter((item) => item.included);
  const skills = resume.skills.filter((item) => item.included);
  const references = resume.references.filter((item) => item.included);
  const customSections = normalizeResumeCustomSections(resume.customSections);

  const bodies: Record<ResumeSectionKey, string> = {
    workExperience: section(resume.sectionTitles.workExperience, work),
    education: section(
      resume.sectionTitles.education,
      education.length
        ? `
          <table>
            <thead><tr><th>Year</th><th>Degree</th><th>Concentration</th><th>Institution</th><th>Result</th></tr></thead>
            <tbody>
              ${education
                .map(
                  (item) => `
                    <tr>
                      <td>${escapeHtml(item.year)}</td>
                      <td>${escapeHtml(item.degree)}</td>
                      <td>${escapeHtml(item.concentration)}</td>
                      <td>${escapeHtml(item.institution)}</td>
                      <td>${escapeHtml(item.result)}</td>
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>
        `
        : "",
    ),
    publications: section(
      resume.sectionTitles.publications,
      publications
        .map((item) => {
          const statusLabel = publicationStatusLabel(item.status);
          const title = item.title
            ? item.url
              ? contactLink(item.title, item.url)
              : escapeHtml(item.title)
            : "";
          const titleSuffix = statusLabel
            ? ` <span class="normal">(${escapeHtml(statusLabel)})</span>`
            : "";
          const venue = [
            item.venue ? `<em>${escapeHtml(item.venue)}</em>` : "",
            item.details ? escapeHtml(item.details) : "",
          ]
            .filter(Boolean)
            .join(", ");

          return `
            <div class="block">
              <div class="row strong">
                <p>${title}${titleSuffix}</p>
                <p>${escapeHtml(item.date)}</p>
              </div>
              ${item.authors ? `<p>${escapeHtml(item.authors)}</p>` : ""}
              ${venue ? `<p>${venue}</p>` : ""}
            </div>
          `;
        })
        .join(""),
    ),
    certifications: section(
      resume.sectionTitles.certifications,
      certifications
        .map((item) => {
          const dateLabel = item.status === "inProgress" ? "Expected" : "Issued";
          const metadata = [
            item.expirationDate
              ? `Expires: ${escapeHtml(item.expirationDate)}`
              : "",
            item.credentialId
              ? `Credential ID: ${escapeHtml(item.credentialId)}`
              : "",
            item.credentialUrl
              ? `Credential: ${contactLink(item.credentialUrl, item.credentialUrl)}`
              : "",
          ]
            .filter(Boolean)
            .join(" · ");

          return `
            <div class="block">
              <div class="row strong">
                <p>${escapeHtml(item.name)}${item.status === "inProgress" ? " (in progress)" : ""}</p>
                <p>${item.issueDate ? `${dateLabel}: ${escapeHtml(item.issueDate)}` : ""}</p>
              </div>
              <p><em>${escapeHtml(item.issuer)}</em></p>
              ${metadata ? `<p class="certification-meta">${metadata}</p>` : ""}
            </div>
          `;
        })
        .join(""),
    ),
    achievements: section(
      resume.sectionTitles.achievements,
      achievements.length
        ? `
          <table>
            <thead><tr><th>Competition</th><th>Position</th><th>Competition</th><th>Position</th></tr></thead>
            <tbody>
              ${pairRows(achievements)
                .map(
                  ([left, right]) => `
                    <tr>
                      <td>${escapeHtml(left.competition)}</td>
                      <td>${escapeHtml(left.position)}</td>
                      <td>${right ? escapeHtml(right.competition) : ""}</td>
                      <td>${right ? escapeHtml(right.position) : ""}</td>
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>
        `
        : "",
    ),
    activities: section(
      resume.sectionTitles.activities,
      activities
        .map(
          (item, index) => `
            <div class="block">
              <div class="row strong">
                <p>${index + 1}. ${escapeHtml(item.role)} - <em>${escapeHtml(item.organization)}</em></p>
                <p>${escapeHtml(item.dates)}</p>
              </div>
              <ul>
                ${(item.bullets ?? [])
                  .filter((bullet) => bullet.included && bullet.text)
                  .map((bullet) => `<li>${escapeHtml(bullet.text)}</li>`)
                  .join("")}
              </ul>
            </div>
          `,
        )
        .join(""),
    ),
    skills: section(
      resume.sectionTitles.skills,
      skills
        .map(
          (item) => `
            <div class="block">
              <p class="strong">${escapeHtml(item.title)}</p>
              <p>${escapeHtml(item.value)}</p>
            </div>
          `,
        )
        .join(""),
    ),
    references: section(
      resume.sectionTitles.references,
      references.length
        ? `
          <div class="references">
            ${references
              .map(
                (item) => `
                  <div>
                    <p class="strong">${escapeHtml(item.name)}</p>
                    <p class="strong">${escapeHtml(item.title)}, ${escapeHtml(item.organization)}</p>
                    <p>${
                      item.email
                        ? contactLink(item.email, `mailto:${item.email}`)
                        : ""
                    }${item.email && item.phone ? " | " : ""}${
                      item.phone
                        ? contactLink(item.phone, `tel:${item.phone}`)
                        : ""
                    }</p>
                  </div>
                `,
              )
              .join("")}
          </div>
        `
        : "",
    ),
  };

  const customBodies: Record<string, string> = Object.fromEntries(
    customSections.map((customSection) => {
      const body = customSection.entries
        .filter((item) => item.included)
        .map((item) => {
          const link = item.link.trim();
          const heading = [
            item.heading ? escapeHtml(item.heading) : "",
            item.subheading ? `<em>${escapeHtml(item.subheading)}</em>` : "",
            link
              ? `<em>${externalLink(link, link)}</em>`
              : "",
          ]
            .filter(Boolean)
            .join(" - ");
          const visibleBullets = item.bullets.filter(
            (bullet) => bullet.included && bullet.text,
          );
          const content = item.useBullets
            ? visibleBullets.length
              ? `<ul>${visibleBullets
                  .map((bullet) => `<li>${escapeHtml(bullet.text)}</li>`)
                  .join("")}</ul>`
              : ""
            : item.description
              ? `<p>${escapeHtml(item.description).replaceAll("\n", "<br />")}</p>`
              : "";

          return `
            <div class="block">
              <div class="row strong">
                <p>${heading}</p>
                <p>${renderPlaceAndDates(item.place, item.dates)}</p>
              </div>
              ${content}
            </div>
          `;
        })
        .join("");

      return [customSection.id, section(customSection.title, body)];
    }),
  );

  const contact = resume.contact;
  const hasContent = hasResumeContent(resume);
  const contactLine = [
    contact.phone
      ? `Phone: ${contactLink(contact.phone, `tel:${contact.phone}`)}`
      : "",
    contact.email
      ? `Email: ${contactLink(contact.email, `mailto:${contact.email}`)}`
      : "",
    contact.linkedin
      ? `LinkedIn: ${contactLink(
          contact.linkedin,
          linkedinHref(contact.linkedin),
        )}`
      : "",
    contact.website
      ? `Website: ${contactLink(contact.website, contact.website)}`
      : "",
  ]
    .filter(Boolean)
    .join(" | ");

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page { size: letter; margin: .25in; }
          * { box-sizing: border-box; }
          body { margin: 0; font-family: Arial, sans-serif; color: #000; }
          main {
            width: 100%;
          }
          header { display: grid; grid-template-columns: 1fr 1.28in; gap: .25in; }
          .header-no-photo { display: block; }
          h2 { margin: 0; font-size: 18px; line-height: 1.2; text-transform: uppercase; }
          h3 { margin: 0 0 7px; border-bottom: 2px solid #000; padding-bottom: 2px; font-size: 13px; line-height: 1; text-transform: uppercase; }
          p { margin: 0; }
          .contact { margin-top: 6px; font-size: 11.5px; line-height: 1.15; }
          .summary { margin-top: 15px; max-width: 6.35in; font-size: 11.5px; line-height: 1.18; }
          .photo { width: 1.28in; height: 1.55in; border: 1px solid #000; object-fit: cover; }
          .sections { display: grid; gap: 9px; margin-top: 12px; font-size: 11.5px; line-height: 1.18; }
          .block { display: grid; }
          .block + .block { margin-top: 7px; }
          .row { display: grid; grid-template-columns: 1fr auto; gap: 16px; }
          .strong { font-weight: 700; }
          .normal { font-weight: 400; }
          em { font-weight: 400; }
          ul { margin: 4px 0 0 .3in; padding-left: .16in; }
          li { padding-left: .02in; }
          table { width: 100%; border-collapse: collapse; text-align: center; font-size: 11px; line-height: 1.2; }
          th, td { border: 1px solid #000; padding: 3px 8px; }
          th { font-weight: 700; }
          .references { display: grid; grid-template-columns: repeat(2, 1fr); border: 1px solid #000; font-size: 11px; line-height: 1.2; }
          .references > div { padding: 7px; border-right: 1px solid #000; }
          .references > div:last-child { border-right: 0; }
          .certification-meta { font-size: 10.5px; }
          .link { color: #1447e6; text-decoration: underline; }
          h3 { break-after: avoid; }
          .block, tr, .references > div { break-inside: avoid; }
        </style>
      </head>
      <body>
        <main>
          ${
            hasContent
              ? `
                <header class="${contact.photoUrl ? "" : "header-no-photo"}">
                  <div>
                    ${contact.name ? `<h2>${escapeHtml(contact.name)}</h2>` : ""}
                    ${contactLine ? `<p class="contact">${contactLine}</p>` : ""}
                    ${
                      resume.summary.included && resume.summary.value.trim()
                        ? `<p class="summary">${escapeHtml(resume.summary.value)}</p>`
                        : ""
                    }
                  </div>
                  ${
                    contact.photoUrl
                      ? `<img class="photo" src="${escapeHtml(contact.photoUrl)}" alt="" />`
                      : ""
                  }
                </header>
                <div class="sections">
                  ${sectionOrder
                    .map((key) =>
                      isResumeSectionKey(key)
                        ? bodies[key]
                        : customBodies[key] ?? "",
                    )
                    .join("")}
                </div>
              `
              : ""
          }
        </main>
      </body>
    </html>
  `;
}

function buildCoverLetterHtml(resume: ResumeContent) {
  const coverLetter = resume.coverLetter;
  const body = (coverLetter?.body ?? "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map(
      (paragraph) =>
        `<p>${escapeHtml(paragraph).replaceAll("\n", "<br />")}</p>`,
    )
    .join("");
  const contactLine = [
    resume.contact.phone
      ? contactLink(resume.contact.phone, `tel:${resume.contact.phone}`)
      : "",
    resume.contact.email
      ? contactLink(resume.contact.email, `mailto:${resume.contact.email}`)
      : "",
    resume.contact.linkedin
      ? contactLink(
          resume.contact.linkedin,
          linkedinHref(resume.contact.linkedin),
        )
      : "",
  ]
    .filter(Boolean)
    .join(" | ");

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page { size: letter; margin: 0; }
          * { box-sizing: border-box; }
          body { margin: 0; color: #111; font-family: Arial, Helvetica, sans-serif; }
          main { width: 8.5in; height: 11in; overflow: hidden; padding: 1in; font-size: 11pt; line-height: 1.45; }
          header { border-bottom: 1px solid #d4d4d4; padding-bottom: .18in; }
          h1 { margin: 0; font-size: 17pt; line-height: 1.2; letter-spacing: .01em; }
          p { margin: 0; }
          .contact { margin-top: .06in; color: #404040; font-size: 9.5pt; }
          .link { color: #1447e6; text-decoration: underline; }
          .body { display: grid; gap: .18in; margin-top: .42in; }
        </style>
      </head>
      <body>
        <main>
          <header>
            <h1>${escapeHtml(resume.contact.name)}</h1>
            ${contactLine ? `<p class="contact">${contactLine}</p>` : ""}
          </header>
          <div class="body">${body}</div>
        </main>
      </body>
    </html>
  `;
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const declaredLength = Number(request.headers.get("content-length") || 0);

  if (declaredLength > MAX_REQUEST_BYTES) {
    return NextResponse.json(
      { error: "The resume payload is too large." },
      { status: 413 },
    );
  }

  let payload: {
    document?: "resume" | "coverLetter";
    resume?: ResumeContent;
    sectionOrder?: ResumeSectionId[];
  };

  try {
    const rawBody = await request.text();

    if (Buffer.byteLength(rawBody, "utf8") > MAX_REQUEST_BYTES) {
      return NextResponse.json(
        { error: "The resume payload is too large." },
        { status: 413 },
      );
    }

    payload = JSON.parse(rawBody) as {
      document?: "resume" | "coverLetter";
      resume?: ResumeContent;
      sectionOrder?: ResumeSectionId[];
    };
  } catch {
    return NextResponse.json(
      { error: "Invalid resume payload." },
      { status: 400 },
    );
  }

  try {
    if (!payload.resume) {
      return NextResponse.json({ error: "Missing resume." }, { status: 400 });
    }

    const resume = sanitizeResumeForPdf(
      payload.resume,
      await getProfilePhotoDataUrl(session.user.id),
    );
    const requestedDocument = payload.document ?? "resume";
    const html =
      requestedDocument === "coverLetter"
        ? buildCoverLetterHtml(resume)
        : buildResumeHtml(
            resume,
            normalizeResumeSectionOrder(
              payload.sectionOrder ?? resume.sectionOrder,
              resume.customSections.map((section) => section.id),
            ),
          );
    const pdf = await getCloudflareEnv().BROWSER.quickAction("pdf", {
      html,
      pdfOptions: {
        format: "letter",
        preferCSSPageSize: true,
        printBackground: true,
        margin: { bottom: "0", left: "0", right: "0", top: "0" },
      },
    });

    if (!pdf.ok) {
      throw new Error(`Browser Rendering returned HTTP ${pdf.status}.`);
    }

    return new Response(pdf.body, {
      headers: {
        "Content-Disposition":
          requestedDocument === "coverLetter"
            ? 'attachment; filename="cover-letter.pdf"'
            : 'attachment; filename="resume.pdf"',
        "Content-Type": "application/pdf",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to generate resume PDF", error);
    return NextResponse.json(
      { error: "Could not generate the resume PDF." },
      { status: 500 },
    );
  }
}
