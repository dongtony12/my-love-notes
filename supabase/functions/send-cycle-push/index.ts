// FCM HTTP v1 으로 월경 주기 예상일 전날/당일에 푸시 발송.
// pg_cron 으로 매일 자정(KST) 트리거.
//
// 필수 환경 변수 (Supabase Edge Function Secrets):
//   FIREBASE_PROJECT_ID
//   FIREBASE_CLIENT_EMAIL
//   FIREBASE_PRIVATE_KEY     (개행은 \n 으로 이스케이프되어 들어옴)
//   CRON_SECRET              (외부에서 임의 호출 차단)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging'

function b64url(input: string | Uint8Array): string {
  const str =
    typeof input === 'string'
      ? btoa(input)
      : btoa(String.fromCharCode(...input))
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '')
  const binary = atob(base64)
  const buf = new ArrayBuffer(binary.length)
  const view = new Uint8Array(buf)
  for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i)
  return buf
}

async function getAccessToken(): Promise<string> {
  const clientEmail = Deno.env.get('FIREBASE_CLIENT_EMAIL')
  const rawPrivateKey = Deno.env.get('FIREBASE_PRIVATE_KEY')
  if (!clientEmail || !rawPrivateKey) {
    throw new Error('Missing FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY')
  }
  const privateKey = rawPrivateKey.replace(/\\n/g, '\n')

  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const claim = {
    iss: clientEmail,
    scope: FCM_SCOPE,
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(
    JSON.stringify(claim),
  )}`

  const keyBuffer = pemToArrayBuffer(privateKey)
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signatureBuf = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsigned),
  )
  const signature = b64url(new Uint8Array(signatureBuf))
  const jwt = `${unsigned}.${signature}`

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Token exchange failed: ${resp.status} ${text}`)
  }
  const data = await resp.json()
  return data.access_token
}

async function sendFcmPush(
  accessToken: string,
  projectId: string,
  token: string,
  title: string,
  body: string,
): Promise<{ ok: boolean; status: number; text?: string }> {
  const resp = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body },
          android: { priority: 'HIGH' },
        },
      }),
    },
  )
  if (!resp.ok) {
    const text = await resp.text()
    return { ok: false, status: resp.status, text }
  }
  return { ok: true, status: resp.status }
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d + days))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

// KST(UTC+9) 기준 오늘
function todayKstISO(): string {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, '0')}-${String(kst.getUTCDate()).padStart(2, '0')}`
}

Deno.serve(async (req) => {
  // 외부 호출 차단 — pg_cron 호출 시 x-cron-secret 헤더 동일해야 함
  const secret = req.headers.get('x-cron-secret')
  if (secret !== Deno.env.get('CRON_SECRET')) {
    return new Response('unauthorized', { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const projectId = Deno.env.get('FIREBASE_PROJECT_ID')
  if (!projectId) {
    return new Response('Missing FIREBASE_PROJECT_ID', { status: 500 })
  }

  const today = todayKstISO()

  // 주기 설정된 user 들 조회
  const { data: profiles, error: profileErr } = await supabase
    .from('profiles')
    .select('user_id, cycle_days, last_period_date')
    .not('cycle_days', 'is', null)
    .not('last_period_date', 'is', null)

  if (profileErr) {
    return new Response(`db error: ${profileErr.message}`, { status: 500 })
  }

  let accessToken: string | null = null
  let sent = 0
  const errors: unknown[] = []

  for (const profile of profiles ?? []) {
    if (!profile.last_period_date || !profile.cycle_days) continue

    // 향후 N회 예상일 중 오늘이 D-Day 또는 D-1 인 회차가 있으면 발송
    let matchedKind: 'today' | 'tomorrow' | null = null
    for (let i = 1; i <= 24; i++) {
      const center = addDays(profile.last_period_date, profile.cycle_days * i)
      if (center === today) {
        matchedKind = 'today'
        break
      }
      if (center === addDays(today, 1)) {
        matchedKind = 'tomorrow'
        break
      }
      // 너무 먼 미래는 스킵
      if (center > addDays(today, 60)) break
    }
    if (!matchedKind) continue

    const title = '📅 월경 주기'
    const body =
      matchedKind === 'today' ? '오늘이 예상일이에요' : '내일이 예상일이에요'

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('token, platform')
      .eq('user_id', profile.user_id)

    if (!accessToken) {
      try {
        accessToken = await getAccessToken()
      } catch (e) {
        return new Response(`oauth error: ${(e as Error).message}`, {
          status: 500,
        })
      }
    }

    for (const sub of subs ?? []) {
      if (sub.platform !== 'android') continue // iOS / web 는 별도 발송 경로
      const result = await sendFcmPush(
        accessToken,
        projectId,
        sub.token,
        title,
        body,
      )
      if (result.ok) {
        sent++
      } else {
        errors.push({ status: result.status, text: result.text })
        // 토큰이 무효해진 경우 삭제 (UNREGISTERED 404)
        if (result.status === 404 || result.status === 400) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('token', sub.token)
        }
      }
    }
  }

  return new Response(
    JSON.stringify({ today, sent, errors }, null, 2),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
