import { RenderRule } from '../types';
import { blockRenderRule, flatten, indent } from '../utils';

export interface ListRendererOptions {
  bulletRenderer: (i: number) => string;
}

export const listRenderer = (children: string[][], opts: ListRendererOptions): string[] => {
  const rendered: string[] = [];
  for (const [i, child] of children.entries()) {
    const bullet = opts.bulletRenderer(i);
    const [firstLine, ...restLines] = child;
    rendered.push(`${bullet} ${firstLine}`);
    rendered.push(...indent(restLines, { skipEmpty: true }));
  }
  return rendered;
};

export const renderRules: Record<string, RenderRule> = {
  ol: blockRenderRule(({ children }) => listRenderer(children, { bulletRenderer: i => `${i + 1}.` })),
  ul: blockRenderRule(({ children }) => listRenderer(children, { bulletRenderer: () => '*' })),
  li: ({ children }) => flatten(children),
};
