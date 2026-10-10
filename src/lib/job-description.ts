import { richTextToPlainText, sanitizeRichTextHtml } from "./rich-text";

export type DescriptionBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] };

const sectionHeading = /^(?:about (?:us|you|the (?:role|team)|this (?:role|job))|job (?:description(?:\s*\/\s*responsibilit(?:y|ies))?|context|purpose|location)|(?:(?:key|main) )?responsibilities(?: (?:and|&) context)?|requirements|qualifications(?: (?:and|&) requirements)?|education(?:al (?:requirements|qualifications?))?|experience(?: requirements)?|professional experience|(?:required|preferred) skills|skills|additional (?:requirements|job requirements)|compensation(?: (?:and|&) other benefits)?|salary(?: (?:and|&) benefits)?|benefits|employment status|position overview|workplace|working hours|work arrangements|hiring process|interview process|how to apply|apply procedure|(?:the )?application (?:process|procedure)|what (?:you[’']ll do|we offer|you bring|we[’']re looking for))$/i;

/** Cleanup is a transformation, never a publication gate. */
export function cleanDescriptionText(value: string) {
  const lines = value.replace(/\r\n?/g, "\n").split("\n");
  const kept: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    const label = line.replace(/^(?:#{1,6}\s+|[•●▪◦]\s*)/, "");
    if (/^(?:\+\s*)?Contact Us Now$|^TO TOP$|^By using this website, you agree to our Cookie Policy/i.test(label)) break;
    if (/^(?:apply(?: now| online| here)?|application form|accept|privacy & cookies policy|home|jobs|description|\+)$/i.test(label)) continue;
    kept.push(raw);
  }
  return kept.join("\n")
    .replace(/(?:^|\n)Share:\s*\n(?:\s*(?:Facebook|LinkedIn|WhatsApp)\s*\n)+/gi, "\n")
    .replace(/(?:^|\n)Application Insights\s*\n\s*View(?:\n|$)/gi, "\n")
    .replace(/\n{3,}/g, "\n\n").trim();
}

export function normalizeJobDescription(value: string): DescriptionBlock[] {
  let source = value.replace(/\r\n?/g, "\n");
  if (/<\/?[a-z][^>]*>/i.test(source)) {
    source = source
      .replace(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi, "\n## $1\n")
      .replace(/<(?:strong|b)\b[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi, "**$1**")
      .replace(/<(?:em|i)\b[^>]*>([\s\S]*?)<\/(?:em|i)>/gi, "*$1*")
      .replace(/<ol\b[^>]*>([\s\S]*?)<\/ol>/gi, (_, list: string) => {
        let number = 0;
        return `<ol>${list.replace(/<li\b[^>]*>/gi, () => `<li>${++number}. `)}</ol>`;
      })
      .replace(/<li\b[^>]*>(?!\d+\. )/gi, "<li>• ")
      .replace(/<(?:p|div)\b[^>]*>/gi, "\n<p>")
      .replace(/<\/(?:ol|ul)>/gi, "$&\n");
    source = richTextToPlainText(sanitizeRichTextHtml(source));
  }

  source = cleanDescriptionText(source);
  const blocks: DescriptionBlock[] = [];
  let blank = true;
  for (const raw of source.split("\n")) {
    const line = raw.trim();
    if (!line) { blank = true; continue; }
    const bullet = /^(?:[•●▪◦]\s*|[*–-]\s+|\d+[.)]\s+)(.+)$/.exec(line);
    const heading = line.replace(/^#{1,6}\s+/, "").replace(/^\*\*(.*?)\*\*$/, "$1").replace(/:$/, "").replace(/_/g, " ").trim();
    const previous = blocks.at(-1);
    if (!bullet && (/^#{1,6}\s+/.test(line) || sectionHeading.test(heading) || (line.endsWith(":") && line.length < 90))) {
      blocks.push({ type: "heading", text: heading.charAt(0).toUpperCase() + heading.slice(1) });
    } else if (bullet) {
      const ordered = /^\d/.test(line);
      if (previous?.type === "list" && previous.ordered === ordered) previous.items.push(bullet[1]);
      else blocks.push({ type: "list", ordered, items: [bullet[1]] });
    } else if (!blank && previous?.type === "list") {
      previous.items[previous.items.length - 1] += ` ${line}`;
    } else if (!blank && previous?.type === "paragraph") {
      previous.text += ` ${line}`;
    } else {
      blocks.push({ type: "paragraph", text: line });
    }
    blank = false;
  }
  return blocks;
}

function blocksToText(blocks: DescriptionBlock[]) {
  return blocks.map(block => block.type === "heading" ? `## ${block.text}` : block.type === "paragraph" ? block.text : block.items.map((item, index) => `${block.ordered ? `${index + 1}.` : "•"} ${item}`).join("\n\n")).join("\n\n");
}

export function splitJobDescription(value: string, instructions?: string | null) {
  const description: DescriptionBlock[] = [];
  const application: DescriptionBlock[] = [];
  const hiring: DescriptionBlock[] = [];
  let target = description;
  for (const block of normalizeJobDescription(value)) {
    if (block.type === "heading") {
      if (/^(?:how to apply|apply procedure|application procedure)$/i.test(block.text)) { target = application; continue; }
      if (/^(?:(?:the )?application process|hiring process|interview process)$/i.test(block.text)) { target = hiring; continue; }
      if (sectionHeading.test(block.text)) target = description;
    }
    target.push(block);
  }
  const separate = instructions ? splitInstructions(instructions) : "";
  return {
    description: blocksToText(description),
    applicationInstructions: blocksToText(application) || separate || null,
    hiringProcess: blocksToText(hiring) || null,
  };
}

function splitInstructions(value: string) {
  const blocks = normalizeJobDescription(value);
  // Existing captures duplicated the interview stages under How to apply.
  if (blocks[0]?.type === "heading" && /^(?:(?:the )?application process|hiring process|interview process)$/i.test(blocks[0].text)) return "";
  return blocksToText(blocks);
}
