import { describe, expect, it } from 'vitest';
import { terminalLabels } from '../../../src/i18n/ui';
import { shippableLabels } from '../../../src/lib/terminal/labels';
import { makeData } from './fixtures';

describe('shippableLabels', () => {
  const labels = terminalLabels('en');

  it('drops the WhatsApp label while the contact has no WhatsApp link', () => {
    const shipped = shippableLabels(labels, makeData('en'));
    expect(labels.contactWhatsapp).toBe('WhatsApp');
    expect('contactWhatsapp' in shipped).toBe(false);
  });

  it('keeps it once a WhatsApp link exists', () => {
    const data = makeData('en');
    const withLink = makeData('en', {
      contact: { ...data.contact, whatsapp: 'https://chat.example.com/x' },
    });
    expect(shippableLabels(labels, withLink)).toEqual(labels);
  });

  it('leaves every other label untouched', () => {
    const shipped = shippableLabels(labels, makeData('en'));
    expect({ ...shipped, contactWhatsapp: 'WhatsApp' }).toEqual(labels);
  });
});
