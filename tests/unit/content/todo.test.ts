import { describe, expect, it } from 'vitest';
import { todoVisibility, withTodoVisibility } from '../../../src/lib/content/todo';

describe('todoVisibility (G1 default: hidden in production, marked in development)', () => {
  it('shows content without placeholders in both environments', () => {
    expect(todoVisibility(['Led the team', 'Shipped it'], false)).toBe('show');
    expect(todoVisibility(['Led the team', 'Shipped it'], true)).toBe('show');
  });

  it('hides a placeholder in production', () => {
    expect(todoVisibility(['TODO(autor): add evidence'], false)).toBe('hide');
  });

  it('marks a placeholder in development instead of hiding it', () => {
    expect(todoVisibility(['TODO(autor): add evidence'], true)).toBe('mark');
  });

  it('treats a single placeholder among real fields as a placeholder', () => {
    expect(todoVisibility(['Real title', '  TODO(autor): evidence'], false)).toBe('hide');
    expect(todoVisibility(['Real title', '  TODO(autor): evidence'], true)).toBe('mark');
  });

  it('ignores non-string values and mid-text mentions', () => {
    expect(todoVisibility([undefined, 3, 'Fix the TODO(autor) later'], false)).toBe('show');
  });
});

describe('withTodoVisibility', () => {
  const items = [
    { id: 'a', texts: ['Real', 'Real evidence'] },
    { id: 'b', texts: ['TODO(autor): title', 'TODO(autor): evidence'] },
    { id: 'c', texts: ['Real', 'TODO(autor): evidence'] },
    { id: 'd', texts: ['Another', 'Proof'] },
  ];

  it('drops placeholder items in production and keeps the order', () => {
    const result = withTodoVisibility(items, (item) => item.texts, false);
    expect(result.map(({ item }) => item.id)).toEqual(['a', 'd']);
    expect(result.every(({ marked }) => marked === false)).toBe(true);
  });

  it('keeps every item in development and flags the placeholders', () => {
    const result = withTodoVisibility(items, (item) => item.texts, true);
    expect(result.map(({ item, marked }) => [item.id, marked])).toEqual([
      ['a', false],
      ['b', true],
      ['c', true],
      ['d', false],
    ]);
  });

  it('returns an empty list when every item is a placeholder in production', () => {
    const onlyTodos = [items[1]!, items[2]!];
    expect(withTodoVisibility(onlyTodos, (item) => item.texts, false)).toEqual([]);
  });
});
