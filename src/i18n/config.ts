export const defaultLocale = "en" as const;
export const supportedLocales = [defaultLocale] as const;

export type AppLocale = (typeof supportedLocales)[number];
