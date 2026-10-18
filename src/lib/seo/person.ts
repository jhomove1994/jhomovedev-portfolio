export type PersonInput = {
  name: string;
  /** Profile headline; the part before the first "·" is used as the job title. */
  headline: string;
  description: string;
  /** Canonical URL of the page. */
  url: string;
  /** Absolute share image URL. */
  image?: string | undefined;
  email?: string | undefined;
  linkedin?: string | undefined;
  /** "Locality, Country"; any other shape produces no address. */
  location?: string | undefined;
  languages: { name: string }[];
};

export type PersonJsonLd = Record<string, unknown>;

function postalAddress(location: string | undefined): PersonJsonLd | undefined {
  const parts = (location ?? '').split(',').map((part) => part.trim());
  const [addressLocality, addressCountry] = parts;
  if (parts.length !== 2 || !addressLocality || !addressCountry) return undefined;
  return { '@type': 'PostalAddress', addressLocality, addressCountry };
}

/** schema.org Person built only from profile content; unset fields are left out. */
export function buildPersonJsonLd(input: PersonInput): PersonJsonLd {
  const jobTitle = input.headline.split('·')[0]?.trim() || input.headline.trim();
  const address = postalAddress(input.location);
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: input.name,
    jobTitle,
    description: input.description,
    url: input.url,
    ...(input.image ? { image: input.image } : {}),
    ...(input.linkedin ? { sameAs: [input.linkedin] } : {}),
    ...(input.email ? { email: input.email } : {}),
    ...(address ? { address } : {}),
    ...(input.languages.length > 0
      ? { knowsLanguage: input.languages.map((language) => language.name) }
      : {}),
  };
}

/** JSON for an inline `<script type="application/ld+json">`: `<` is escaped so it cannot close the tag. */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replaceAll('<', '\\u003c');
}
