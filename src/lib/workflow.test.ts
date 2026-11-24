import { describe, expect, it } from "vitest";
import { availableActions, checkTransition, stepIndex } from "./workflow";
import { computePriority } from "./priority";

describe("workflow transitions", () => {
  it("moves an application through all three steps to approval", () => {
    expect(checkTransition("field_officer", "scrutiny", "verify_documents")).toEqual({
      ok: true,
      to: "field_enquiry",
    });
    expect(checkTransition("field_officer", "field_enquiry", "submit_enquiry")).toEqual({
      ok: true,
      to: "decision",
    });
    expect(checkTransition("tahsildar", "decision", "approve")).toEqual({ ok: true, to: "approved" });
  });

  it("only lets the Tahsildar decide", () => {
    expect(checkTransition("field_officer", "decision", "approve")).toEqual({
      ok: false,
      error: "not_permitted",
    });
    expect(checkTransition("tahsildar", "scrutiny", "verify_documents")).toEqual({
      ok: false,
      error: "not_permitted",
    });
  });

  it("requires a reason to reject, return or send back", () => {
    expect(checkTransition("tahsildar", "decision", "reject", "  ")).toEqual({
      ok: false,
      error: "remarks_required",
    });
    expect(checkTransition("field_officer", "scrutiny", "return_to_applicant", "Ration card missing")).toEqual({
      ok: true,
      to: "returned",
    });
    expect(checkTransition("tahsildar", "decision", "send_back", "Verify land")).toEqual({
      ok: true,
      to: "field_enquiry",
    });
  });

  it("rejects actions from the wrong stage", () => {
    expect(checkTransition("demo", "approved", "reject", "x")).toEqual({ ok: false, error: "invalid_stage" });
    expect(checkTransition("demo", "scrutiny", "approve")).toEqual({ ok: false, error: "invalid_stage" });
  });

  it("lists actions per role and stage", () => {
    expect(availableActions("field_officer", "scrutiny")).toEqual(["verify_documents", "return_to_applicant"]);
    expect(availableActions("tahsildar", "decision")).toEqual([
      "approve",
      "reject",
      "return_to_applicant",
      "send_back",
    ]);
    expect(availableActions("tahsildar", "scrutiny")).toEqual([]);
    expect(availableActions("demo", "approved")).toEqual([]);
    expect(availableActions("demo", "returned")).toEqual(["resubmit"]);
  });

  it("maps stages onto the 3-step progress bar", () => {
    expect(["scrutiny", "field_enquiry", "decision", "approved"].map((s) => stepIndex(s as never))).toEqual([
      0, 1, 2, 3,
    ]);
  });
});

describe("priority", () => {
  const now = new Date("2026-11-23T10:00:00+05:30");
  const base = { stage: "scrutiny" as const, purposeDeadline: null, flagCount: 0, returnCount: 0 };
  const inDays = (d: number) => new Date(now.getTime() + d * 86400000);

  it("puts overdue work above work due soon, and due soon above the rest", () => {
    const overdue = computePriority({ ...base, dueAt: inDays(-1) }, now);
    const dueSoon = computePriority({ ...base, dueAt: inDays(1) }, now);
    const later = computePriority({ ...base, dueAt: inDays(6) }, now);
    expect(overdue.reasons).toContain("overdue");
    expect(dueSoon.reasons).toContain("due_soon");
    expect(overdue.score).toBeGreaterThan(dueSoon.score);
    expect(dueSoon.score).toBeGreaterThan(later.score);
    expect(overdue.daysLeft).toBe(-1);
  });

  it("raises applications whose citizen deadline is close", () => {
    const withDeadline = computePriority({ ...base, dueAt: inDays(5), purposeDeadline: "2026-11-25" }, now);
    const without = computePriority({ ...base, dueAt: inDays(5) }, now);
    expect(withDeadline.reasons).toContain("purpose_deadline");
    expect(withDeadline.purposeDaysLeft).toBe(2);
    expect(withDeadline.score).toBeGreaterThan(without.score);
  });

  it("counts AI flags, capped at three", () => {
    const three = computePriority({ ...base, dueAt: inDays(5), flagCount: 3 }, now);
    const ten = computePriority({ ...base, dueAt: inDays(5), flagCount: 10 }, now);
    expect(three.score).toBe(ten.score);
    expect(three.reasons).toContain("ai_flags");
  });

  it("does not rank closed or returned applications", () => {
    expect(computePriority({ ...base, stage: "returned", dueAt: inDays(-5) }, now).score).toBe(0);
    expect(computePriority({ ...base, stage: "approved", dueAt: inDays(-5) }, now).score).toBe(0);
  });

  it("uses IST calendar days, not 24-hour windows", () => {
    const lateNight = new Date("2026-11-23T23:30:00+05:30");
    const dueNextMorning = new Date("2026-11-24T09:00:00+05:30");
    expect(computePriority({ ...base, dueAt: dueNextMorning }, lateNight).daysLeft).toBe(1);
  });
});
