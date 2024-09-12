import Token from 'markdown-it/lib/token';
import { MalformedClosingTagError, TagResolverNotFoundError } from './errors';

export interface HtmlParserOptions {
  /** Mapping from HTML tag name to token group (block/inline) and token type. */
  tags: Record<string, HtmlParserTokenResolver | undefined>;
}

/**
 * Mapping for a tag, by tag style (open/close), to token (or null to ignore).
 * @param tagStyle whether the current HTML tag is an open, self-closing, or close tag.
 * @param attrs the attributes for the current HTML tag (copied from the corresponding open tag, if this is a close).
 */
export type HtmlParserTokenResolver = (tagStyle: HtmlParserTagStyle, attrs?: [string, string][]) => Token | null;

/** HTML tag style, either open (e.g. `<strong>`), close (e.g. `</strong>`), or self-closing (e.g. `<br />`) */
export type HtmlParserTagStyle = 'open' | 'close' | 'self-closing';

/** Parses HTML into markdown-it tokens, as if parsed from markdown. */
export class HtmlParser {
  /** Tag resolvers, for mapping HTML tags to markdown-it token types. */
  tags: Record<string, HtmlParserTokenResolver | undefined>;

  constructor(opts?: HtmlParserOptions) {
    this.tags = { ...defaultTags, ...opts?.tags };
  }

  parse(html: string): Token[] {
    const state: HtmlParserState = { pos: 0, src: html, tokens: [] };

    const pushInlineToken = (token: Token) => {
      if (!state.tokens.length || state.tokens[state.tokens.length - 1].type !== 'inline') {
        state.tokens.push(new Token('inline', '', 0));
      }
      const parent = state.tokens[state.tokens.length - 1];
      parent.children ??= [];
      parent.children.push(token);
    };

    while (state.pos < state.src.length) {
      const whitespaceConsumed = this.consumeWhitespace(state);
      if (state.src[state.pos] === '<') {
        // if there was any whitespace before the tag, it becomes a single space of text content
        if (whitespaceConsumed && state.tokens[state.tokens.length - 1].type === 'inline') {
          const token = new Token('text', '', 0);
          token.content = ' ';
          pushInlineToken(token);
        }

        // consume the tag
        ++state.pos;
        const token = this.consumeTag(state);
        if (token && token.block) {
          state.tokens.push(token);
        } else if (token && !token.block) {
          pushInlineToken(token);
        }
      } else {
        // if there was any whitespace consumed, put a single space back to be included as text content
        if (whitespaceConsumed) {
          --state.pos;
        }
        pushInlineToken(this.consumeText(state));
      }
    }

    return state.tokens;
  }

  /** Consumes leading whitespace and returns whether any was consumed. */
  private consumeWhitespace(state: HtmlParserState): boolean {
    let consumed = false;
    while (state.pos < state.src.length && (state.src[state.pos] === ' ' || state.src[state.pos] === '\n')) {
      ++state.pos;
      consumed = true;
    }
    return consumed;
  }

  private consumeTag(state: HtmlParserState): Token | null {
    let tagStyle: HtmlParserTagStyle = 'open';
    if (state.src[state.pos] === '/') {
      tagStyle = 'close';
      ++state.pos;
    }

    const tag = this.consumeWord(state).toLowerCase();
    const tagResolver = this.tags[tag];
    if (!tagResolver) {
      throw new TagResolverNotFoundError(tag);
    }

    if (tagStyle === 'close' && state.src[state.pos] !== '>') {
      throw new MalformedClosingTagError();
    }

    let attrs: [string, string][] = [];
    while (state.pos < state.src.length && state.src[state.pos] !== '>') {
      this.consumeWhitespace(state);
      if (state.src.startsWith('/>', state.pos)) {
        tagStyle = 'self-closing';
        ++state.pos;
        break;
      } else if (state.src[state.pos] === '>') {
        break;
      }
      const attrName = this.consumeWord(state);
      this.consumeWhitespace(state);
      let attrValue = '';
      if (state.src.startsWith('="', state.pos)) {
        state.pos += 2;
        this.consumeWhitespace(state);
        attrValue = this.consumeQuotedValue(state);
      } else {
        attrValue = 'true';
      }
      attrs.push([attrName, attrValue]);
    }
    if (state.src[state.pos] === '>') {
      ++state.pos;
    }

    // scan back in the stack for a corresponding open tag for copying attributes
    const currentToken = state.tokens[state.tokens.length - 1];
    if (tagStyle === 'close' && currentToken.type === 'inline') {
      const currentTokenChildren = currentToken.children ?? [];
      for (let i = currentTokenChildren.length - 1; i >= 0; --i) {
        if (currentTokenChildren[i].type === `${tag}_open`) {
          attrs = currentTokenChildren[i].attrs ?? [];
          break;
        }
      }
    }

    const token = tagResolver(tagStyle, attrs);
    if (token && tagStyle !== 'close') {
      // todo: determine if it would really bad to include attrs on closing tags
      token.attrs = attrs;
    }
    return token;
  }

  private consumeText(state: HtmlParserState): Token {
    let { pos } = state;
    while (pos < state.src.length && state.src[pos] !== '<') {
      ++pos;
    }
    const text = state.src.slice(state.pos, pos);
    state.pos = pos;
    const token = new Token('text', '', 0);
    token.content = text;
    return token;
  }

  private consumeWord(state: HtmlParserState): string {
    let { pos } = state;
    while (pos < state.src.length && wordCharacterRegex.test(state.src[pos])) {
      ++pos;
    }
    const word = state.src.slice(state.pos, pos);
    state.pos = pos;
    return word;
  }

  private consumeQuotedValue(state: HtmlParserState): string {
    let { pos } = state;
    while (pos < state.src.length && state.src[pos] !== '"') {
      ++pos;
    }
    const value = state.src.slice(state.pos, pos);
    state.pos = pos + 1;
    return value;
  }
}

const resolveMarkup = (markup?: string | string[], attrs?: [string, string][]): string => {
  const allowedMarkup = Array.isArray(markup) ? markup : markup ? [markup] : undefined;
  if (!allowedMarkup?.length) {
    return '';
  }
  const attrMarkup = attrs?.find(x => x[0] === 'data-markup')?.[1] ?? '';
  return allowedMarkup.includes(attrMarkup) ? attrMarkup : allowedMarkup[0];
};

export const inlineTokenResolver =
  (tag: string, tokenPrefix?: string, markup?: string | string[]): HtmlParserTokenResolver =>
  (style, attrs) => {
    const type = `${tokenPrefix ?? tag}_${style}`;
    const nesting = style === 'open' ? 1 : style === 'self-closing' ? 0 : -1;
    const token = new Token(type, tag, nesting);
    token.markup = resolveMarkup(markup, attrs);
    return token;
  };

export const blockTokenResolver =
  (tag: string, tokenPrefix?: string, markup?: string | string[]): HtmlParserTokenResolver =>
  (style, attrs) => {
    const token = inlineTokenResolver(tag, tokenPrefix, markup)(style, attrs);
    token!.block = true;
    return token;
  };

export const selfClosingTokenResolver =
  (tag: string, tokenType?: string, markup?: string | string[]): HtmlParserTokenResolver =>
  (style, attrs) => {
    if (style === 'close') {
      // a closing tag for self-closing tokens should be ignored
      // but other styles (e.g. <br> or <br />) should have the same behavior (nesting = 0)
      return null;
    }
    const token = blockTokenResolver(tag, tokenType, markup)(style, attrs);
    token!.type = tokenType ?? tag;
    token!.nesting = 0;
    return token;
  };

interface HtmlParserState {
  pos: number;
  src: string;
  tokens: Token[];
}

const wordCharacterRegex = /^[A-Z0-9-]/i;

const defaultTags: Record<string, HtmlParserTokenResolver> = {
  // inline
  a: inlineTokenResolver('a'),
  em: inlineTokenResolver('em', 'em', ['_', '*']),
  s: inlineTokenResolver('s', 's', '~~'),
  strong: inlineTokenResolver('strong', 'strong', ['**', '__']),

  // block
  blockquote: blockTokenResolver('blockquote'),
  h1: blockTokenResolver('h1', 'heading', '#'),
  h2: blockTokenResolver('h2', 'heading', '##'),
  h3: blockTokenResolver('h3', 'heading', '###'),
  h4: blockTokenResolver('h4', 'heading', '####'),
  h5: blockTokenResolver('h5', 'heading', '#####'),
  h6: blockTokenResolver('h6', 'heading', '######'),
  li: blockTokenResolver('li', 'list_item'),
  ol: blockTokenResolver('ol', 'ordered_list'),
  p: blockTokenResolver('p', 'paragraph'),
  ul: blockTokenResolver('ul', 'bullet_list'),
  table: blockTokenResolver('table'),
  colgroup: blockTokenResolver('colgroup'),
  thead: blockTokenResolver('thead'),
  tbody: blockTokenResolver('tbody'),
  tr: blockTokenResolver('tr'),
  th: blockTokenResolver('th'),
  td: blockTokenResolver('td'),

  // self-closing
  br: selfClosingTokenResolver('br'),
  col: selfClosingTokenResolver('col'),
  hr: selfClosingTokenResolver('hr', 'hr', '***'),
  img: selfClosingTokenResolver('img'),
};
