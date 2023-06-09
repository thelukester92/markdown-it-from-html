import { HtmlParser, inlineTokenResolver } from './html-parser';
import { MarkdownRenderer } from './markdown-renderer';

const testHtml = `<h1>Header</h1>
<p>Paragraph with <a href="test">a link</a>, <em>emphasis</em>, <strong>strong</strong>, and <em><strong>both</strong></em>.</p>
<hr />
<ul>
    <li>
        <p>with lists</p>
    </li>
    <li>
        <p>and nested lists</p>
        <ul>
            <li>
                <p>like this</p>
            </li>
        </ul>
    </li>
</ul>`;

const expectedMarkdown = `# Header

Paragraph with [a link](test), _emphasis_, **strong**, and _**both**_.

***

* with lists
* and nested lists
    * like this`;

describe('HtmlParser', () => {
    let parser: HtmlParser;
    const renderer = new MarkdownRenderer();

    beforeEach(() => {
        parser = new HtmlParser();
    });

    it('parses and renders expected content', () => {
        const rendered = renderer.render(parser.parse(testHtml));
        expect(rendered).toBe(expectedMarkdown);
    });

    it('respects custom tag resolvers', () => {
        const input = '<sup>test</sup>';
        const parse = () => parser.parse(input);
        expect(parse).toThrow();
        parser.tags.sup = inlineTokenResolver('sup');
        const result = parse();
        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('inline');
        expect(result[0].children).toHaveLength(3);
        expect(result[0].children![0].type).toBe('sup_open');
        expect(result[0].children![1].type).toBe('text');
        expect(result[0].children![2].type).toBe('sup_close');
    });
});
