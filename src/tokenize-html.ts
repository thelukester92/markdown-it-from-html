import Token from 'markdown-it/lib/token';

export interface TokenizeHtmlOptions {
    selfClosingTags?: string[];
}

interface HtmlTokenizerState {
    pos: number;
    src: string;
}

export const tokenizeHtml = (src: string, options?: TokenizeHtmlOptions): Token[] => {
    const state: HtmlTokenizerState = { pos: 0, src };
    const tokens: Token[] = [];

    const pushInlineToken = (token: Token) => {
        if (!tokens.length || tokens[tokens.length - 1].type !== 'inline') {
            tokens.push(new Token('inline', '', 0));
        }
        const parent = tokens[tokens.length - 1];
        parent.children ??= [];
        parent.children.push(token);
    };

    while (state.pos < state.src.length) {
        const hasWhitespace = consumeWhitespace(state);
        if (state.src[state.pos] === '<') {
            ++state.pos;
            const [type, token] = consumeTag(state, options);
            if (type === 'inline') {
                pushInlineToken(token);
            } else if (type === 'block') {
                tokens.push(token);
            }
        } else {
            if (hasWhitespace) {
                --state.pos;
            }
            pushInlineToken(consumeText(state));
        }
    }

    return tokens;
};

const consumeWhitespace = (state: HtmlTokenizerState): boolean => {
    let consumed = false;
    while (state.pos < state.src.length && (state.src[state.pos] === ' ' || state.src[state.pos] === '\n')) {
        ++state.pos;
        consumed = true;
    }
    return consumed;
};

const consumeTag = (
    state: HtmlTokenizerState,
    options?: TokenizeHtmlOptions,
): ['inline' | 'block' | 'ignore', Token] => {
    const isClosingTag = state.src[state.pos] === '/';
    if (isClosingTag) {
        state.pos++;
    }
    let isSelfClosing = false;
    const tag = consumeWord(state);
    const attrs: [string, string][] = [];
    while (state.pos < state.src.length && state.src[state.pos] !== '>') {
        consumeWhitespace(state);
        if (state.src.startsWith('/>', state.pos)) {
            isSelfClosing = true;
            break;
        } else if (state.src[state.pos] === '>') {
            break;
        }
        const attrName = consumeWord(state);
        consumeWhitespace(state);
        let attrValue = '';
        if (state.src.startsWith('="', state.pos)) {
            state.pos += 2;
            consumeWhitespace(state);
            attrValue = consumeQuotedValue(state);
        } else {
            attrValue = 'true';
        }
        attrs.push([attrName, attrValue]);
    }
    if (state.src[state.pos] === '>') {
        ++state.pos;
    }
    const [group, type] = determineTagType(tag, isClosingTag, isSelfClosing, options);
    const nesting = isClosingTag ? -1 : isSelfClosing ? 0 : 1;
    const token = new Token(type, tag, nesting);
    token.attrs = attrs;
    return [group, token];
};

const consumeText = (state: HtmlTokenizerState): Token => {
    let { pos } = state;
    while (pos < state.src.length && state.src[pos] !== '<') {
        ++pos;
    }
    const text = state.src.slice(state.pos, pos);
    state.pos = pos;
    const token = new Token('text', '', 0);
    token.content = text;
    return token;
};

const wordCharacterRegex = /^[A-Z0-9-]/i;
const consumeWord = (state: HtmlTokenizerState): string => {
    let { pos } = state;
    while (pos < state.src.length && wordCharacterRegex.test(state.src[pos])) {
        ++pos;
    }
    const word = state.src.slice(state.pos, pos);
    state.pos = pos;
    return word;
};

const consumeQuotedValue = (state: HtmlTokenizerState): string => {
    let { pos } = state;
    while (pos < state.src.length && state.src[pos] !== '"') {
        ++pos;
    }
    const value = state.src.slice(state.pos, pos);
    state.pos = pos + 1;
    return value;
};

const determineTagType = (
    tagName: string,
    isClosingTag: boolean,
    isSelfClosing: boolean,
    options?: TokenizeHtmlOptions,
): ['inline' | 'block' | 'ignore', string] => {
    tagName = tagName.toLowerCase();
    const suffix = isClosingTag ? '_close' : !isSelfClosing ? '_open' : '';
    if (options?.selfClosingTags?.includes(tagName)) {
        return [isClosingTag ? 'ignore' : 'block', tagName];
    } else if (tagName[0] === 'h' && !isNaN(+tagName[1])) {
        return ['block', 'heading' + suffix];
    } else if (tagName === 'aside') {
        return ['block', 'aside' + suffix];
    } else if (tagName === 'blockquote') {
        return ['block', 'blockquote' + suffix];
    } else if (tagName === 'hr') {
        return ['block', 'hr'];
    } else if (tagName === 'p') {
        return ['block', 'paragraph' + suffix];
    } else if (tagName === 'ul') {
        return ['block', 'bullet_list' + suffix];
    } else if (tagName === 'ol') {
        return ['block', 'ordered_list' + suffix];
    } else if (tagName === 'li') {
        return ['block', 'list_item' + suffix];
    } else if (tagName === 'dd') {
        return ['block', 'dd' + suffix];
    } else if (tagName === 'dl') {
        return ['block', 'dl' + suffix];
    } else if (tagName === 'dt') {
        return ['block', 'dt' + suffix];
    } else if (tagName === 'a') {
        return ['inline', 'link' + suffix];
    } else if (tagName === 'br') {
        return ['inline', 'hardbreak'];
    } else if (tagName === 'em') {
        return ['inline', 'em' + suffix];
    } else if (tagName === 's') {
        return ['inline', 's' + suffix];
    } else if (tagName === 'strong') {
        return ['inline', 'strong' + suffix];
    } else {
        throw new Error('unrecognized tag ' + tagName);
    }
};
