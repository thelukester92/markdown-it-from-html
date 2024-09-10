import { RenderRule } from '../types';
import { blockRenderRule, flatten, inlineRenderRule } from '../utils';

// todo: figure out how to normalize column widths without `x.join('|').split('|')`
export const renderRules: Record<string, RenderRule> = {
  table: blockRenderRule(({ children }) => {
    const thead = children[0].map(child => child.split('|'));
    const tbody = children[1].map(child => child.split('|'));

    const allChildren = [...thead, ...tbody];
    const colWidths: number[] = [];
    for (let i = 0; i < allChildren[0].length; ++i) {
      colWidths.push(Math.max(...allChildren.map(child => child[i]?.length ?? 0)));
    }

    const mapping = (tr: string[]) => '| ' + tr.map((col, i) => col.padEnd(colWidths[i], ' ')).join(' | ') + ' |';
    const headingDivider = '|-' + colWidths.map(w => ''.padEnd(w, '-')).join('-|-') + '-|';

    return [...thead.map(mapping), ...(thead.length ? [headingDivider] : []), ...tbody.map(mapping)];
  }),
  colgroup: () => [],
  col: () => [],
  thead: ({ children }) => children.map(x => x.join('|')),
  tbody: ({ children }) => children.map(x => x.join('|')),
  tr: ({ children }) => flatten(children),
  th: inlineRenderRule(({ content }) => content),
  td: inlineRenderRule(({ content }) => content),
};
