import Token from 'markdown-it/lib/token';

export class ImbalancedTagsError extends Error {
  constructor(public expected?: string, public received?: string) {
    const messageParts: string[] = [];
    if (expected) {
      messageParts.push(`expected "${expected}"`);
    }
    if (received) {
      messageParts.push(`received "${received}"`);
    }
    super('imbalanced tags' + (messageParts.length ? '; ' : '') + messageParts.join(', '));
  }
}

export class MalformedClosingTagError extends Error {
  constructor() {
    super('malformed closing tag');
  }
}

export class RenderRuleNotFoundError extends Error {
  constructor(public token: Token) {
    super(`no render rule found for tag "${token.tag}" (type "${token.type}")`);
  }
}

export class TagResolverNotFoundError extends Error {
  constructor(public tag: string) {
    super(`no tag resolver found for tag "${tag}"`);
  }
}
