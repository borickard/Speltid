import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

/* Keep-alive endpoint: a Vercel Cron pings this weekly so the Upstash
   free-tier database is never flagged as inactive (14-day idle deletion).
   The SET/GET pair is cheap and leaves a small heartbeat key behind that
   any following call can see. */
export default async function handler(_req, res) {
  try {
    await redis.set("heartbeat", Date.now(), { ex: 60 * 60 * 24 * 60 });
    const ts = await redis.get("heartbeat");
    res.status(200).json({ ok: true, ts });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err?.message ?? err) });
  }
}
