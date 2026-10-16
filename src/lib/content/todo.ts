import { isTodo } from '../text';

export type TodoVisibility = 'show' | 'mark' | 'hide';

/**
 * Gate G1 default: `TODO(autor)` placeholders never reach production markup, and are drawn with a
 * visible marker while authoring. Switching to "visible in production" means changing this one
 * function (return 'show' for production) plus the matching e2e expectation.
 */
export function todoVisibility(values: readonly unknown[], isDev: boolean): TodoVisibility {
  if (!values.some(isTodo)) return 'show';
  return isDev ? 'mark' : 'hide';
}

/** Drops placeholder items in production; in development keeps them flagged with `marked`. */
export function withTodoVisibility<T>(
  items: readonly T[],
  textsOf: (item: T) => readonly unknown[],
  isDev: boolean,
): { item: T; marked: boolean }[] {
  return items.flatMap((item) => {
    const visibility = todoVisibility(textsOf(item), isDev);
    return visibility === 'hide' ? [] : [{ item, marked: visibility === 'mark' }];
  });
}
