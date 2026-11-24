import { describe, expect, it } from "vitest";
import { canView, villagesFor } from "./jurisdiction";
import { safeFileName, sniffMime } from "./files";
import { nameDifferences, withNameChecks } from "./name-check";

describe("jurisdiction", () => {
  const tahsildar = { mandal: "చేవెళ్ల", villages: null };
  const gpo = { mandal: "చేవెళ్ల", villages: ["ఆలూరు", "కందవాడ"] };

  it("lets the Tahsildar see the whole mandal but not another mandal", () => {
    expect(canView(tahsildar, { mandal: "చేవెళ్ల", village: "గొల్లపల్లి" })).toBe(true);
    expect(canView(tahsildar, { mandal: "శంకర్‌పల్లి", village: "గొల్లపల్లి" })).toBe(false);
  });

  it("limits a village officer to their own villages", () => {
    expect(canView(gpo, { mandal: "చేవెళ్ల", village: "ఆలూరు" })).toBe(true);
    expect(canView(gpo, { mandal: "చేవెళ్ల", village: "గొల్లపల్లి" })).toBe(false);
    // Same village name in a different mandal is still out of bounds.
    expect(canView(gpo, { mandal: "మొయినాబాద్", village: "ఆలూరు" })).toBe(false);
  });

  it("offers only in-jurisdiction villages on the intake form", () => {
    const all = ["ఆలూరు", "కందవాడ", "గొల్లపల్లి"];
    expect(villagesFor(gpo, all)).toEqual(["ఆలూరు", "కందవాడ"]);
    expect(villagesFor(tahsildar, all)).toEqual(all);
  });
});

describe("upload sniffing", () => {
  const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(16).fill(0)]);

  it("recognises real images and PDFs by their content", () => {
    expect(sniffMime(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(sniffMime(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("image/png");
    expect(sniffMime(new TextEncoder().encode("%PDF-1.7\n..."))).toBe("application/pdf");
    expect(sniffMime(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 "))).toBe("image/webp");
  });

  it("rejects HTML, SVG and executables even if they claim to be images", () => {
    expect(sniffMime(new TextEncoder().encode("<html><script>alert(1)</script>"))).toBeNull();
    expect(sniffMime(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" onload="x()">'))).toBeNull();
    expect(sniffMime(bytes(0x4d, 0x5a))).toBeNull(); // Windows .exe
    expect(sniffMime(new Uint8Array())).toBeNull();
  });

  it("never uses the uploaded filename", () => {
    expect(safeFileName("income_proof", "application/pdf")).toBe("income_proof.pdf");
    expect(safeFileName('../../etc/passwd"\r\n', "image/png")).toBe("etcpasswd.png");
  });
});

describe("name spelling backstop", () => {
  const doc = (document: string, name: string) => ({ document, name, relationName: "", address: "", annualIncome: 0 });
  const ai = {
    extracted: [doc("aadhaar", "ఎస్. ఫాతిమా బేగం"), doc("ration_card", "S. Fatima Begum"), doc("income_proof", "S. Fathima  Begum")],
    checks: [
      { field: "name", status: "match" as const, note: "" },
      { field: "father name", status: "match" as const, note: "" },
    ],
    missingDocuments: [],
    flags: [],
    recommendation: "verify" as const,
    summary: "",
    returnReasonDraft: "",
  };

  it("spots Fatima vs Fathima but ignores spacing, case and Telugu script", () => {
    expect(nameDifferences("S. Fathima Begum", ai.extracted)).toEqual([
      { document: "ration_card", printed: "S. Fatima Begum", onForm: "S. Fathima Begum" },
    ]);
    expect(nameDifferences("s fathima begum", [doc("aadhaar", "S. FATHIMA BEGUM")])).toEqual([]);
  });

  it("turns the AI's 'match' into 'unclear' and adds a flag, leaving other checks alone", () => {
    const out = withNameChecks(ai, "S. Fathima Begum", "en");
    expect(out.checks[0].status).toBe("unclear");
    expect(out.checks[1].status).toBe("match");
    expect(out.flags[0]).toMatch(/^Name spelled differently: "S\. Fatima Begum" on the .*ration.* card, "S\. Fathima Begum" on the form/);
    expect(out.flags).toHaveLength(1);
    const byFile = withNameChecks({ ...ai, extracted: [doc("fathima-ration.png", "S. Fatima Begum")] }, "S. Fathima Begum", "te");
    expect(byFile.flags[0]).toContain("రేషన్");
    expect(withNameChecks(ai, "S. Fatima Begum", "en").flags).toHaveLength(1); // the income proof now differs
    expect(withNameChecks({ ...ai, extracted: [] }, "S. Fathima Begum", "te")).toEqual({ ...ai, extracted: [] });
  });
});
