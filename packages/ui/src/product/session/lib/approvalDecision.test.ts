import { describe, expect, it } from "vitest";
import { approvalDecisionFromMeta } from "./approvalDecision";

describe("approvalDecisionFromMeta", () => {
  it("reads the runtime decision from the contenox.approval key", () => {
    expect(
      approvalDecisionFromMeta({
        "contenox.approval": {
          decidedBy: "oracle",
          approved: true,
          note: "Approved by Oracle: part of your request",
        },
      }),
    ).toEqual({
      decidedBy: "oracle",
      approved: true,
      note: "Approved by Oracle: part of your request",
    });
  });

  it("ignores meta without a decision or with a malformed one", () => {
    expect(approvalDecisionFromMeta(undefined)).toBeNull();
    expect(approvalDecisionFromMeta({})).toBeNull();
    expect(approvalDecisionFromMeta({ error: "boom" })).toBeNull();
    expect(approvalDecisionFromMeta({ "contenox.approval": "yes" })).toBeNull();
    expect(approvalDecisionFromMeta({ "contenox.approval": { decidedBy: "inbox" } })).toBeNull();
  });

  it("fills missing strings so the caller never renders undefined", () => {
    expect(approvalDecisionFromMeta({ "contenox.approval": { approved: false } })).toEqual({
      decidedBy: "",
      approved: false,
      note: "",
    });
  });
});
