markdown-it-from-html

A way to reverse markdown-it, rendering HTML back to markdown.

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
