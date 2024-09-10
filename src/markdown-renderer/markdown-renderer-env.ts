import { ImbalancedTagsError } from '../errors';

export interface MarkdownRendererEnvStackEntry {
  /** The html tag from the token that pushed this entry to the stack. */
  tag: string;

  /** The key-value pairs of the token when this entry was pushed to the stack. */
  attrs?: Record<string, any>;

  /**
   * The rendered children for the current stack entry, built from rendering tokens further down in the DOM tree.
   * Each element is an array of lines (to be joined with newlines) rendered for a token.
   */
  children: string[][];
}

/**
 * A helper class for managing the rendering stack.
 * When a tag is pushed, a new `children` buffer is started.
 * When a tag is popped, the top element is rendered.
 * If there is another `children` buffer, the rendered element is sent there.
 * If there is not, the rendered element is returned to the caller.
 */
export class MarkdownRendererEnv {
  /** The current renderer stack (the last element corresponds with the parent element). */
  private stack: MarkdownRendererEnvStackEntry[] = [];

  /** Peek at the top of the stack without removing it. */
  top(): MarkdownRendererEnvStackEntry | undefined {
    return this.stack[this.stack.length - 1];
  }

  /** Pushes an open tag to the stack, creating a new `children` buffer. */
  pushTag(tag: string, attrs?: MarkdownRendererEnvStackEntry['attrs']): null {
    this.stack.push({ tag, attrs, children: [] });
    return null;
  }

  /** Pops the open tag from the stack for rendering. */
  popTag(tag: string): MarkdownRendererEnvStackEntry {
    const top = this.stack.pop();
    if (!top || top.tag !== tag) {
      throw new ImbalancedTagsError(top?.tag, tag);
    }
    return top;
  }

  /** Push a rendered token into the current `children` buffer and return null, or return it if top-level. */
  pushRendered(children: string[]): string[] {
    if (this.stack.length) {
      this.stack[this.stack.length - 1].children.push(children);
      return [];
    }
    return children;
  }
}
