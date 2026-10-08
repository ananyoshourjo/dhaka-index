import { richTextToPlainText, sanitizeRichTextHtml } from "./rich-text";

export type DescriptionBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] };

const sectionHeading = /^(?:about (?:us|you|the (?:role|team)|this (?:role|job))|job (?:description(?:\s*\/\s*responsibilit(?:y|ies))?|context|purpose|location)|(?:(?:key|main) )?responsibilities(?: (?:and|&) context)?|requirements|qualifications|education(?:al (?:requirements|qualifications?))?|experience(?: requirements)?|professional experience|(?:required )?skills|additional (?:requirements|job requirements)|compensation(?: (?:and|&) other benefits)?|salary|benefits|employment status|position overview|how to apply|apply procedure|application (?:process|procedure)|what (?:you[’']ll do|we offer|you bring|we[’']re looking for))$/i;

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

  const blocks: DescriptionBlock[] = [];
  let blank = true;
  for (const raw of source.split("\n")) {
    const line = raw.trim();
    if (!line) { blank = true; continue; }
    const bullet = /^(?:[•●▪◦]\s*|[*–-]\s+|\d+[.)]\s+)(.+)$/.exec(line);
    const heading = line.replace(/^#{1,6}\s+/, "").replace(/:$/, "").replace(/_/g, " ").trim();
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
