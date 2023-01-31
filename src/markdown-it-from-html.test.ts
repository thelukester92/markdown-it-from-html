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
    it('round-trips markdown, maintaining integrity', () => {
        const md = new MarkdownIt();
        const tokens = md.parse(testMarkdown, {});
        const result = new Renderer().render(tokens);
        expect(result).toBe(testMarkdown);
    });
});
