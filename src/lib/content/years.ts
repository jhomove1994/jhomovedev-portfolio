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

/** Any `{word}` left after filling is a mistyped token (`{year}`, `{ years }`) that would render as-is. */
const LEFTOVER_TOKEN = /\{\s*[a-z]+\s*\}/i;

function filled(field: string, text: string, years: number): string {
  const result = fillYears(text, years);
  const leftover = LEFTOVER_TOKEN.exec(result);
  if (leftover) {
    throw new Error(
      `Profile ${field} contains "${leftover[0]}". Write ${YEARS_TOKEN} exactly where the years of experience go.`,
    );
  }
  return result;
}

/**
 * The profile with `{years}` filled in the texts that may mention the years of experience. A
 * mistyped token fails the build, so the previous deployment stays live instead of showing it.
 */
export function withYears<T extends ProfileTexts>(profile: T): T {
  const years = profile.yearsExperience;
  return {
    ...profile,
    bio: filled('bio', profile.bio, years),
    whoami: filled('whoami', profile.whoami, years),
    seo: { ...profile.seo, description: filled('seo.description', profile.seo.description, years) },
  };
}
