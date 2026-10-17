// Labels that travel to the browser with the island props. Chrome strings for features the
// content does not use must not ship: the page never mentions WhatsApp unless a link exists.
import type { TerminalData, TerminalLabels } from './types';

export function shippableLabels(labels: TerminalLabels, data: TerminalData): TerminalLabels {
  if (data.contact.whatsapp !== undefined) return labels;
  const shipped: TerminalLabels = { ...labels };
  delete shipped.contactWhatsapp;
  return shipped;
}
