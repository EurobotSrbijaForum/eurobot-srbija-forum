import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

export default function Markdown({ children }) {
  return (
    <div className="markdown-body" data-testid="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          img: ({ node, ...props }) => (
            <img
              {...props}
              alt={props.alt || ""}
              loading="lazy"
              className="my-3 max-h-[480px] inline-block"
            />
          ),
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
        }}
      >
        {children || ""}
      </ReactMarkdown>
    </div>
  );
}
