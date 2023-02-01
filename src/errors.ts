import Token from 'markdown-it/lib/token';

export class ImbalancedTagsError extends Error {
    constructor(public expected: string | undefined, public received: string) {
        super(
            expected
                ? `imbalanced tags; expected "${expected}", received "${received}"`
                : `imbalanced tags; unexpected "${received}"`,
        );
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
