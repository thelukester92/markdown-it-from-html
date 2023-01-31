import Token from 'markdown-it/lib/token';
import { ImbalancedTagsError, RenderRuleNotFoundError } from './errors';

export interface RendererOpts {
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
     *     const { attrs, content } = env.popTag();
     *     env.pushRendered(`[${content}](${attrs.get('href')})`);
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
export class Renderer {
    /**
     * Rules for rendering a tag popped off the stack a self-closing tag.
     * The keys are equal to `token.tag`.
     * For example, to render `<a>` tags:
     * ```
     * {
     *   a: (content, _prefix, attrs) => `[${content}](${attrs.href})`,
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
     *     const { attrs, content } = env.popTag();
     *     env.pushRendered(`[${content}](${attrs.href})`);
     *   },
     * }
     * ```
     */
    tokenHandlerRules: Record<string, TokenHandlerRule | undefined>;

    constructor(opts?: RendererOpts) {
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
    handleToken(tokens: Token[], idx: number, env: RendererEnv): string[] | null {
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
        return env.pushRendered(rule(children, attrs));
    }

    /** Render inline tokens. */
    renderInline(tokens: Token[], env: RendererEnv): string[] {
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
        const env = new RendererEnv();
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
export class RendererEnv {
    /** The current renderer stack (the last element corresponds with the parent element). */
    private stack: RendererEnvStackEntry[] = [];

    /** Pushes an open tag to the stack, creating a new `children` buffer. */
    pushTag(tag: string, attrs?: RendererEnvStackEntry['attrs']): null {
        this.stack.push({ tag, attrs, children: [] });
        return null;
    }

    /** Pops the open tag from the stack for rendering. */
    popTag(tag: string): RendererEnvStackEntry {
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

export interface RendererEnvStackEntry {
    tag: string;
    attrs?: Record<string, any>;
    children: string[][];
}

/** For more fine-grained control over render rules, control at the token level. `RenderRule` is enough in most cases. */
export type TokenHandlerRule = (tokens: Token[], idx: number, env: RendererEnv) => string[] | null;

/** The render rule for a tag popped off the stack, or for a self-closing tag. */
export type RenderRule = (children: string[][], attrs?: Record<string, any>) => string[];

// todo: consider a children helper class with children.flatten() and children.inline()
const flatten = (children: string[][]): string[] => ([] as string[]).concat(...children);
const inline = (children: string[][]): string => flatten(children).join('');

// todo: cleaner way to add '' between blocks and trim '' at the end
const defaultRenderRules: typeof Renderer.prototype.renderRules = {
    // inline
    '': children => [inline(children)],
    em: children => [`*${inline(children)}*`],
    strong: children => [`**${inline(children)}**`],

    // block containing only inline
    h1: children => [`# ${inline(children)}`, ''],
    h2: children => [`## ${inline(children)}`, ''], // todo: use heading_open with token.markdown instead
    p: children => [`${inline(children)}`, ''],

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
        rendered.push(''); // todo: note that all block elements should append an empty line to the end (?)
        return rendered;
    },

    // special cases
    li: children => flatten(children),
};

const defaultTokenHandlerRules: typeof Renderer.prototype.tokenHandlerRules = {
    // blockquote_open: (tokens, idx, env) => env.pushTag(tokens[idx].tag),
    // blockquote_close: (tokens, idx, env) => env.pushRendered(flatten(env.popTag(tokens[idx].tag).children)),
    // bullet_list_open: (tokens, idx, env) => env.pushTag(tokens[idx].tag),
    // bullet_list_close: (tokens, idx, env) => {
    //     const { children } = env.popTag(tokens[idx].tag);
    //     const rendered: string[] = [];
    //     for (const child of children) {
    //         rendered.push(`* ${child[0]}`);
    //         rendered.push(
    //             ...child
    //                 .slice(1)
    //                 .filter(line => !!line)
    //                 .map(line => `    ${line}`),
    //         );
    //     }
    //     rendered.push(''); // all block elements should append an empty line to the end (?)
    //     return env.pushRendered(rendered);
    // },
    // ordered_list_open: (tokens, idx, env) => env.pushTag(tokens[idx].tag),
    // ordered_list_close: (tokens, idx, env) => {
    //     const { children } = env.popTag(tokens[idx].tag);
    //     const rendered: string[] = [];
    //     for (const [i, child] of children.entries()) {
    //         rendered.push(`${i + 1}. ${child[0]}`);
    //         rendered.push(
    //             ...child
    //                 .slice(1)
    //                 .filter(line => !!line)
    //                 .map(line => `    ${line}`),
    //         );
    //     }
    //     rendered.push(''); // all block elements should append an empty line to the end (?)
    //     return env.pushRendered(rendered);
    // },
};
