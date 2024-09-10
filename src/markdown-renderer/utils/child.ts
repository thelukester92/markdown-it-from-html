/** Treat every line of rendered children as a child of the current token. */
export const flatten = (children: string[][]): string[] => ([] as string[]).concat(...children);

/** Join every line of rendered children as a single line, e.g. for inline tokens. */
export const inline = (children: string[][]): string => flatten(children).join('');
