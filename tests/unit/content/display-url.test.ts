import { describe, expect, it } from 'vitest';
import { displayUrl } from '../../../src/lib/content/display-url';

describe('displayUrl', () => {
  it('drops the scheme and a trailing slash', () => {
    expect(displayUrl('https://example.com/in/someone/')).toBe('example.com/in/someone');
  });

  it('drops a leading www', () => {
    expect(displayUrl('http://www.example.com/x')).toBe('example.com/x');
  });

  it('keeps the query string out of the label', () => {
    expect(displayUrl('https://example.com/p?utm=1#top')).toBe('example.com/p');
  });

  it('returns the input unchanged when it is not a URL', () => {
    expect(displayUrl('not a url')).toBe('not a url');
  });
});
