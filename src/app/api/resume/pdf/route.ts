import { NextResponse } from "next/server";
import { chromium } from "playwright";

import type { ResumeContent, ResumeSectionKey } from "@/lib/resume";
import { defaultResumeSectionOrder } from "@/lib/resume";
import { sanitizeLocalPhoto } from "@/lib/photo";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
const MAX_REQUEST_BYTES = 1024 * 1024;
const MAX_CONCURRENT_PDF_JOBS = 2;
let activePdfJobs = 0;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function contactLink(text: string, href: string) {
  let safeHref = "";

  try {
    const url = new URL(href);

    if (["https:", "mailto:", "tel:"].includes(url.protocol)) {
      safeHref = url.toString();
    }
  } catch {
    safeHref = "";
  }

  return safeHref
    ? `<a class="link" href="${escapeHtml(safeHref)}">${escapeHtml(text)}</a>`
    : escapeHtml(text);
}

function linkedinHref(value: string) {
  return `https://linkedin.com/${value.replace(/^\/+/, "")}`;
}

function sanitizeResumeForPdf(resume: ResumeContent): ResumeContent {
  return {
    ...resume,
    contact: {
      ...resume.contact,
      photoUrl: sanitizeLocalPhoto(resume.contact.photoUrl),
    },
  };
}

function normalizeSectionOrder(order: unknown): ResumeSectionKey[] {
  const current = Array.isArray(order) ? order : [];
  const next = current.filter((section): section is ResumeSectionKey =>
    defaultResumeSectionOrder.includes(section as ResumeSectionKey),
  );

  if (next.length === 0) {
    return [...defaultResumeSectionOrder];
  }

  defaultResumeSectionOrder.forEach((section, index) => {
    if (next.includes(section)) {
      return;
    }

    let previousSection: ResumeSectionKey | undefined;

    for (
      let previousIndex = index - 1;
      previousIndex >= 0;
      previousIndex -= 1
    ) {
      const candidate = defaultResumeSectionOrder[previousIndex];

      if (next.includes(candidate)) {
        previousSection = candidate;
        break;
      }
    }

    const previousIndex = previousSection ? next.indexOf(previousSection) : -1;
    next.splice(previousIndex + 1, 0, section);
  });

  return next;
}

function section(title: string, body: string) {
  if (!body) {
    return "";
  }

  return `
    <section>
      <h3>${escapeHtml(title)}</h3>
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
  sectionOrder: ResumeSectionKey[],
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

  const projects = (resume.projects ?? [])
    .filter((item) => item.included)
    .map(
      (item, index) => `
        <div class="block">
          <div class="row strong">
            <p>${index + 1}. ${escapeHtml(item.title)}</p>
            <p>${escapeHtml(item.dates)}</p>
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
  const achievements = resume.achievements.filter((item) => item.included);
  const activities = resume.activities.filter((item) => item.included);
  const skills = resume.skills.filter((item) => item.included);
  const references = resume.references.filter((item) => item.included);

  const bodies: Record<ResumeSectionKey, string> = {
    workExperience: section("Work Experience", work),
    projects: section("Projects", projects),
    education: section(
      "Education",
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
    achievements: section(
      "Achievements",
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
      "Extracurricular Activities",
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
      "Skills",
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
      "References",
      references.length
        ? `
          <div class="references">
            ${references
              .map(
                (item) => `
                  <div>
                    <p class="strong">${escapeHtml(item.name)}</p>
                    <p class="strong">${escapeHtml(item.title)}, ${escapeHtml(item.organization)}</p>
                    <p><span class="link">${escapeHtml(item.email)}</span> | <span class="link">${escapeHtml(item.phone)}</span></p>
                  </div>
                `,
              )
              .join("")}
          </div>
        `
        : "",
    ),
  };

  const contact = resume.contact;
  const website = contact.website
    ? ` | Website: ${contactLink(contact.website, contact.website)}`
    : "";

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
          .link { color: #1447e6; text-decoration: underline; }
          h3 { break-after: avoid; }
          .block, tr, .references > div { break-inside: avoid; }
        </style>
      </head>
      <body>
        <main>
          <header>
            <div>
              <h2>${escapeHtml(contact.name)}</h2>
              <p class="contact">
                Phone: ${contactLink(contact.phone, `tel:${contact.phone}`)}
                | Email: ${contactLink(contact.email, `mailto:${contact.email}`)}
                | LinkedIn: ${contactLink(contact.linkedin, linkedinHref(contact.linkedin))}${website}
              </p>
              ${
                resume.summary.included
                  ? `<p class="summary">${escapeHtml(resume.summary.value)}</p>`
                  : ""
              }
            </div>
            ${
              contact.photoUrl
                ? `<img class="photo" src="${escapeHtml(contact.photoUrl)}" alt="" />`
                : `<div class="photo"></div>`
            }
          </header>
          <div class="sections">
            ${sectionOrder.map((key) => bodies[key]).join("")}
          </div>
        </main>
      </body>
    </html>
  `;
}

function buildCoverLetterHtml(resume: ResumeContent) {
  const coverLetter = resume.coverLetter;
  const recipientLines = [
    coverLetter?.recipientName,
    coverLetter?.recipientTitle,
    coverLetter?.company,
    ...(coverLetter?.address ?? "").split("\n"),
  ]
    .filter((line): line is string => Boolean(line?.trim()))
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
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
    resume.contact.phone,
    resume.contact.email,
    resume.contact.linkedin,
  ]
    .filter(Boolean)
    .map(escapeHtml)
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
          .letter { margin-top: .42in; }
          .recipient { margin-top: .28in; }
          .salutation { margin-top: .28in; }
          .body { display: grid; gap: .18in; margin-top: .22in; }
          .closing { margin-top: .32in; }
          .signature { margin-top: .34in; font-weight: 700; }
        </style>
      </head>
      <body>
        <main>
          <header>
            <h1>${escapeHtml(resume.contact.name)}</h1>
            ${contactLine ? `<p class="contact">${contactLine}</p>` : ""}
          </header>
          <div class="letter">
            ${coverLetter?.date ? `<p>${escapeHtml(coverLetter.date)}</p>` : ""}
            ${recipientLines ? `<div class="recipient">${recipientLines}</div>` : ""}
            <p class="salutation">${escapeHtml(coverLetter?.salutation || "Dear Hiring Manager,")}</p>
            <div class="body">${body}</div>
            <div class="closing">
              <p>${escapeHtml(coverLetter?.closing || "Sincerely,")}</p>
              <p class="signature">${escapeHtml(resume.contact.name)}</p>
            </div>
          </div>
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

  if (activePdfJobs >= MAX_CONCURRENT_PDF_JOBS) {
    return NextResponse.json(
      { error: "PDF generation is busy. Try again shortly." },
      { status: 429 },
    );
  }

  let payload: {
    document?: "resume" | "coverLetter";
    resume?: ResumeContent;
    sectionOrder?: ResumeSectionKey[];
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
      sectionOrder?: ResumeSectionKey[];
    };
  } catch {
    return NextResponse.json(
      { error: "Invalid resume payload." },
      { status: 400 },
    );
  }

  let pdfSlotAcquired = false;

  try {
    if (!payload.resume) {
      return NextResponse.json({ error: "Missing resume." }, { status: 400 });
    }

    activePdfJobs += 1;
    pdfSlotAcquired = true;
    const resume = sanitizeResumeForPdf(payload.resume);
    const browser = await chromium.launch({ headless: true });

    try {
      const page = await browser.newPage({ javaScriptEnabled: false });
      await page.route("http://**/*", (route) => route.abort());
      await page.route("https://**/*", (route) => route.abort());
      page.setDefaultTimeout(15_000);
      const requestedDocument = payload.document ?? "resume";
      await page.setContent(
        requestedDocument === "coverLetter"
          ? buildCoverLetterHtml(resume)
          : buildResumeHtml(
              resume,
              normalizeSectionOrder(payload.sectionOrder),
            ),
        { waitUntil: "load", timeout: 15_000 },
      );
      const pdf = await page.pdf({
        format: "Letter",
        preferCSSPageSize: true,
        printBackground: true,
        margin: { bottom: "0", left: "0", right: "0", top: "0" },
      });

      return new Response(new Uint8Array(pdf), {
        headers: {
          "Content-Disposition":
            requestedDocument === "coverLetter"
              ? 'attachment; filename="cover-letter.pdf"'
              : 'attachment; filename="resume.pdf"',
          "Content-Type": "application/pdf",
          "Cache-Control": "no-store",
        },
      });
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error("Failed to generate resume PDF", error);
    return NextResponse.json(
      { error: "Could not generate the resume PDF." },
      { status: 500 },
    );
  } finally {
    if (pdfSlotAcquired) {
      activePdfJobs -= 1;
    }
  }
}
