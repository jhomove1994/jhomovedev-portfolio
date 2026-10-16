import { describe, expect, it } from 'vitest';
import { groupByKind } from '../../../src/lib/content/group';
import { parseBulletList } from '../../../src/lib/content/markdown-list';
import { resolveStackNames } from '../../../src/lib/content/stack-names';

describe('parseBulletList', () => {
  it('splits a Markdown bullet list into trimmed items', () => {
    expect(parseBulletList('- one\n- two  \n-   three')).toEqual(['one', 'two', 'three']);
  });

  it('accepts * and + markers and ignores blank lines', () => {
    expect(parseBulletList('* one\n\n+ two\r\n- three')).toEqual(['one', 'two', 'three']);
  });

  it('joins an indented continuation line to the previous item', () => {
    expect(parseBulletList('- first line\n  second line\n- next')).toEqual([
      'first line second line',
      'next',
    ]);
  });

  it('keeps hyphens that are not at the start of a bullet', () => {
    expect(parseBulletList('- full-stack - end to end')).toEqual(['full-stack - end to end']);
  });

  it('turns plain text without markers into a single item', () => {
    expect(parseBulletList('Just one paragraph')).toEqual(['Just one paragraph']);
  });

  it('returns an empty list for empty or whitespace input', () => {
    expect(parseBulletList('')).toEqual([]);
    expect(parseBulletList('  \n \n')).toEqual([]);
  });

  it('drops bullets that are empty after trimming', () => {
    expect(parseBulletList('- \n- real')).toEqual(['real']);
  });
});

describe('resolveStackNames', () => {
  const catalog = [
    { id: 'angular', data: { name: 'Angular' } },
    { id: 'nodejs', data: { name: 'Node.js' } },
  ];

  it('maps references to catalog names keeping the reference order', () => {
    expect(resolveStackNames([{ id: 'nodejs' }, { id: 'angular' }], catalog)).toEqual([
      'Node.js',
      'Angular',
    ]);
  });

  it('rejects references that are not objects with an id', () => {
    expect(() => resolveStackNames(['angular'], catalog)).toThrow(/reference/i);
    expect(() => resolveStackNames([{ id: 3 }], catalog)).toThrow(/reference/i);
  });

  it('returns an empty list for no references', () => {
    expect(resolveStackNames([], catalog)).toEqual([]);
  });

  it('throws naming the dangling id so a broken reference never ships silently', () => {
    expect(() => resolveStackNames([{ id: 'cobolx' }], catalog)).toThrow(/cobolx/);
  });
});

describe('groupByKind', () => {
  const items = [
    { kind: 'training', name: 'c' },
    { kind: 'certification', name: 'a' },
    { kind: 'education', name: 'b' },
    { kind: 'certification', name: 'a2' },
  ];

  it('groups in the given kind order and keeps item order inside a group', () => {
    const groups = groupByKind(items, ['certification', 'education', 'training']);
    expect(groups.map((g) => g.kind)).toEqual(['certification', 'education', 'training']);
    expect(groups[0]?.items.map((i) => i.name)).toEqual(['a', 'a2']);
  });

  it('omits kinds that have no items', () => {
    const groups = groupByKind(items.slice(0, 2), ['certification', 'education', 'training']);
    expect(groups.map((g) => g.kind)).toEqual(['certification', 'training']);
  });

  it('returns no groups for no items', () => {
    expect(groupByKind([], ['certification'])).toEqual([]);
  });
});
