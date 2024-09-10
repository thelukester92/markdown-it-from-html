export interface IndentOpts {
  /** If provided, use this prefix to indent instead of the default (4 spaces). */
  prefix?: string;

  /**
   * If `prefix` is provided and this is true, add a space between the prefix and the line content.
   * Empty lines will not receive the added space.
   */
  addSpace?: boolean;

  /** If true, filter out empty lines. */
  skipEmpty?: boolean;
}

/** Indent or prefix each line. */
export const indent = (children: string[], opts?: IndentOpts): string[] => {
  const lines = children.flatMap(child => child.split('\n'));
  const prefix = opts?.prefix ?? '    ';
  const space = opts?.addSpace ? ' ' : '';
  const filteredLines = opts?.skipEmpty ? lines.filter(x => Boolean(x)) : lines;
  return filteredLines.map(line => (line ? `${prefix}${space}${line}` : prefix));
};
