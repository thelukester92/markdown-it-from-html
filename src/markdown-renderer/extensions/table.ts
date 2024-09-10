import { RenderRule } from '../types';
import { blockRenderRule, flatten, inlineRenderRule } from '../utils';

export const renderRules: Record<string, RenderRule> = {
  table: blockRenderRule(({ children }) => flatten(children)),
  colgroup: () => [],
  col: () => [],
  tbody: blockRenderRule(({ children }) => {
    const colWidths: number[] = [];
    for (let i = 0; i < children[0].length; ++i) {
      colWidths.push(Math.max(...children.map(child => child[i]?.length ?? 0)));
    }
    return children.map(child => {
      return '| ' + child.map((col, i) => col.padEnd(colWidths[i], ' ')).join(' | ') + ' |';
    });
  }),
  tr: ({ children }) => flatten(children),
  th: inlineRenderRule(({ content }) => content),
  td: inlineRenderRule(({ content }) => content),
};
