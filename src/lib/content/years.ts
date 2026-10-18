/**
 * Years of experience live in one number (`profile.yearsExperience`). Texts that mention them write
 * `{years}` instead, so updating the number in the CMS updates every sentence at once.
 */
export const YEARS_TOKEN = '{years}';

export function fillYears(text: string, years: number): string {
  return text.replaceAll(YEARS_TOKEN, String(years));
}

interface ProfileTexts {
  yearsExperience: number;
  bio: string;
  whoami: string;
  seo: { title: string; description: string };
}

/** The profile with `{years}` filled in the texts that may mention the years of experience. */
export function withYears<T extends ProfileTexts>(profile: T): T {
  const years = profile.yearsExperience;
  return {
    ...profile,
    bio: fillYears(profile.bio, years),
    whoami: fillYears(profile.whoami, years),
    seo: { ...profile.seo, description: fillYears(profile.seo.description, years) },
  };
}
