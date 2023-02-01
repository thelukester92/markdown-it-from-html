markdown-it-from-html

A way to reverse markdown-it, rendering HTML back to markdown.
It only works with a small set of HTML tags, but can be extended to include more.
The use case for this is an app that stores data as markdown but renders to WYSIWYG editor as HTML.
To save back to the database, this package can convert the (user-updated) HTML back into markdown.

## Installation

```
yarn add @thelukester92/markdown-it-from-html
npm install @thelukester92/markdown-it-from-html
```

## Usage

```
import { HtmlParser, MarkdownRenderer } from '@thelukester92/markdown-it-from-html';

const parser = new HtmlParser();
cont renderer = new MarkdownRenderer();

const rawHtml = '<em>test</em>';
const markdown = renderer.render(parser.parse(rawHtml));
console.log(markdown);
// results in '*test*'
```
