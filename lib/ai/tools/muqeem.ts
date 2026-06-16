/**
 * Muqeem API tools — lets Gemini call the Saudi Muqeem platform on behalf
 * of the owner.  All API credentials are kept server-side in env vars.
 */

import { tool } from "ai";
import { z } from "zod";

const MUQEEM_BASE_URL = process.env.MUQEEM_BASE_URL ?? "https://muqeem.sa";
const MUQEEM_APP_ID   = process.env.MUQEEM_APP_ID   ?? "";
const MUQEEM_APP_KEY  = process.env.MUQEEM_APP_KEY  ?? "";
const MUQEEM_USERNAME = process.env.MUQEEM_USERNAME ?? "";
const MUQEEM_PASSWORD = process.env.MUQEEM_PASSWORD ?? "";

let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getMuqeemToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const res = await fetch(`${MUQEEM_BASE_URL}/api/authenticate`, {
    method: "POST",
    headers: {
      app_id: MUQEEM_APP_ID,
      app_key: MUQEEM_APP_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username: MUQEEM_USERNAME, password: MUQEEM_PASSWORD }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Muqeem auth failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { id_token?: string; token?: string };
  const token = data.id_token ?? data.token ?? "";
  if (!token) throw new Error("Muqeem auth returned no token");

  cachedToken = token;
  tokenExpiry = Date.now() + 55 * 60 * 1000;
  return token;
}

async function muqeemPost(
  path: string,
  body: Record<string, unknown>
) {
  const token = await getMuqeemToken();
  const res = await fetch(`${MUQEEM_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      app_id: MUQEEM_APP_ID,
      app_key: MUQEEM_APP_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Muqeem ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

// ─── Tools ──────────────────────────────────────────────────────────────────

export const muqeemRenewIqama = tool({
  description:
    "Renew a resident's Iqama via Muqeem. Requires the 10-digit Iqama number starting with 2 and the desired duration in months.",
  inputSchema: z.object({
    iqamaNumber: z
      .string()
      .regex(/^2[0-9]{9}$/, "Iqama number must be 10 digits starting with 2"),
    iqamaDuration: z
      .enum(["3", "6", "9", "12", "15", "18", "21", "24"])
      .describe("Renewal duration in months"),
  }),
  execute: async (input) =>
    muqeemPost("/api/v1/iqama/renew", input),
});

export const muqeemIssueExitReentry = tool({
  description:
    "Issue an exit re-entry visa (single or multiple) for a resident via Muqeem.",
  inputSchema: z.object({
    iqamaNumber: z
      .string()
      .regex(/^2[0-9]{9}$/, "Iqama number must be 10 digits starting with 2"),
    visaType: z
      .number()
      .int()
      .min(1)
      .max(2)
      .describe("1 = Single, 2 = Multiple"),
    visaDuration: z
      .number()
      .int()
      .min(7)
      .optional()
      .describe("Duration in days (minimum 7)"),
    returnBefore: z
      .string()
      .optional()
      .describe("Hijri return-before date YYYY-MM-DD e.g. 1446-01-01"),
  }),
  execute: async (input) => {
    const body: Record<string, unknown> = {
      iqamaNumber: input.iqamaNumber,
      visaType: input.visaType,
    };
    if (input.visaDuration !== undefined) body.visaDuration = input.visaDuration;
    if (input.returnBefore !== undefined) body.returnBefore = input.returnBefore;
    return muqeemPost("/api/v1/exit-reentry/issue", body);
  },
});

export const muqeemCancelExitReentry = tool({
  description: "Cancel an issued exit re-entry visa for a resident via Muqeem.",
  inputSchema: z.object({
    iqamaNumber: z
      .string()
      .regex(/^2[0-9]{9}$/, "Iqama number must be 10 digits starting with 2"),
    visaNumber: z.string().describe("The visa number to cancel"),
  }),
  execute: async (input) =>
    muqeemPost("/api/v1/exit-reentry/cancel", input),
});

export const muqeemExtendExitReentry = tool({
  description:
    "Extend an exit re-entry visa for a resident who is currently outside the Kingdom.",
  inputSchema: z.object({
    iqamaNumber: z
      .string()
      .regex(/^2[0-9]{9}$/, "Iqama number must be 10 digits starting with 2"),
    visaNumber: z.string().describe("Existing visa number to extend"),
    visaDuration: z.number().int().min(7).describe("Extension duration in days"),
    returnBefore: z.string().describe("Hijri return-before date YYYY-MM-DD"),
  }),
  execute: async (input) =>
    muqeemPost("/api/v1/exit-reentry/extend", input),
});

export const muqeemIssueFinalExit = tool({
  description:
    "Issue a final exit visa for a resident (and their dependents) via Muqeem.",
  inputSchema: z.object({
    iqamaNumber: z
      .string()
      .regex(/^2[0-9]{9}$/, "Iqama number must be 10 digits starting with 2"),
    visaType: z.number().int().optional().describe("Visa type code if applicable"),
  }),
  execute: async (input) => {
    const body: Record<string, unknown> = { iqamaNumber: input.iqamaNumber };
    if (input.visaType !== undefined) body.visaType = input.visaType;
    return muqeemPost("/api/v1/final-exit/issue", body);
  },
});

export const muqeemCancelFinalExit = tool({
  description: "Cancel an issued final exit visa for a resident via Muqeem.",
  inputSchema: z.object({
    iqamaNumber: z
      .string()
      .regex(/^2[0-9]{9}$/, "Iqama number must be 10 digits starting with 2"),
    feVisaNumber: z.string().describe("Final exit visa number to cancel"),
  }),
  execute: async (input) =>
    muqeemPost("/api/v1/final-exit/cancel", input),
});

export const muqeemExtendVisitVisa = tool({
  description:
    "Extend a visit visa for a visitor under the organization's sponsorship.",
  inputSchema: z.object({
    borderNumber: z
      .string()
      .regex(
        /^(3|4|5)[0-9]{9}$/,
        "Border number must be 10 digits starting with 3, 4 or 5"
      ),
  }),
  execute: async (input) =>
    muqeemPost("/api/v1/visit-visa/extend", input),
});

export const muqeemCheckMolApproval = tool({
  description:
    "Check Ministry of Labor (MOL) approval to change a resident's occupation.",
  inputSchema: z.object({
    iqamaNumber: z
      .string()
      .regex(/^2[0-9]{9}$/, "Iqama number must be 10 digits starting with 2"),
  }),
  execute: async (input) =>
    muqeemPost("/api/v1/occupation/check-mol-approval", input),
});

export const muqeemChangeOccupation = tool({
  description: "Change a resident's occupation via Muqeem.",
  inputSchema: z.object({
    iqamaNumber: z
      .string()
      .regex(/^2[0-9]{9}$/, "Iqama number must be 10 digits starting with 2"),
  }),
  execute: async (input) =>
    muqeemPost("/api/v1/occupation/change", input),
});

export const muqeemTransferIqama = tool({
  description: "Transfer a resident's Iqama to a new employer (sponsor) via Muqeem.",
  inputSchema: z.object({
    iqamaNumber: z
      .string()
      .regex(/^2[0-9]{9}$/, "Iqama number must be 10 digits starting with 2"),
    newSponsorId: z
      .string()
      .regex(
        /^(1|2|7)[0-9]{9}$/,
        "Sponsor ID must be 10 digits starting with 1, 2 or 7"
      )
      .describe("New employer MOI number"),
  }),
  execute: async (input) =>
    muqeemPost("/api/v1/iqama/transfer", input),
});

export const muqeemRenewPassport = tool({
  description:
    "Update a resident's passport information in Muqeem (new passport number, issue/expiry dates).",
  inputSchema: z.object({
    iqamaNumber: z
      .string()
      .regex(/^2[0-9]{9}$/, "Iqama number must be 10 digits starting with 2"),
    passportNumber: z.string().describe("Current (old) passport number"),
    newPassportNumber: z.string().describe("New passport number"),
    newPassportIssueDate: z
      .string()
      .describe("New passport issue date (YYYY-MM-DD Gregorian)"),
    newPassportExpiryDate: z
      .string()
      .describe("New passport expiry date (YYYY-MM-DD Gregorian)"),
    newPassportIssueLocation: z
      .string()
      .describe("City where new passport was issued"),
  }),
  execute: async (input) =>
    muqeemPost("/api/v1/update-information/renew", input),
});
