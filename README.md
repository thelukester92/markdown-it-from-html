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

## Special Notes

### Line Breaks (`br` tags)

By default, `br` tags are converted into hard breaks (two empty spaces followed by a newline).
To treat any tags as softbreaks in the resulting markdown, the default render rule checks for `data-softbreak="true"`.
This can be overridden or changed in the renderer by modifying the render rule for the `br` tag.

### Format Preservation

Both `_` and `*` can be used for emphasis (bold or italic).
By default, the HTML parser will use `_underscore_` for `<em>` tags and `**double asterisks**` for `<strong>` tags.
To set this value on a per-tag basis, the parser will respect the `data-markup` attribute of these tags.
For example, `<em data-markup="*">` will result in `*single asterisk italics*`, and `<strong data-markup="__">` will result in `__double underscore bold__`.
Only `_` and `*` are allowed for `em`, and only `__` and `**` are allowed for `strong`.

### Tables

This library currently supports rendering basic tables, with the following restrictions:

* No table headers (or alignment)
* Single-line cell content only
