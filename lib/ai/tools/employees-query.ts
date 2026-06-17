import { tool } from "ai";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars not set");
  return createClient(url, key);
}

/**
 * queryEmployees
 * General-purpose employee query tool. Supports filtering by nationality,
 * expiry windows, outside-kingdom status, occupation, name search, etc.
 * Returns structured data the agent renders as a rich table/chart in the chat.
 */
export const queryEmployees = tool({
  description:
    "Query the Supabase employees table to answer HR questions. " +
    "Examples: expiring Iqamas, employees outside the kingdom, nationality breakdown, occupation list, passport expiry alerts, specific employee lookup. " +
    "Always use this tool when the user asks anything about employee data, headcounts, expiry dates, or HR statistics.",
  parameters: z.object({
    filter: z
      .object({
        nationality: z.string().optional().describe("Filter by nationality"),
        occupation: z.string().optional().describe("Filter by occupation (partial match)"),
        outside_the_kingdom: z.boolean().optional().describe("Filter by outside-kingdom status"),
        iqama_expiry_before: z
          .string()
          .optional()
          .describe("Return employees whose Iqama expires before this date (YYYY-MM-DD)"),
        iqama_expiry_after: z
          .string()
          .optional()
          .describe("Return employees whose Iqama expires after this date (YYYY-MM-DD)"),
        passport_expiry_before: z
          .string()
          .optional()
          .describe("Return employees whose passport expires before this date (YYYY-MM-DD)"),
        name_search: z.string().optional().describe("Partial name search"),
        iqama_number: z.string().optional().describe("Exact Iqama number lookup"),
      })
      .optional(),
    limit: z.number().optional().default(200).describe("Max rows to return"),
    stats_only: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "If true, return aggregate statistics instead of individual rows: total count, nationality breakdown, outside-kingdom count, expiry counts."
      ),
  }),
  execute: async ({ filter, limit, stats_only }) => {
    const supabase = getSupabase();

    if (stats_only) {
      // Aggregate stats
      const { data: all, error } = await supabase
        .from("employees")
        .select("nationality, outside_the_kingdom, iqama_expiry_date, occupation");

      if (error) return { success: false, error: error.message };
      if (!all || all.length === 0) return { success: true, stats: { total: 0 } };

      const today = new Date();
      const in30 = new Date(today);
      in30.setDate(in30.getDate() + 30);
      const in60 = new Date(today);
      in60.setDate(in60.getDate() + 60);
      const in90 = new Date(today);
      in90.setDate(in90.getDate() + 90);

      const nationalityCount: Record<string, number> = {};
      const occupationCount: Record<string, number> = {};
      let outsideCount = 0;
      let expiring30 = 0;
      let expiring60 = 0;
      let expiring90 = 0;
      let expired = 0;

      for (const emp of all) {
        if (emp.nationality) nationalityCount[emp.nationality] = (nationalityCount[emp.nationality] ?? 0) + 1;
        if (emp.occupation) occupationCount[emp.occupation] = (occupationCount[emp.occupation] ?? 0) + 1;
        if (emp.outside_the_kingdom) outsideCount++;
        if (emp.iqama_expiry_date) {
          const expiry = new Date(emp.iqama_expiry_date);
          if (expiry < today) expired++;
          else if (expiry <= in30) expiring30++;
          else if (expiry <= in60) expiring60++;
          else if (expiry <= in90) expiring90++;
        }
      }

      return {
        success: true,
        stats: {
          total: all.length,
          outside_the_kingdom: outsideCount,
          iqama_expired: expired,
          iqama_expiring_in_30_days: expiring30,
          iqama_expiring_in_60_days: expiring60,
          iqama_expiring_in_90_days: expiring90,
          nationality_breakdown: nationalityCount,
          occupation_breakdown: occupationCount,
        },
      };
    }

    // Row-level query
    let query = supabase.from("employees").select("*");

    if (filter?.nationality) query = query.ilike("nationality", `%${filter.nationality}%`);
    if (filter?.occupation) query = query.ilike("occupation", `%${filter.occupation}%`);
    if (filter?.outside_the_kingdom !== undefined)
      query = query.eq("outside_the_kingdom", filter.outside_the_kingdom);
    if (filter?.iqama_expiry_before) query = query.lte("iqama_expiry_date", filter.iqama_expiry_before);
    if (filter?.iqama_expiry_after) query = query.gte("iqama_expiry_date", filter.iqama_expiry_after);
    if (filter?.passport_expiry_before)
      query = query.lte("passport_expiry_date", filter.passport_expiry_before);
    if (filter?.name_search) query = query.ilike("name", `%${filter.name_search}%`);
    if (filter?.iqama_number) query = query.eq("iqama_number", filter.iqama_number);

    query = query.order("iqama_expiry_date", { ascending: true }).limit(limit ?? 200);

    const { data, error } = await query;

    if (error) return { success: false, error: error.message };

    return {
      success: true,
      count: data?.length ?? 0,
      employees: data ?? [],
    };
  },
});
