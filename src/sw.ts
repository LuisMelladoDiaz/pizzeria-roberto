/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope

// Inject precache manifest (replaced by vite-plugin-pwa at build time)
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Push notification handler
self.addEventListener('push', (event) => {
  const data: { title?: string; body?: string; ticket_code?: string; business_slug?: string } =
    event.data?.json() ?? {}

  const title = data.title ?? '🍕 ¡Tu pedido está listo!'
  const options = {
    body: data.body ?? 'Pasa a recogerlo en el mostrador',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [300, 100, 300, 100, 300, 100, 600],
    requireInteraction: true,
    tag: 'pedido-listo',
    data,
  } as NotificationOptions

  event.waitUntil(self.registration.showNotification(title, options))
})

// Notification click → open waiting view
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const d = event.notification.data as { ticket_code?: string; business_slug?: string } | undefined
  const url = d?.business_slug && d?.ticket_code
    ? `/cliente/espera/${d.business_slug}/${d.ticket_code}`
    : '/cliente/mis-tickets'

  event.waitUntil(
    (self.clients as Clients)
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            void (client as WindowClient).navigate(url)
            return client.focus()
          }
        }
        return (self.clients as Clients).openWindow(url)
      }),
  )
})
