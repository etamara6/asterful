import React from 'react';

interface FormattedTextProps {
  text?: string;
  onTagClick?: (tag: string) => void;
  className?: string;
  tagClassName?: string;
  isCompact?: boolean;
}

/**
 * Parses inline formatting:
 * - Code: `code`
 * - Underline: <u>text</u> or <ins>text</ins>
 * - Strikethrough: ~~text~~ or <s>text</s> or <del>text</del>
 * - Bold: **text** or __text__ or <b>text</b> or <strong>text</strong>
 * - Italic: *text* or _text_ or <i>text</i> or <em>text</em>
 * - Hashtag: #tag
 * - Newline: \n
 */
function parseInline(
  text: string,
  onTagClick?: (tag: string) => void,
  tagClassName?: string,
  keyPrefix = 'inline'
): React.ReactNode[] {
  if (!text) return [];

  // 1. Inline code: `...`
  const codeMatch = text.match(/`([^`\n]+)`/);
  if (codeMatch && codeMatch.index !== undefined) {
    const before = text.slice(0, codeMatch.index);
    const codeContent = codeMatch[1];
    const after = text.slice(codeMatch.index + codeMatch[0].length);
    return [
      ...parseInline(before, onTagClick, tagClassName, `${keyPrefix}-b`),
      <code
        key={`${keyPrefix}-code-${codeMatch.index}`}
        className="px-1.5 py-0.5 mx-0.5 rounded-md bg-slate-200/80 dark:bg-purple-950/50 border border-slate-300/60 dark:border-purple-500/30 font-mono text-[0.88em] text-amber-800 dark:text-amber-300 font-semibold"
      >
        {codeContent}
      </code>,
      ...parseInline(after, onTagClick, tagClassName, `${keyPrefix}-a`),
    ];
  }

  // 2. Underline: <u>...</u> or <ins>...</ins>
  const uMatch = text.match(/<(?:u|ins)>([\s\S]*?)<\/(?:u|ins)>/i);
  if (uMatch && uMatch.index !== undefined) {
    const before = text.slice(0, uMatch.index);
    const uContent = uMatch[1];
    const after = text.slice(uMatch.index + uMatch[0].length);
    return [
      ...parseInline(before, onTagClick, tagClassName, `${keyPrefix}-b`),
      <span
        key={`${keyPrefix}-u-${uMatch.index}`}
        className="underline decoration-current underline-offset-2"
      >
        {parseInline(uContent, onTagClick, tagClassName, `${keyPrefix}-u-in`)}
      </span>,
      ...parseInline(after, onTagClick, tagClassName, `${keyPrefix}-a`),
    ];
  }

  // 3. Strikethrough: ~~...~~ or <s>...</s> or <del>...</del>
  const sMatch = text.match(/(?:~~([\s\S]*?)~~|<(?:s|del)>([\s\S]*?)<\/(?:s|del)>)/i);
  if (sMatch && sMatch.index !== undefined) {
    const before = text.slice(0, sMatch.index);
    const sContent = sMatch[1] ?? sMatch[2];
    const after = text.slice(sMatch.index + sMatch[0].length);
    return [
      ...parseInline(before, onTagClick, tagClassName, `${keyPrefix}-b`),
      <span
        key={`${keyPrefix}-s-${sMatch.index}`}
        className="line-through opacity-75 decoration-amber-500/70"
      >
        {parseInline(sContent, onTagClick, tagClassName, `${keyPrefix}-s-in`)}
      </span>,
      ...parseInline(after, onTagClick, tagClassName, `${keyPrefix}-a`),
    ];
  }

  // 4. Bold: **...** or __...__ or <b>...</b> or <strong>...</strong>
  const bMatch = text.match(/(?:\*\*([\s\S]*?)\*\*|__([\s\S]*?)__|<b>([\s\S]*?)<\/b>|<strong>([\s\S]*?)<\/strong>)/i);
  if (bMatch && bMatch.index !== undefined) {
    const before = text.slice(0, bMatch.index);
    const bContent = bMatch[1] ?? bMatch[2] ?? bMatch[3] ?? bMatch[4];
    const after = text.slice(bMatch.index + bMatch[0].length);
    return [
      ...parseInline(before, onTagClick, tagClassName, `${keyPrefix}-b`),
      <strong
        key={`${keyPrefix}-b-${bMatch.index}`}
        className="font-bold text-slate-950 dark:text-white"
      >
        {parseInline(bContent, onTagClick, tagClassName, `${keyPrefix}-b-in`)}
      </strong>,
      ...parseInline(after, onTagClick, tagClassName, `${keyPrefix}-a`),
    ];
  }

  // 5. Italic: *...* or _..._ or <i>...</i> or <em>...</em>
  const iMatch = text.match(/(?:\*([^*\n]+)\*|_([^_]+)_|<i>([\s\S]*?)<\/i>|<em>([\s\S]*?)<\/em>)/i);
  if (iMatch && iMatch.index !== undefined) {
    const before = text.slice(0, iMatch.index);
    const iContent = iMatch[1] ?? iMatch[2] ?? iMatch[3] ?? iMatch[4];
    const after = text.slice(iMatch.index + iMatch[0].length);
    return [
      ...parseInline(before, onTagClick, tagClassName, `${keyPrefix}-b`),
      <em
        key={`${keyPrefix}-i-${iMatch.index}`}
        className="italic text-slate-800 dark:text-slate-200"
      >
        {parseInline(iContent, onTagClick, tagClassName, `${keyPrefix}-i-in`)}
      </em>,
      ...parseInline(after, onTagClick, tagClassName, `${keyPrefix}-a`),
    ];
  }

  // 6. Hashtags & Newlines split
  const hashtagRegex = /(#[a-zA-Z0-9_\u0080-\uFFFF]+|\n)/g;
  const parts = text.split(hashtagRegex);

  return parts.map((part, idx) => {
    if (part === '\n') {
      return <br key={`${keyPrefix}-br-${idx}`} />;
    }
    if (part.startsWith('#') && part.length > 1) {
      const cleanTag = part.replace(/^#+/, '');
      return (
        <span
          key={`${keyPrefix}-tag-${idx}`}
          id={`formatted-tag-${cleanTag.toLowerCase()}-${idx}`}
          onClick={(e) => {
            if (onTagClick) {
              e.stopPropagation();
              onTagClick(part);
            }
          }}
          className={`inline-block font-semibold text-amber-600 dark:text-amber-300 hover:text-amber-700 dark:hover:text-amber-200 hover:underline cursor-pointer transition-colors ${
            tagClassName || ''
          }`}
          title={`Explore #${cleanTag} Nebula 🌫️✨`}
        >
          {part}
        </span>
      );
    }
    return <React.Fragment key={`${keyPrefix}-txt-${idx}`}>{part}</React.Fragment>;
  });
}

/**
 * Main FormattedText component that processes block alignments:
 * - [align=center]...[/align]
 * - [align=right]...[/align]
 * - [align=left]...[/align]
 * - [align=justify]...[/align]
 * - <div align="center">...</div>
 * - <center>...</center>
 */
export const FormattedText: React.FC<FormattedTextProps> = ({
  text,
  onTagClick,
  className = '',
  tagClassName = '',
}) => {
  if (!text) return null;

  // Split by alignment blocks
  const alignRegex = /(\[align=(?:left|center|right|justify)\][\s\S]*?\[\/align\]|<div\s+align=["'](?:left|center|right|justify)["']>[\s\S]*?<\/div>|<center>[\s\S]*?<\/center>)/gi;
  const blocks = text.split(alignRegex);

  return (
    <span className={`block space-y-1 ${className}`}>
      {blocks.map((block, index) => {
        if (!block) return null;

        // Check for custom BBCode align [align=center]...[/align]
        const bbMatch = block.match(/^\[align=(left|center|right|justify)\]([\s\S]*?)\[\/align\]$/i);
        if (bbMatch) {
          const alignment = bbMatch[1].toLowerCase();
          const inner = bbMatch[2];
          const alignClass =
            alignment === 'center'
              ? 'text-center'
              : alignment === 'right'
              ? 'text-right'
              : alignment === 'justify'
              ? 'text-justify'
              : 'text-left';

          return (
            <span key={index} className={`block ${alignClass}`}>
              {parseInline(inner, onTagClick, tagClassName, `blk-${index}`)}
            </span>
          );
        }

        // Check for HTML <div align="...">...</div>
        const divMatch = block.match(/^<div\s+align=["'](left|center|right|justify)["']>([\s\S]*?)<\/div>$/i);
        if (divMatch) {
          const alignment = divMatch[1].toLowerCase();
          const inner = divMatch[2];
          const alignClass =
            alignment === 'center'
              ? 'text-center'
              : alignment === 'right'
              ? 'text-right'
              : alignment === 'justify'
              ? 'text-justify'
              : 'text-left';

          return (
            <span key={index} className={`block ${alignClass}`}>
              {parseInline(inner, onTagClick, tagClassName, `blk-${index}`)}
            </span>
          );
        }

        // Check for <center>...</center>
        const centerMatch = block.match(/^<center>([\s\S]*?)<\/center>$/i);
        if (centerMatch) {
          const inner = centerMatch[1];
          return (
            <span key={index} className="block text-center">
              {parseInline(inner, onTagClick, tagClassName, `blk-${index}`)}
            </span>
          );
        }

        // Normal inline segment
        return (
          <span key={index} className="inline">
            {parseInline(block, onTagClick, tagClassName, `blk-${index}`)}
          </span>
        );
      })}
    </span>
  );
};
