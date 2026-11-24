import { requireUser } from "@/lib/auth";
import { getDict } from "@/lib/i18n/server";
import { villagesFor } from "@/lib/jurisdiction";
import { DEMO_VILLAGES } from "@/lib/places";
import { IntakeForm } from "./intake-form";

export default async function NewApplicationPage() {
  const user = await requireUser();
  const { t } = await getDict();
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-bold">{t.intake.title}</h1>
        <p className="text-sm text-muted">{t.intake.intro}</p>
      </div>
      <IntakeForm villages={villagesFor(user, DEMO_VILLAGES)} />
    </div>
  );
}
