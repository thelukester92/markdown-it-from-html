import { TokenHandlerRule } from '../types';
import { inline } from '../utils';

export const tokenHandlerRules: Record<string, TokenHandlerRule> = {
  // note: using the default token handler for heading_open
  heading_close: (tokens, idx, env) => {
    const token = tokens[idx];
    const { children } = env.popTag(token.tag);
    return env.pushRendered([`${tokens[idx].markup} ${inline(children)}`, '']);
  },
};
