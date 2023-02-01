import MarkdownIt from 'markdown-it';
import Token from 'markdown-it/lib/token';
import { RenderRuleNotFoundError } from './errors';
import { MarkdownRenderer } from './markdown-renderer';
import { flatten } from './utils';

describe('markdown-it-from-html', () => {
    const md = new MarkdownIt();
    let renderer: MarkdownRenderer;

    beforeEach(() => {
        renderer = new MarkdownRenderer();
    });

    it('roundtrips inline styles', () => {
        const markdown = '*this* is italic and **this** is bold, while ***this*** is both; ~~this~~ is strikethrough';
        const result = renderer.render(md.parse(markdown, {}));
        expect(result).toBe(markdown);
    });

    it('roundtrips paragraphs', () => {
        const markdown = 'paragraph one\n\nparagraph two';
        const result = renderer.render(md.parse(markdown, {}));
        expect(result).toBe(markdown);
    });

    it('roundtrips headings', () => {
        const markdown = [
            '# heading one',
            'paragraph',
            '## heading two',
            '### heading three',
            'paragraph',
            '#### heading four',
            '##### heading five',
            '###### heading six',
            'paragraph',
        ].join('\n\n');
        const result = renderer.render(md.parse(markdown, {}));
        expect(result).toBe(markdown);
    });

    it('roundtrips blockquotes', () => {
        const markdown = [
            'content before',
            '',
            '> single paragaph blockquote',
            '',
            'more content',
            '',
            '> ## blockquote with header',
            '>',
            '> and a paragraph',
            '',
            'more content 2',
            '',
            '> blockquote paragraph one',
            '>',
            '> blockquote paragraph two',
            '>',
            '> > # nested blockquote header',
            '> >',
            '> > nested blockquote paragraph',
            '',
            'content after',
        ].join('\n');
        const result = renderer.render(md.parse(markdown, {}));
        expect(result).toBe(markdown);
    });

    it('roundtrips lists', () => {
        const markdown = [
            'content',
            '',
            '* single item list',
            '',
            'more content',
            '',
            '* list item 1',
            '* list item 2',
            '    * nested item A',
            '    * nested item B',
            '* list item 3',
            '',
            'more content 2',
            '',
            '1. ordered item 1',
            '2. ordered item 2',
            '    1. nested ordered item A',
            '    2. nested ordered item B',
            '3. ordered item 3',
            '',
            'more content 3',
            '',
            '1. ordered item 1',
            '2. ordered item 2',
            '    * nested unordered item A',
            '    * nested unordered item B',
            '3. ordered item 3',
            '',
            'content after',
        ].join('\n');
        const result = renderer.render(md.parse(markdown, {}));
        expect(result).toBe(markdown);
    });

    it('renders custom tokens', () => {
        const markdown = '!!! note "Title"\n    test content';
        const tokens: Token[] = [];
        tokens.push(new Token('aside_open', 'aside', 1));
        tokens[tokens.length - 1].attrPush(['title', 'Title']);
        tokens.push(new Token('inline', '', 0));
        tokens[tokens.length - 1].children = [new Token('text', '', 0)];
        tokens[tokens.length - 1].children![0].content = 'test content';
        tokens.push(new Token('aside_close', 'aside', -1));

        const render = () => renderer.render(tokens);
        expect(render).toThrowError(RenderRuleNotFoundError);

        // this is a simple implementation of markdown "admonitions"
        // see https://python-markdown.github.io/extensions/admonition/
        renderer.renderRules.aside = (children, attrs) => [
            `!!! note "${attrs?.title}"`,
            ...flatten(children).map(child => `    ${child}`),
        ];

        const result = renderer.render(tokens);
        expect(result).toBe(markdown);
    });
});
