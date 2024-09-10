import { RenderRule } from '../types';
import { blockRenderRule, flatten, inlineRenderRule } from '../utils';

/** Render rule for thead and tbody. */
const tableRenderer = (children: string[][]): string[] => {
  const colWidths: number[] = [];
  for (let i = 0; i < children[0].length; ++i) {
    colWidths.push(Math.max(...children.map(child => child[i]?.length ?? 0)));
  }
  return children.map(child => {
    return '| ' + child.map((col, i) => col.padEnd(colWidths[i], ' ')).join(' | ') + ' |';
  });
};

export const renderRules: Record<string, RenderRule> = {
  table: blockRenderRule(({ children }) => flatten(children)),
  colgroup: () => [],
  col: () => [],
  thead: blockRenderRule(({ children }) => tableRenderer(children)),
  tbody: blockRenderRule(({ children }) => tableRenderer(children)),
  tr: ({ children }) => flatten(children),
  th: inlineRenderRule(({ content }) => content),
  td: inlineRenderRule(({ content }) => content),
};
