const allowedTags = new Set([
  "a",
  "b",
  "br",
  "div",
  "em",
  "i",
  "li",
  "ol",
  "p",
  "s",
  "span",
  "strong",
  "u",
  "ul",
]);

const dangerousTags = new Set([
  "applet",
  "base",
  "embed",
  "form",
  "iframe",
  "img",
  "input",
  "link",
  "meta",
  "object",
  "script",
  "style",
  "svg",
  "textarea",
  "video",
]);

const allowedProtocols = new Set(["http:", "https:", "mailto:", "tel:"]);
const allowedStyleProperties = new Set([
  "font-style",
  "font-weight",
  "text-align",
  "text-decoration",
]);
const allowedAlignments = new Set(["left", "center", "right", "justify"]);

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function decodeSafeEntities(value: string) {
  return value
    .replaceAll(/&#x27;|&#39;/gi, "'")
    .replaceAll(/&quot;/gi, '"')
    .replaceAll(/&apos;/gi, "'")
    .replaceAll(/&gt;/gi, ">")
    .replaceAll(/&lt;/gi, "<")
    .replaceAll(/&amp;/gi, "&")
    .replaceAll(/&#(\d+);/g, (match, code: string) => {
      const value = Number(code);
      return Number.isSafeInteger(value) ? String.fromCodePoint(value) : match;
    })
    .replaceAll(/&#x([\da-f]+);/gi, (match, code: string) => {
      const value = Number.parseInt(code, 16);
      return Number.isSafeInteger(value) ? String.fromCodePoint(value) : match;
    });
}

function safeHref(value: string) {
  const normalized = decodeSafeEntities(value).trim();

  if (!normalized || normalized.startsWith("#")) {
    return "";
  }

  const candidate = normalized.startsWith("//")
    ? `https:${normalized}`
    : normalized;

  try {
    const url = new URL(candidate, "https://dhaka-index.invalid");

    if (!allowedProtocols.has(url.protocol)) {
      return "";
    }

    return normalized;
  } catch {
    return "";
  }
}

function safeStyle(value: string, alignmentHint = "") {
  const declarations = new Map<string, string>();
  const source = alignmentHint
    ? `${value};text-align:${alignmentHint}`
    : value;

  source.split(";").forEach((declaration) => {
    const separator = declaration.indexOf(":");

    if (separator < 0) {
      return;
    }

    const property = declaration.slice(0, separator).trim().toLowerCase();
    const propertyValue = declaration.slice(separator + 1).trim().toLowerCase();

    if (!allowedStyleProperties.has(property) || !propertyValue) {
      return;
    }

    if (property === "text-align") {
      if (allowedAlignments.has(propertyValue)) {
        declarations.set(property, propertyValue);
      }
      return;
    }

    if (property === "font-weight") {
      if (/^(?:normal|bold|[1-9]00)$/.test(propertyValue)) {
        declarations.set(property, propertyValue);
      }
      return;
    }

    if (property === "font-style") {
      if (/^(?:normal|italic|oblique)$/.test(propertyValue)) {
        declarations.set(property, propertyValue);
      }
      return;
    }

    if (/^(?:none|underline|line-through|overline)$/.test(propertyValue)) {
      declarations.set(property, propertyValue);
    }
  });

  return Array.from(declarations.entries())
    .map(([property, propertyValue]) => `${property}: ${propertyValue};`)
    .join(" ");
}

function isRichTextElement(value: string) {
  return /<\/?(?:a|b|br|div|em|i|li|ol|p|s|span|strong|u|ul)(?:\s|\/?>)/i.test(
    value,
  );
}

function sanitizeWithDomParser(value: string) {
  const parsed = new DOMParser().parseFromString(value, "text/html");

  const unwrap = (element: Element) => {
    const parent = element.parentNode;

    if (!parent) {
      element.remove();
      return;
    }

    while (element.firstChild) {
      parent.insertBefore(element.firstChild, element);
    }

    element.remove();
  };

  const sanitizeNode = (node: Node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const element = node as Element;
    const tagName = element.tagName.toLowerCase();

    if (!allowedTags.has(tagName)) {
      if (dangerousTags.has(tagName)) {
        element.remove();
      } else {
        Array.from(element.childNodes).forEach(sanitizeNode);
        unwrap(element);
      }
      return;
    }

    const align = element.getAttribute("align") ?? "";
    const style = safeStyle(element.getAttribute("style") ?? "", align);
    const href = tagName === "a" ? safeHref(element.getAttribute("href") ?? "") : "";

    Array.from(element.attributes).forEach((attribute) => {
      element.removeAttribute(attribute.name);
    });

    if (style) {
      element.setAttribute("style", style);
    }

    if (tagName === "a") {
      if (!href) {
        Array.from(element.childNodes).forEach(sanitizeNode);
        unwrap(element);
        return;
      }

      element.setAttribute("href", href);
      element.setAttribute("target", "_blank");
      element.setAttribute("rel", "noreferrer");
    }

    Array.from(element.childNodes).forEach(sanitizeNode);
  };

  Array.from(parsed.body.childNodes).forEach(sanitizeNode);
  return parsed.body.innerHTML;
}

function readAttribute(attributes: string, name: string) {
  const matcher = new RegExp(
    `(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>]+))`,
    "i",
  );
  const match = attributes.match(matcher);
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? "";
}

function sanitizeWithoutDomParser(value: string) {
  const tokenPattern = /<!--[\s\S]*?-->|<\/?([a-z][\w:-]*)([^>]*)>/gi;
  const stack: Array<{
    mode: "allowed" | "blocked" | "unwrap";
    tagName: string;
  }> = [];
  const findLastStackIndex = (
    predicate: (entry: (typeof stack)[number]) => boolean,
  ) => {
    for (let index = stack.length - 1; index >= 0; index -= 1) {
      if (predicate(stack[index])) {
        return index;
      }
    }

    return -1;
  };
  let output = "";
  let lastIndex = 0;

  for (const match of value.matchAll(tokenPattern)) {
    const index = match.index ?? 0;
    if (!stack.some((entry) => entry.mode === "blocked")) {
      output += escapeHtml(decodeSafeEntities(value.slice(lastIndex, index)));
    }
    lastIndex = index + match[0].length;

    if (match[0].startsWith("<!--")) {
      continue;
    }

    const tagName = match[1].toLowerCase();
    const isClosing = match[0].startsWith("</");

    if (stack.some((entry) => entry.mode === "blocked")) {
      if (isClosing && dangerousTags.has(tagName)) {
        const blockedIndex = findLastStackIndex(
          (entry) => entry.mode === "blocked" && entry.tagName === tagName,
        );

        if (blockedIndex >= 0) {
          stack.splice(blockedIndex, 1);
        }
      } else if (!isClosing && dangerousTags.has(tagName)) {
        stack.push({ mode: "blocked", tagName });
      }
      continue;
    }

    if (isClosing) {
      const closingIndex = findLastStackIndex(
        (entry) => entry.tagName === tagName,
      );

      if (closingIndex < 0) {
        continue;
      }

      const [entry] = stack.splice(closingIndex, 1);

      if (entry.mode === "allowed" && tagName !== "br") {
        output += `</${tagName}>`;
      }
      continue;
    }

    if (dangerousTags.has(tagName)) {
      stack.push({ mode: "blocked", tagName });
      continue;
    }

    if (!allowedTags.has(tagName)) {
      if (!/\/\s*>$/.test(match[0])) {
        stack.push({ mode: "unwrap", tagName });
      }
      continue;
    }

    const href = tagName === "a" ? safeHref(readAttribute(match[2], "href")) : "";
    const alignmentHint = readAttribute(match[2], "align");
    const style = safeStyle(readAttribute(match[2], "style"), alignmentHint);
    const attributes = [
      href ? `href="${escapeHtml(href)}"` : "",
      href ? 'target="_blank" rel="noreferrer"' : "",
      style ? `style="${escapeHtml(style)}"` : "",
    ]
      .filter(Boolean)
      .join(" ");

    if (tagName === "a" && !href) {
      stack.push({ mode: "unwrap", tagName });
      continue;
    }

    output += `<${tagName}${attributes ? ` ${attributes}` : ""}>`;

    if (tagName !== "br" && !/\/\s*>$/.test(match[0])) {
      stack.push({ mode: "allowed", tagName });
    }
  }

  if (!stack.some((entry) => entry.mode === "blocked")) {
    output += escapeHtml(decodeSafeEntities(value.slice(lastIndex)));
  }

  return output;
}

export function sanitizeRichTextHtml(value: string) {
  if (typeof DOMParser !== "undefined") {
    return sanitizeWithDomParser(value);
  }

  return sanitizeWithoutDomParser(value);
}

export function plainTextToRichText(value: string) {
  const normalized = value.replace(/\r\n?/g, "\n").trim();

  if (!normalized) {
    return "";
  }

  return normalized
    .split(/\n\s*\n/)
    .map(
      (paragraph) =>
        `<p>${escapeHtml(paragraph.trim()).replaceAll("\n", "<br />")}</p>`,
    )
    .filter(Boolean)
    .join("");
}

export function normalizeRichTextHtml(value: string) {
  if (!value.trim()) {
    return "";
  }

  return isRichTextElement(value)
    ? sanitizeRichTextHtml(value)
    : plainTextToRichText(value);
}

export function richTextToPlainText(value: string) {
  if (typeof DOMParser !== "undefined") {
    const parsed = new DOMParser().parseFromString(value, "text/html");
    return parsed.body.textContent?.replace(/\u00a0/g, " ").trim() ?? "";
  }

  return decodeSafeEntities(
    value
      .replace(/<br\s*\/?>(\s*)/gi, "\n$1")
      .replace(/<\/(?:div|li|ol|p|ul)>/gi, "\n")
      .replace(/<[^>]*>/g, ""),
  )
    .replace(/\u00a0/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
