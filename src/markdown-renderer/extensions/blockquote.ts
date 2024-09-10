import { RenderRule } from '../types';
import { blockRenderRule, flatten, indent } from '../utils';

export const renderRules: Record<string, RenderRule> = {
  blockquote: blockRenderRule(({ children }) => {
    const flattened = flatten(children);
    if (flattened.length && flattened[flattened.length - 1] === '') {
      flattened.pop();
    }
    return indent(flattened, { prefix: '>', addSpace: true });
  }),
};
