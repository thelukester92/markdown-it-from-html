import Token from 'markdown-it/lib/token';
import { TagResolverNotFoundError } from './errors';

export interface HtmlParserOptions {
    /** Mapping from HTML tag name to token group (block/inline) and token type. */
    tags: Record<string, HtmlParserTokenResolver | undefined>;
}

/** Mapping for a tag, by tag style (open/close), to token (or null to ignore). */
export type HtmlParserTokenResolver = (tagStyle: HtmlParserTagStyle) => Token | null;

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
        const state: HtmlParserState = { pos: 0, src: html };
        const tokens: Token[] = [];

        const pushInlineToken = (token: Token) => {
            if (!tokens.length || tokens[tokens.length - 1].type !== 'inline') {
                tokens.push(new Token('inline', '', 0));
            }
            const parent = tokens[tokens.length - 1];
            parent.children ??= [];
            parent.children.push(token);
        };

        while (state.pos < state.src.length) {
            const hasWhitespace = this.consumeWhitespace(state);
            if (state.src[state.pos] === '<') {
                ++state.pos;
                const token = this.consumeTag(state);
                if (token && token.block) {
                    tokens.push(token);
                } else if (token && !token.block) {
                    pushInlineToken(token);
                }
            } else {
                if (hasWhitespace) {
                    --state.pos;
                }
                pushInlineToken(this.consumeText(state));
            }
        }

        return tokens;
    }

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
            state.pos++;
        }
        const tag = this.consumeWord(state).toLowerCase();
        const tagResolver = this.tags[tag];
        if (!tagResolver) {
            throw new TagResolverNotFoundError(tag);
        }
        const attrs: [string, string][] = [];
        while (state.pos < state.src.length && state.src[state.pos] !== '>') {
            this.consumeWhitespace(state);
            if (state.src.startsWith('/>', state.pos)) {
                tagStyle = 'self-closing';
                state.pos += 2;
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
        const token = tagResolver(tagStyle);
        if (token) {
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

export const blockTokenResolver =
    (tag: string, tokenPrefix?: string, markup?: string): HtmlParserTokenResolver =>
    style => {
        const type = `${tokenPrefix ?? tag}_${style}`;
        const nesting = style === 'open' ? 1 : style === 'self-closing' ? 0 : -1;
        const token = new Token(type, tag, nesting);
        token.block = true;
        token.markup = markup ?? '';
        return token;
    };

export const inlineTokenResolver =
    (tag: string, tokenPrefix?: string, markup?: string): HtmlParserTokenResolver =>
    style => {
        const type = `${tokenPrefix ?? tag}_${style}`;
        const nesting = style === 'open' ? 1 : style === 'self-closing' ? 0 : -1;
        const token = new Token(type, tag, nesting);
        token.markup = markup ?? '';
        return token;
    };

export const selfClosingTokenResolver =
    (tag: string, tokenType?: string, markup?: string): HtmlParserTokenResolver =>
    style => {
        if (style === 'close') {
            // a closing tag for self-closing tokens should be ignored
            return null;
        }
        const type = `${tokenType ?? tag}`;
        const nesting = style === 'open' ? 1 : style === 'self-closing' ? 0 : -1;
        const token = new Token(type, tag, nesting);
        token.block = true;
        token.markup = markup ?? '';
        return token;
    };

interface HtmlParserState {
    pos: number;
    src: string;
}

const wordCharacterRegex = /^[A-Z0-9-]/i;

const defaultTags: Record<string, HtmlParserTokenResolver> = {
    // inline
    a: inlineTokenResolver('a'),
    em: inlineTokenResolver('em', 'em', '*'),
    s: inlineTokenResolver('s', 's', '~~'),
    strong: inlineTokenResolver('strong', 'strong', '**'),

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

    // self-closing
    br: selfClosingTokenResolver('br'),
    hr: selfClosingTokenResolver('hr', 'hr', '***'),
};
