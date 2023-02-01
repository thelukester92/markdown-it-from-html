import MarkdownIt from 'markdown-it';
import { Renderer } from './markdown-it-from-html';

const testMarkdown = `## Heading

A paragraph with *emphases*, *different emphases*, **bold**, and even ***bold italics***.

* Unordered list item 1
* Unordered list item 2
    * Nested list item A
    * Nested list item B
* Unordered list item 3

Some other paragraph.

1. Ordered list item 1
2. Ordered list item 2

> a blockquote down here
>
> with two paragraphs inside
>
> * and a list
>     * inside a list
>
> > and nested blockquote here
> >
> > with a second paragraph
>
> foo

and a closing paragraph here`;

describe('markdown-it-from-html', () => {
    let md: MarkdownIt;
    const renderer = new Renderer();

    beforeEach(() => {
        md = new MarkdownIt();
    });

    it('roundtrips h1', () => {
        const markdown = '# test';
        const result = renderer.render(md.parse(markdown, {}));
        expect(result).toBe(markdown);
    });

    it('roundtrips h2', () => {
        const markdown = '## test';
        const result = renderer.render(md.parse(markdown, {}));
        expect(result).toBe(markdown);
    });

    it('roundtrips h3', () => {
        const markdown = '### test';
        const result = renderer.render(md.parse(markdown, {}));
        expect(result).toBe(markdown);
    });

    it('roundtrips h4', () => {
        const markdown = '#### test';
        const result = renderer.render(md.parse(markdown, {}));
        expect(result).toBe(markdown);
    });

    it('roundtrips h5', () => {
        const markdown = '##### test';
        const result = renderer.render(md.parse(markdown, {}));
        expect(result).toBe(markdown);
    });

    it('roundtrips h6', () => {
        const markdown = '###### test';
        const result = renderer.render(md.parse(markdown, {}));
        expect(result).toBe(markdown);
    });

    it('roundtrips markdown, maintaining integrity', () => {
        const md = new MarkdownIt();
        const tokens = md.parse(testMarkdown, {});
        const result = new Renderer().render(tokens);
        expect(result).toBe(testMarkdown);
    });
});
