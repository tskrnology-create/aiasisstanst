// Panel/asistan/hafta ekranlarının ortak veri yükleyicisi: tek seferde sayımlar, yaklaşan paylaşımlar ve son içerikler.
import { getSupabase } from "@/lib/supabase";
import { businessStore, type StoredBusiness } from "@/lib/business-store";
import type { ContentStatus } from "@/lib/library-utils";
import { snippet } from "@/lib/dashboard-utils";
import { computeInsights, type Insights } from "@/lib/performance";

export interface UpcomingItem {
  id: string;
  contentId: string;
  /** Plandan gelen ama henüz yazılmamış fikir. */
  ready: boolean;
  prompt: string;
  platform: string | null;
  scheduled_at: string;
  text: string;
}

export interface RecentContent {
  id: string;
  prompt: string;
  status: ContentStatus;
  created_at: string;
  text: string;
  hasVisual: boolean;
}

export interface DashboardData {
  business: StoredBusiness;
  total: number;
  drafts: number;
  approved: number;
  thisMonth: number;
  visuals: number;
  planned: number;
  overdue: number;
  postedThisMonth: number;
  insights: Insights;
  upcoming: UpcomingItem[];
  weekIsos: string[];
  recent: RecentContent[];
  loadedAt: Date;
}

export async function loadDashboard(businessId: string): Promise<DashboardData> {
  const sb = getSupabase();
  const now = new Date();
  const nowIso = now.toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7).toISOString();

  const contents = () => sb.from("contents").select("id", { count: "exact", head: true }).eq("business_id", businessId);
  const items = () => sb.from("calendar_items").select("id", { count: "exact", head: true }).eq("business_id", businessId);

  const [business, total, drafts, approved, thisMonth, visuals, planned, overdue, posted, upcoming, recent] =
    await Promise.all([
      businessStore.get(businessId),
      contents(),
      contents().eq("status", "draft"),
      contents().eq("status", "approved"),
      contents().gte("created_at", monthStart),
      contents().not("visual_url", "is", null),
      items(),
      items().eq("done", false).lt("scheduled_at", nowIso),
      items().eq("done", true).gte("scheduled_at", monthStart),
      sb
        .from("calendar_items")
        .select("id, content_id, platform, scheduled_at, contents(prompt, post_text, caption, visual_url)")
        .eq("business_id", businessId)
        .eq("done", false)
        .lt("scheduled_at", weekEnd)
        .order("scheduled_at", { ascending: true })
        .limit(50),
      sb
        .from("contents")
        .select("id, prompt, status, created_at, post_text, caption, visual_url")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  if (!business) throw new Error("Marka bulunamadı.");
  const failed = [total, drafts, approved, thisMonth, visuals, planned, overdue, posted, upcoming, recent].find(
    (r) => r.error
  );
  if (failed?.error) throw new Error(failed.error.message);

  type Embedded = { prompt?: string; post_text?: string | null; caption?: string | null; visual_url?: string | null };
  const upcomingRows = ((upcoming.data ?? []) as unknown as Array<{
    id: string;
    content_id: string;
    platform: string | null;
    scheduled_at: string;
    contents: Embedded | Embedded[] | null;
  }>).map((row) => {
    const c = Array.isArray(row.contents) ? row.contents[0] : row.contents;
    return {
      id: row.id,
      contentId: row.content_id,
      prompt: c?.prompt ?? "",
      ready: Boolean(c?.post_text || c?.caption || c?.visual_url),
      platform: row.platform,
      scheduled_at: row.scheduled_at,
      text: snippet(c?.post_text || c?.caption || c?.prompt, 100),
    };
  });

  // Sonuç sütunları (schema v10) yoksa panel yine açılır; içgörü boş kalır.
  const resultRows = await sb
    .from("calendar_items")
    .select("platform, posted_at, result_likes, result_comments, result_saves")
    .eq("business_id", businessId)
    .eq("done", true)
    .not("posted_at", "is", null)
    .order("posted_at", { ascending: false })
    .limit(60);
  const insights = computeInsights(
    resultRows.error
      ? []
      : (resultRows.data ?? []).map((r) => ({
          platform: r.platform as string | null,
          postedAt: r.posted_at as string,
          likes: r.result_likes as number | null,
          comments: r.result_comments as number | null,
          saves: r.result_saves as number | null,
        }))
  );

  return {
    business,
    insights,
    total: total.count ?? 0,
    drafts: drafts.count ?? 0,
    approved: approved.count ?? 0,
    thisMonth: thisMonth.count ?? 0,
    visuals: visuals.count ?? 0,
    planned: planned.count ?? 0,
    overdue: overdue.count ?? 0,
    postedThisMonth: posted.count ?? 0,
    upcoming: upcomingRows,
    weekIsos: upcomingRows.map((r) => r.scheduled_at),
    recent: ((recent.data ?? []) as unknown as Array<{
      id: string;
      prompt: string;
      status: ContentStatus;
      created_at: string;
      post_text: string | null;
      caption: string | null;
      visual_url: string | null;
    }>).map((r) => ({
      id: r.id,
      prompt: r.prompt,
      status: r.status,
      created_at: r.created_at,
      text: snippet(r.post_text || r.caption || r.prompt, 110),
      hasVisual: Boolean(r.visual_url),
    })),
    loadedAt: now,
  };
}

