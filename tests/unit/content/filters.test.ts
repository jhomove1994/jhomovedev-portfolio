import { describe, expect, it } from 'vitest';
import { isPublished, sortByOrder } from '../../../src/lib/content/filters';

const project = (id: string, published: boolean) => ({ id, data: { published } });

describe('isPublished', () => {
  it('excludes drafts: 3 projects with 1 draft leave 2', () => {
    const projects = [project('a', true), project('b', false), project('c', true)];
    expect(projects.filter(isPublished).map((p) => p.id)).toEqual(['a', 'c']);
  });

  it('leaves nothing when every project is a draft', () => {
    const drafts = [project('a', false), project('b', false)];
    expect(drafts.filter(isPublished)).toEqual([]);
  });

  it('keeps a published project', () => {
    expect(isPublished(project('a', true))).toBe(true);
    expect(isPublished(project('a', false))).toBe(false);
  });
});

describe('sortByOrder', () => {
  const item = (id: string, order?: number) => ({ id, data: { order } });

  it('sorts ascending by order', () => {
    const sorted = sortByOrder([item('c', 3), item('a', 1), item('b', 2)]);
    expect(sorted.map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('is stable for equal orders', () => {
    const sorted = sortByOrder([item('x', 1), item('y', 1), item('z', 0), item('w', 1)]);
    expect(sorted.map((i) => i.id)).toEqual(['z', 'x', 'y', 'w']);
  });

  it('places items without order last, keeping their relative order', () => {
    const sorted = sortByOrder([item('n1'), item('b', 2), item('n2'), item('a', 1)]);
    expect(sorted.map((i) => i.id)).toEqual(['a', 'b', 'n1', 'n2']);
  });

  it('does not mutate the input', () => {
    const input = [item('b', 2), item('a', 1)];
    const sorted = sortByOrder(input);
    expect(input.map((i) => i.id)).toEqual(['b', 'a']);
    expect(sorted).not.toBe(input);
  });
});
