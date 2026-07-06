import { createAdminClient } from "@/lib/supabase/admin";

export type RateLimitResult = {
  allowed: boolean;
  hourlyCount: number;
  dailyCount: number;
  hourlyLimit: number;
  dailyLimit: number;
  resetInMinutes: number;
  message?: string;
};

const HOURLY_LIMIT = 30;
const DAILY_LIMIT = 200;

export async function checkRateLimit(userId: string): Promise<RateLimitResult> {
  const admin = createAdminClient();
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  // Count user messages in the last hour and day
  const [hourly, daily] = await Promise.all([
    admin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("role", "user")
      .gte("created_at", oneHourAgo),
    admin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("role", "user")
      .gte("created_at", oneDayAgo),
  ]);

  const hourlyCount = hourly.count ?? 0;
  const dailyCount = daily.count ?? 0;

  if (hourlyCount >= HOURLY_LIMIT) {
    return {
      allowed: false,
      hourlyCount,
      dailyCount,
      hourlyLimit: HOURLY_LIMIT,
      dailyLimit: DAILY_LIMIT,
      resetInMinutes: 60,
      message: `Você atingiu ${HOURLY_LIMIT} mensagens na última hora. Faça uma pausa — o limite reseta em ~60 minutos. Isso evita custos surpresa com a IA.`,
    };
  }

  if (dailyCount >= DAILY_LIMIT) {
    return {
      allowed: false,
      hourlyCount,
      dailyCount,
      hourlyLimit: HOURLY_LIMIT,
      dailyLimit: DAILY_LIMIT,
      resetInMinutes: Math.max(60, Math.round((24 - new Date().getHours()) * 60)),
      message: `Você atingiu ${DAILY_LIMIT} mensagens nas últimas 24 horas. O limite reseta à meia-noite. Para uso intenso entre hoje e amanhã, considere assinar mais capacidade.`,
    };
  }

  return {
    allowed: true,
    hourlyCount,
    dailyCount,
    hourlyLimit: HOURLY_LIMIT,
    dailyLimit: DAILY_LIMIT,
    resetInMinutes: 0,
  };
}
