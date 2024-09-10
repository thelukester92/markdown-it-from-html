import Token from 'markdown-it/lib/token';
import { ImbalancedTagsError, RenderRuleNotFoundError } from '../errors';
import { renderRules as blockquoteRenderRules } from './extensions/blockquote';
import { renderRules as coreRenderRules } from './extensions/core';
import { tokenHandlerRules as headingTokenHandlerRules } from './extensions/heading';
import { renderRules as listRenderRules } from './extensions/list';
import { renderRules as tableRenderRules } from './extensions/table';
import { MarkdownRendererEnv } from './markdown-renderer-env';
import { RenderRule, TokenHandlerRule } from './types';

const defaultRenderRules: typeof MarkdownRenderer.prototype.renderRules = {
  ...blockquoteRenderRules,
  ...coreRenderRules,
  ...listRenderRules,
  ...tableRenderRules,
};

const defaultTokenHandlerRules: typeof MarkdownRenderer.prototype.tokenHandlerRules = {
  ...headingTokenHandlerRules,
};

export interface MarkdownRendererOpts {
  /**
   * Rules for rendering a tag popped off the stack or a self-closing tag.
   * The keys are equal to `token.tag`.
   * For example, to render `<a>` tags:
   * ```
   * {
   *   a: (children, attrs) => `[${inline(children)}](${attrs.get('href')})`,
   * }
   * ```
   */
  renderRules?: Record<string, RenderRule | undefined>;

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
  tokenHandlerRules?: Record<string, TokenHandlerRule | undefined>;
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
    const node = rule({ token, children, attrs });
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
    const top = env.top();
    if (top) {
      throw new ImbalancedTagsError(top.tag);
    }
    return children.join('\n').trim();
  }
}
