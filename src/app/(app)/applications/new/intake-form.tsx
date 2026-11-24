"use client";

import { startTransition, useActionState, useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { DOC_KINDS, PURPOSES } from "@/lib/types";
import { place } from "@/lib/places";
import { Button, Card, inputClass } from "@/components/ui";
import { createApplication } from "./actions";

// downscale phone photos before upload (~4MB -> ~200KB)
async function compressImage(file: File, maxSide = 1600, quality = 0.8): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
}

export function IntakeForm({ villages }: { villages: string[] }) {
  const { lang, t } = useI18n();
  const [state, action, pending] = useActionState(createApplication, undefined);
  const [preparing, setPreparing] = useState(false);

  async function onSubmit(form: FormData) {
    setPreparing(true);
    try {
      for (const kind of DOC_KINDS) {
        const f = form.get(`doc_${kind}`);
        if (f instanceof File && f.size > 0) form.set(`doc_${kind}`, await compressImage(f));
      }
    } finally {
      setPreparing(false);
    }
    // the await ends the form's transition, so start a new one
    startTransition(() => action(form));
  }

  const label = (text: string, required = true) => (
    <span className="mb-1 block text-sm font-medium text-ink-2">
      {text}
      {required && <span className="text-critical"> *</span>}
    </span>
  );

  return (
    <form action={onSubmit} className="space-y-4">
      <Card className="grid gap-3 p-4 sm:grid-cols-2">
        <h2 className="font-semibold sm:col-span-2">{t.intake.applicantSection}</h2>
        <label>
          {label(t.intake.nameTe)}
          <input name="applicantNameTe" required lang="te" className={inputClass} />
        </label>
        <label>
          {label(t.intake.nameEn)}
          <input name="applicantNameEn" required className={inputClass} />
        </label>
        <label>
          {label(t.app.relation)}
          <input name="relationNameTe" required lang="te" className={inputClass} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label>
            {label(t.app.age)}
            <input name="age" type="number" min={1} max={120} required className={inputClass} />
          </label>
          <label>
            {label(t.app.gender)}
            <select name="gender" required className={inputClass}>
              {(["F", "M", "O"] as const).map((g) => (
                <option key={g} value={g}>
                  {t.app.genders[g]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          {label(t.app.aadhaar)}
          <input name="aadhaarLast4" inputMode="numeric" pattern="\d{4}" maxLength={4} required className={inputClass} />
        </label>
        <label>
          {label(t.app.phone)}
          <input name="phone" type="tel" inputMode="numeric" pattern="[6-9]\d{9}" maxLength={10} required className={inputClass} />
        </label>
        <label>
          {label(t.app.village)}
          <select name="village" required className={inputClass}>
            {villages.map((v) => (
              <option key={v} value={v}>
                {place(v, lang)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {label(t.app.address)}
          <input name="address" required className={inputClass} />
        </label>
      </Card>

      <Card className="grid gap-3 p-4 sm:grid-cols-2">
        <h2 className="font-semibold sm:col-span-2">{t.intake.incomeSection}</h2>
        <label>
          {label(t.app.occupation)}
          <input name="occupation" required className={inputClass} />
        </label>
        <label>
          {label(t.app.declaredIncome)}
          <input name="declaredIncome" type="number" min={0} step={1000} required className={inputClass} />
        </label>
        <label>
          {label(t.app.purpose)}
          <select name="purpose" required className={inputClass}>
            {PURPOSES.map((p) => (
              <option key={p} value={p}>
                {t.purposes[p]}
              </option>
            ))}
          </select>
        </label>
        <label>
          {label(t.app.purposeDeadline, false)}
          <input name="purposeDeadline" type="date" className={inputClass} />
        </label>
      </Card>

      <Card className="space-y-3 p-4">
        <h2 className="font-semibold">{t.intake.docsSection}</h2>
        {(["aadhaar", "ration_card", "income_proof"] as const).map((k) => (
          <label key={k} className="block">
            {label(`${t.docKinds[k]} · ${t.intake.docHint}`, false)}
            <input
              name={`doc_${k}`}
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              className="block w-full text-sm file:mr-3 file:min-h-10 file:rounded-xl file:border-0 file:bg-brand-soft file:px-4 file:font-semibold file:text-brand"
            />
          </label>
        ))}
      </Card>

      {state?.error && (
        <p role="alert" className="rounded-lg bg-critical-soft px-3 py-2 text-sm text-critical">
          {state.error === "fileTooLarge"
            ? t.intake.fileTooLarge
            : state.error === "fileType"
              ? t.intake.fileType
              : t.intake.required}
        </p>
      )}
      <Button type="submit" disabled={pending || preparing} className="w-full sm:w-auto">
        {preparing ? t.intake.preparing : pending ? t.saving : t.intake.submit}
      </Button>
    </form>
  );
}
