import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { certificationSchema } from '../../../src/lib/content/schemas';

type Json = Record<string, unknown>;

const valid = (): Json =>
  JSON.parse(
    readFileSync(
      new URL('../../fixtures/content/certification/valid.json', import.meta.url),
      'utf8',
    ),
  ) as Json;

const withFields = (overrides: Json): Json => ({ ...valid(), ...overrides });

describe('certificationSchema', () => {
  it('accepts a complete certification', () => {
    const result = certificationSchema.safeParse(valid());
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      kind: 'certification',
      code: 'EX-01',
      year: 2026,
      credentialUrl: 'https://example.com/credential',
    });
  });

  it('accepts an in-progress training without a credential URL', () => {
    const training = withFields({ kind: 'training', status: 'in-progress' });
    delete training.credentialUrl;
    const result = certificationSchema.safeParse(training);
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ kind: 'training', status: 'in-progress' });
    expect(result.data?.credentialUrl).toBeUndefined();
  });

  it.each(['certification', 'education', 'training'])('accepts the kind %s', (kind) => {
    expect(certificationSchema.parse(withFields({ kind })).kind).toBe(kind);
  });

  it('rejects an unknown kind naming the field', () => {
    const result = certificationSchema.safeParse(withFields({ kind: 'hobby' }));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['kind']);
  });

  it('rejects a status outside completed and in-progress', () => {
    expect(certificationSchema.safeParse(withFields({ status: 'planned' })).success).toBe(false);
  });

  it('defaults the status to completed', () => {
    const noStatus = valid();
    delete noStatus.status;
    expect(certificationSchema.parse(noStatus).status).toBe('completed');
  });

  it('treats the code as optional, including a cleared ""', () => {
    const noCode = valid();
    delete noCode.code;
    expect(certificationSchema.parse(noCode).code).toBeUndefined();
    expect(certificationSchema.parse(withFields({ code: '' })).code).toBeUndefined();
  });

  it('rejects a credential URL that is not a URL naming the field', () => {
    const result = certificationSchema.safeParse(withFields({ credentialUrl: 'credly' }));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['credentialUrl']);
  });

  it('turns cleared credentialUrl and badge ("") into undefined', () => {
    const result = certificationSchema.parse(withFields({ credentialUrl: '', badge: '' }));
    expect(result.credentialUrl).toBeUndefined();
    expect(result.badge).toBeUndefined();
  });

  it('rejects a badge outside /uploads/', () => {
    const result = certificationSchema.safeParse(withFields({ badge: '/tmp/b.png' }));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['badge']);
  });

  it.each([26, 20260, 2026.5, '2026'])('rejects the year %s (4-digit integer required)', (year) => {
    const result = certificationSchema.safeParse(withFields({ year }));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['year']);
  });

  it('requires an integer order', () => {
    expect(certificationSchema.safeParse(withFields({ order: 1.5 })).success).toBe(false);
    const withoutOrder = valid();
    delete withoutOrder.order;
    expect(certificationSchema.safeParse(withoutOrder).success).toBe(false);
  });
});
