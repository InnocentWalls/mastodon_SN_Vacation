/**
 * Cloudflare Workers ― GW 残り時間ボット
 *
 * 1. ダッシュボード > Workers & Pages > Triggers で
 *      Cron を `0 * * * *`（毎時 0 分）に設定
 * 2. ダッシュボード > Settings > Variables
 *      MASTODON_URL   = 例: https://mstdn.jp        ※末尾スラッシュ不要
 *      MASTODON_TOKEN = Mastodon のアクセストークン
 *
 *    ── 以上を済ませて「Save & Deploy」すれば完了 ──
 */

/* 休暇スケジュール（※UTC ミリ秒で保持）*/
const START = Date.UTC(2025, 3, 25, 15); // 2025-04-26 00:00 JST
const END   = Date.UTC(2025, 4,  6, 15); // 2025-05-07 00:00 JST
const STOP  = Date.UTC(2025, 4, 12, 15); // 2025-05-13 00:00 JST

export default {
  /** Cron から呼ばれるエントリポイント */
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(updateDisplayName(env));
  },

  /** 外部 HTTP アクセスは拒否して安全運用 */
  async fetch() {
    return new Response('Forbidden', { status: 403 });
  },
};

/**
 * 指定時刻内なら表示名を更新
 */
async function updateDisplayName(env) {
  const now = Date.now();
  if (now < START || now >= STOP) return; // 対象外は即終了

  // ----- 表示名を決定 -----
  const display =
    now < END
      ? `GW(残り${Math.ceil((END - now) / 3_600_000)}時間)`
      : 'hogehoge';

  // ----- 環境変数チェック -----
  const base = env.MASTODON_URL?.trim();
  const token = env.MASTODON_TOKEN?.trim();
  if (!base || !token) {
    console.error('MASTODON_URL or MASTODON_TOKEN is missing');
    return;
  }

  // 末尾スラッシュ重複を防止
  const api = `${base.replace(/\/$/, '')}/api/v1/accounts/update_credentials`;

  try {
    const res = await fetch(api, {
      method : 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ display_name: display }),
    });

    if (!res.ok) {
      console.error('Mastodon API error', res.status, await res.text());
    }
  } catch (err) {
    console.error('Network/Runtime error', err);
  }
}
