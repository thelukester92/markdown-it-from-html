import Token from 'markdown-it/lib/token';
import { RenderRule } from '../types';
import { inline } from './child';

/** Wrapper for a render rule that produces a block, adding the requisite empty line at the end. */
export const blockRenderRule =
  (rule: (args: { token: Token; children: string[][]; attrs?: Record<string, any> }) => string[]): RenderRule =>
  args => {
    const rendered = rule(args);
    if (rendered[rendered.length - 1] !== '') {
      // block elements always end with exactly one empty line
      rendered.push('');
    }
    return rendered;
  };

/** Wrapper for a render rule for an inline token, automatically inlining all children. */
export const inlineRenderRule =
  (rule: (args: { token: Token; content: string; attrs?: Record<string, any> }) => string): RenderRule =>
  ({ token, children, attrs }) =>
    [rule({ token, content: inline(children), attrs })];

/** A simple render rule that wraps text content in the token's markup (e.g. `**content**` or `_content_`) */
export const wrapContentRule: RenderRule = ({ token, children }) => [
  `${token.markup}${inline(children)}${token.markup}`,
];
