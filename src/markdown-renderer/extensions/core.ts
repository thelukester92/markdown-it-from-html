import { RenderRule } from '../types';
import { blockRenderRule, inline, inlineRenderRule, wrapContentRule } from '../utils';

export const renderRules: Record<string, RenderRule> = {
  // inline
  '': inlineRenderRule(({ content }) => {
    // common substitution; replace this render rule to customize
    return content.replace(/\*/g, '\\*');
  }),
  a: inlineRenderRule(({ content, attrs }) => `[${content}](${attrs?.href ?? ''})`),
  br: inlineRenderRule(({ attrs }) => (attrs?.['data-softbreak'] === 'true' ? '\n' : '  \n')),
  em: wrapContentRule,
  s: wrapContentRule,
  strong: wrapContentRule,

  // block containing only inline
  p: blockRenderRule(({ children }) => [inline(children)]),

  // self-closing block
  hr: blockRenderRule(() => ['***']),
};
