import Token from 'markdown-it/lib/token';
import { ImbalancedTagsError, RenderRuleNotFoundError } from './errors';
import { flatten, inline } from './utils';

export interface MarkdownRendererOpts {
    /**
     * Rules for rendering a tag popped off the stack a self-closing tag.
     * The keys are equal to `token.tag`.
     * For example, to render `<a>` tags:
     * ```
     * {
     *   a: (children, attrs) => `[${inline(children)}](${attrs.get('href')})`,
     * }
     * ```
     */
    renderRules: Record<string, RenderRule | undefined>;

    /**
     * Rules for handling a token, if more fine-grained control is needed.
     * This is closer to the original markdown-it rules, but in most cases, `renderRules` is easier to use.
     * For example, to render `<a>` tags:
     * ```
     * {
     *   link_open: (tokens, idx, env) => env.pushTag('a', { href: tokens[idx].attrs.find(attr => attr[0] === 'href') }),
     *   link_close: (tokens, idx, env) => {
     *     const { children, attrs } = env.popTag();
     *     env.pushRendered(`[${inline(children)}](${attrs.get('href')})`);
     *   },
     * }
     * ```
     */
    tokenHandlerRules: Record<string, TokenHandlerRule | undefined>;
}

/**
 * Markdown-It Reverse Renderer that maps tokens back into markdown.
 * Use `tokenizeHtml` to map entirely from html to markdown.
 */
export class MarkdownRenderer {
    /**
     * Rules for rendering a tag popped off the stack a self-closing tag.
     * The keys are equal to `token.tag`.
     * For example, to render `<a>` tags:
     * ```
     * {
     *   a: (children, attrs) => `[${inline(children)}](${attrs.get('href')})`,
     * }
     * ```
     */
    renderRules: Record<string, RenderRule | undefined>;

    /**
     * Rules for handling a token, if more fine-grained control is needed.
     * This is closer to the original markdown-it rules, but in most cases, `renderRules` is easier to use.
     * For example, to render `<a>` tags:
     * ```
     * {
     *   link_open: (tokens, idx, env) => env.pushTag('a', { href: tokens[idx].attrs.find(attr => attr[0] === 'href') }),
     *   link_close: (tokens, idx, env) => {
     *     const { children, attrs } = env.popTag();
     *     env.pushRendered(`[${inline(children)}](${attrs.get('href')})`);
     *   },
     * }
     * ```
     */
    tokenHandlerRules: Record<string, TokenHandlerRule | undefined>;

    constructor(opts?: MarkdownRendererOpts) {
        this.renderRules = { ...defaultRenderRules, ...opts?.renderRules };
        this.tokenHandlerRules = { ...defaultTokenHandlerRules, ...opts?.tokenHandlerRules };
    }

    /** Render token attributes to a record. */
    renderAttrs(token: Token): Record<string, any> | undefined {
        return token.attrs?.reduce((acc, [key, value]) => {
            acc[key] = value;
            return acc;
        }, {} as Record<string, any>);
    }

    /** The default token handler, which manages the internal stack. */
    handleToken(tokens: Token[], idx: number, env: MarkdownRendererEnv): string[] | null {
        const token = tokens[idx];
        if (token.nesting === 1) {
            const attrs = this.renderAttrs(token);
            return env.pushTag(token.tag, attrs);
        }

        let attrs: Record<string, any> | undefined;
        let children: string[][];
        if (token.nesting === -1) {
            // popped tag
            ({ attrs, children } = env.popTag(token.tag));
        } else {
            // self-closing tag
            attrs = this.renderAttrs(token);
            children = token.content ? [[token.content]] : [];
        }

        const rule = this.renderRules[token.tag];
        if (!rule) {
            throw new RenderRuleNotFoundError(token);
        }
        const node = rule(children, attrs);
        return env.pushRendered(node);
    }

    /** Render inline tokens. */
    renderInline(tokens: Token[], env: MarkdownRendererEnv): string[] {
        const children: string[] = [];
        for (const [i, token] of tokens.entries()) {
            const rule = this.tokenHandlerRules[token.type];
            const rendered = rule ? rule(tokens, i, env) : this.handleToken(tokens, i, env);
            if (rendered) {
                children.push(...rendered);
            }
        }
        return children;
    }

    /** Render block tokens. */
    render(tokens: Token[]): string {
        const env = new MarkdownRendererEnv();
        const children: string[] = [];
        for (const [i, token] of tokens.entries()) {
            const rule = this.tokenHandlerRules[token.type];
            const rendered = rule
                ? rule(tokens, i, env)
                : token.type === 'inline'
                ? this.renderInline(token.children ?? [], env)
                : this.handleToken(tokens, i, env);
            if (rendered) {
                children.push(...rendered);
            }
        }
        return children.join('\n').trim();
    }
}

/**
 * A helper class for managing the rendering stack.
 * When a tag is pushed, a new `children` buffer is started.
 * When a tag is popped, the top element is rendered.
 * If there is another `children` buffer, the rendered element is sent there.
 * If there is not, the rendered element is returned to the caller.
 */
export class MarkdownRendererEnv {
    /** The current renderer stack (the last element corresponds with the parent element). */
    private stack: MarkdownRendererEnvStackEntry[] = [];

    /** Pushes an open tag to the stack, creating a new `children` buffer. */
    pushTag(tag: string, attrs?: MarkdownRendererEnvStackEntry['attrs']): null {
        this.stack.push({ tag, attrs, children: [] });
        return null;
    }

    /** Pops the open tag from the stack for rendering. */
    popTag(tag: string): MarkdownRendererEnvStackEntry {
        const top = this.stack.pop();
        if (!top || top.tag !== tag) {
            throw new ImbalancedTagsError(top?.tag, tag);
        }
        return top;
    }

    /** Push a rendered token into the current `children` buffer and return null, or return it if top-level. */
    pushRendered(children: string[]): string[] {
        if (this.stack.length) {
            this.stack[this.stack.length - 1].children.push(children);
            return [];
        }
        return children;
    }
}

export interface MarkdownRendererEnvStackEntry {
    /** The html tag from the token that pushed this entry to the stack. */
    tag: string;

    /** The key-value pairs of the token when this entry was pushed to the stack. */
    attrs?: Record<string, any>;

    /**
     * The rendered children for the current stack entry, built from rendering tokens further down in the DOM tree.
     * Each element is an array of lines (to be joined with newlines) rendered for a token.
     */
    children: string[][];
}

/**
 * For more fine-grained control over render rules, control at the token level. `RenderRule` is enough in most cases.
 * For example, this enables a single rule to render multiple tag types, e.g. `<h1>` through `<h6>`.
 * @returns An array of rendered lines to be added to the _root_, or null if added to the stack.
 *          This should probably always be in the form `return env.pushRendered(...)`.
 */
export type TokenHandlerRule = (tokens: Token[], idx: number, env: MarkdownRendererEnv) => string[] | null;

/**
 * The render rule for a tag popped off the stack, or for a self-closing tag.
 * Block elements should return an extra empty string `''` to force a newline after it.
 * @param children The rendered children (each element is an array of lines).
 * @param attrs The key-value pairs of the _opening_ token for this tag (or _the_ token, if self-closing).
 * @returns An array of rendered lines, to be added to the top of the stack.
 */
export type RenderRule = (children: string[][], attrs?: Record<string, any>) => string[];

// todo: make inline tokens like `<em>` respect `token.markdown`, e.g. to preserve `_` vs `*`
const defaultRenderRules: typeof MarkdownRenderer.prototype.renderRules = {
    // inline
    '': children => [inline(children)],
    a: (children, attrs) => [`[${inline(children)}](${attrs?.href ?? ''})`],
    em: children => [`*${inline(children)}*`],
    s: children => [`~~${inline(children)}~~`],
    strong: children => [`**${inline(children)}**`],

    // block containing only inline
    p: children => [`${inline(children)}`, ''],

    // self-closing block
    hr: () => [`***`, ''],

    // block containing nested blocks
    blockquote: children => {
        const flattened = flatten(children);
        if (flattened.length && flattened[flattened.length - 1] === '') {
            flattened.pop();
        }
        const rendered = flattened.map(child => (child ? `> ${child}` : '>'));
        rendered.push('');
        return rendered;
    },
    ol: children => {
        const rendered: string[] = [];
        for (const [i, child] of children.entries()) {
            rendered.push(`${i + 1}. ${child[0]}`);
            rendered.push(
                ...child
                    .slice(1)
                    .filter(line => !!line)
                    .map(line => `    ${line}`),
            );
        }
        rendered.push('');
        return rendered;
    },
    ul: children => {
        const rendered: string[] = [];
        for (const child of children) {
            rendered.push(`* ${child[0]}`);
            rendered.push(
                ...child
                    .slice(1)
                    .filter(line => !!line)
                    .map(line => `    ${line}`),
            );
        }
        rendered.push('');
        return rendered;
    },

    // special cases
    li: children => flatten(children),
};

const defaultTokenHandlerRules: typeof MarkdownRenderer.prototype.tokenHandlerRules = {
    // note: using the default rule for heading_open
    heading_close: (tokens, idx, env) => {
        const token = tokens[idx];
        const { children } = env.popTag(token.tag);
        return env.pushRendered([`${tokens[idx].markup} ${inline(children)}`, '']);
    },
};
