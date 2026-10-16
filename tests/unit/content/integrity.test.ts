import { describe, expect, it } from 'vitest';
import { findDanglingRefs } from '../../../src/lib/content/integrity';

const known = ['typescript', 'nestjs', 'aws-lambda'];

describe('findDanglingRefs', () => {
  it('reports a dangling id naming the id and the file', () => {
    const refs = [{ file: 'experience/es/gisoft.md', ids: ['typescript', 'cobol'] }];
    expect(findDanglingRefs(refs, known)).toEqual([
      { file: 'experience/es/gisoft.md', id: 'cobol' },
    ]);
  });

  it('is empty when every id resolves', () => {
    const refs = [
      { file: 'experience/es/a.md', ids: ['typescript'] },
      { file: 'projects/en/b.md', ids: ['nestjs', 'aws-lambda'] },
    ];
    expect(findDanglingRefs(refs, known)).toEqual([]);
  });

  it('is empty for no references at all', () => {
    expect(findDanglingRefs([], known)).toEqual([]);
    expect(findDanglingRefs([{ file: 'x.md', ids: [] }], [])).toEqual([]);
  });

  it('reports every dangling id across files in input order', () => {
    const refs = [
      { file: 'a.md', ids: ['one', 'typescript', 'two'] },
      { file: 'b.md', ids: ['three'] },
    ];
    expect(findDanglingRefs(refs, known)).toEqual([
      { file: 'a.md', id: 'one' },
      { file: 'a.md', id: 'two' },
      { file: 'b.md', id: 'three' },
    ]);
  });

  it('is case-sensitive, because ids come from kebab-case filenames', () => {
    expect(findDanglingRefs([{ file: 'a.md', ids: ['TypeScript'] }], known)).toHaveLength(1);
  });

  it('accepts any iterable of known ids', () => {
    expect(findDanglingRefs([{ file: 'a.md', ids: ['x'] }], new Set(['x']))).toEqual([]);
  });
});
