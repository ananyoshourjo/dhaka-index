import { Fragment } from "react";
import { normalizeJobDescription } from "@/lib/job-description";

function InlineText({ text }: { text: string }) {
  return text.split(/(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*)/g).map((part, index) => {
    if (/^(?:\*\*[^*]+\*\*|__[^_]+__)$/.test(part)) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (/^\*[^*]+\*$/.test(part)) return <em key={index}>{part.slice(1, -1)}</em>;
    return <Fragment key={index}>{part}</Fragment>;
  });
}

export function JobDescription({ text }: { text: string }) {
  return (
    <div className="space-y-4 break-words text-sm leading-6 text-foreground/90 [&>h3]:pt-3 [&>h3:first-child]:pt-0">
      {normalizeJobDescription(text).map((block, index) => {
        if (block.type === "heading") return <h3 key={index} className="font-semibold text-foreground"><InlineText text={block.text} /></h3>;
        if (block.type === "paragraph") return <p key={index}><InlineText text={block.text} /></p>;
        const List = block.ordered ? "ol" : "ul";
        return <List key={index} className={`space-y-2 pl-5 ${block.ordered ? "list-decimal" : "list-disc"}`}>
          {block.items.map((item, itemIndex) => <li key={itemIndex} className="pl-1"><InlineText text={item} /></li>)}
        </List>;
      })}
    </div>
  );
}
