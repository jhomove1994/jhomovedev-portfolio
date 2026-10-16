const BULLET = /^[-*+](?:\s+(.*))?$/;

/**
 * Items of a Markdown bullet list, as stored by the admin's markdown widget. Only the list
 * structure is interpreted (no inline Markdown), so the output is plain text safe to render.
 * An indented line continues the previous item; text without any marker is a single item.
 */
export function parseBulletList(markdown: string): string[] {
  const items: string[] = [];
  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (line.trim() === '') continue;
    const bullet = BULLET.exec(line.trimStart());
    const continuation = /^\s/.test(line) && items.length > 0 && !BULLET.test(line.trimStart());
    if (bullet) {
      items.push((bullet[1] ?? '').trim());
    } else if (continuation) {
      items[items.length - 1] = `${items[items.length - 1]} ${line.trim()}`;
    } else {
      items.push(line.trim());
    }
  }
  return items.filter((item) => item !== '');
}
