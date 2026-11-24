// villages === null means the whole mandal (Tahsildar).
// Callers return 404 (not 403) for records outside jurisdiction.
export type Jurisdiction = { mandal: string; villages: string[] | null };

export function canView(user: Jurisdiction, app: { mandal: string; village: string }): boolean {
  if (app.mandal !== user.mandal) return false;
  return user.villages === null || user.villages.includes(app.village);
}

export function villagesFor(user: Jurisdiction, mandalVillages: readonly string[]): string[] {
  return user.villages === null ? [...mandalVillages] : mandalVillages.filter((v) => user.villages!.includes(v));
}
