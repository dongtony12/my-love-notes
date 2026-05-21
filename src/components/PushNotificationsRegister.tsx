'use client'

import { useEffect } from 'react'
import { registerPushToken } from '@/app/actions'

/**
 * Capacitor 네이티브 앱에서만 동작.
 * 일반 브라우저(웹/PWA)에서는 아무것도 안 함.
 *
 * 로직:
 * 1. 권한 확인/요청
 * 2. registration 호출 → FCM 토큰 받아오기
 * 3. 토큰을 DB(push_subscriptions)에 저장
 * 4. 백그라운드에서 토큰이 갱신되면 자동으로 다시 저장
 */
export function PushNotificationsRegister() {
  useEffect(() => {
    let canceled = false

    async function setup() {
      // Capacitor 환경 체크
      const Capacitor = (
        await import('@capacitor/core').catch(() => null)
      )?.Capacitor
      if (!Capacitor?.isNativePlatform()) return

      const platform = Capacitor.getPlatform() // 'ios' | 'android'
      if (platform !== 'android' && platform !== 'ios') return

      const { PushNotifications } = await import(
        '@capacitor/push-notifications'
      ).catch(() => ({ PushNotifications: null }))
      if (!PushNotifications) return

      // 1) 권한
      let perm = await PushNotifications.checkPermissions()
      if (perm.receive === 'prompt') {
        perm = await PushNotifications.requestPermissions()
      }
      if (perm.receive !== 'granted') return
      if (canceled) return

      // 2) 토큰 수신 리스너
      const reg = await PushNotifications.addListener(
        'registration',
        async (token) => {
          try {
            await registerPushToken({
              token: token.value,
              platform,
            })
          } catch (e) {
            console.error('[push] registerPushToken failed:', e)
          }
        },
      )

      const errReg = await PushNotifications.addListener(
        'registrationError',
        (error) => {
          console.error('[push] registration error:', error)
        },
      )

      // 3) 알림 수신 시 (앱 foreground 상태) — 로컬 알림 표시는 OS가 자동
      const recvReg = await PushNotifications.addListener(
        'pushNotificationReceived',
        (notification) => {
          console.log('[push] received:', notification)
        },
      )

      // 4) 알림 탭 → 앱 진입
      const actionReg = await PushNotifications.addListener(
        'pushNotificationActionPerformed',
        (action) => {
          console.log('[push] tapped:', action)
        },
      )

      // 5) 등록 트리거 (위 리스너들이 토큰 수신 처리)
      try {
        await PushNotifications.register()
      } catch (e) {
        console.error('[push] register call failed:', e)
      }

      return () => {
        reg.remove()
        errReg.remove()
        recvReg.remove()
        actionReg.remove()
      }
    }

    let cleanup: (() => void) | undefined
    setup().then((fn) => {
      cleanup = fn
    })

    return () => {
      canceled = true
      cleanup?.()
    }
  }, [])

  return null
}
