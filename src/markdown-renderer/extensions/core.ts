import { RenderRule } from '../types';
import { blockRenderRule, inline, inlineRenderRule, wrapContentRule } from '../utils';

export const commonSubstitutions: [RegExp, string][] = [
  [/\*/g, '\\*'],
  [/&#x27;/g, `'`],
  [/&quot;/g, `"`],
];

export const renderRules: Record<string, RenderRule> = {
  // inline
  '': inlineRenderRule(({ content }) => {
    let result = content;
    for (const [find, replace] of commonSubstitutions) {
      result = result.replace(find, replace);
    }
    return result;
  }),
  a: inlineRenderRule(({ content, attrs }) => `[${content}](${attrs?.href ?? ''})`),
  br: inlineRenderRule(({ attrs }) => (attrs?.['data-softbreak'] === 'true' ? '\n' : '  \n')),
  em: wrapContentRule,
  img: inlineRenderRule(({ attrs }) => {
    const alt = attrs?.alt ?? '';
    const src = attrs?.src ?? '';
    const title = attrs?.title ? ` "${attrs.title}"` : '';
    return `![${alt}](${src}${title})`;
  }),
  s: wrapContentRule,
  strong: wrapContentRule,

  // block containing only inline
  p: blockRenderRule(({ children }) => [inline(children)]),

  // self-closing block
  hr: blockRenderRule(() => ['***']),
};
