import Token from 'markdown-it/lib/token';
import { MarkdownRendererEnv } from './markdown-renderer-env';

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
 * @param token The token itself.
 * @param children The rendered children (each element is an array of lines).
 * @param attrs The key-value pairs of the _opening_ token for this tag (or _the_ token, if self-closing).
 * @returns An array of rendered lines, to be added to the top of the stack.
 */
export type RenderRule = (args: { token: Token; children: string[][]; attrs?: Record<string, any> }) => string[];
