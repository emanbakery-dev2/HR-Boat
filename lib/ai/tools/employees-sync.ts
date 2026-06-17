import { tool } from "ai";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars not set");
  return createClient(url, key);
}

const employeeRowSchema = z.object({
  iqama_number: z.string(),
  name: z.string(),
  gender: z.string().optional().nullable(),
  nationality: z.string().optional().nullable(),
  occupation: z.string().optional().nullable(),
  passport_number: z.string().optional().nullable(),
  passport_expiry_date: z.string().optional().nullable(),
  iqama_issue_date: z.string().optional().nullable(),
  iqama_expiry_date: z.string().optional().nullable(),
  birth_date: z.string().optional().nullable(),
  outside_the_kingdom: z.boolean().optional().nullable(),
  hijri_iqama_expiry_date: z.string().optional().nullable(),
  employer_number: z.string().optional().nullable(),
});

/**
 * syncEmployeesFromExcel
 * Called by the agent when the user uploads an employee Excel export.
 * Receives the parsed rows and upserts them into Supabase by iqama_number.
 */
export const syncEmployeesFromExcel = tool({
  description:
    "Sync / upsert employee records extracted from an uploaded Excel export into the Supabase employees table. " +
    "Use this whenever the user uploads or pastes employee data in Excel format. " +
    "Match by iqama_number and update all fields.",
  parameters: z.object({
    employees: z
      .array(employeeRowSchema)
      .describe("Array of employee records parsed from the uploaded Excel file."),
  }),
  execute: async ({ employees }) => {
    const supabase = getSupabase();

    const rows = employees.map((e) => ({
      iqama_number: String(e.iqama_number).replace(/\.0$/, "").trim(),
      name: e.name,
      gender: e.gender ?? null,
      nationality: e.nationality ?? null,
      occupation: e.occupation ?? null,
      passport_number: e.passport_number ?? null,
      passport_expiry_date: e.passport_expiry_date ?? null,
      iqama_issue_date: e.iqama_issue_date ?? null,
      iqama_expiry_date: e.iqama_expiry_date ?? null,
      birth_date: e.birth_date ?? null,
      outside_the_kingdom:
        typeof e.outside_the_kingdom === "boolean"
          ? e.outside_the_kingdom
          : String(e.outside_the_kingdom).toLowerCase() === "yes",
      hijri_iqama_expiry_date: e.hijri_iqama_expiry_date ?? null,
      employer_number: e.employer_number ? String(e.employer_number) : null,
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from("employees")
      .upsert(rows, { onConflict: "iqama_number" })
      .select("iqama_number");

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      synced: data?.length ?? rows.length,
      message: `✅ Successfully synced ${data?.length ?? rows.length} employee records into the database.`,
    };
  },
});
