# Earthquake Alert service worker

`sw.js` has been added at the site root. It provides a network-first offline fallback for the app document and handles push payloads delivered by a push service. It deliberately does not cache USGS API responses, so stale earthquake data is not presented as live data.

## Enable the worker

The existing `index.html` must register the worker from a secure context (HTTPS or localhost). Add this once in its main script after page initialization:

```js
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js').catch(error => {
    console.error('Service worker registration failed:', error);
  });
}
```

This registration step is not yet wired into `index.html`; therefore the worker will not activate merely by adding `sw.js`.

## Push notification limitation

A service worker alone cannot send push messages. Background push requires a server that stores subscriptions and sends Web Push messages, plus VAPID keys and a user-approved subscription. The worker does not claim delivery or create earthquake alerts on its own. Push payloads should include a JSON object such as `{ "title": "Earthquake Alert", "body": "...", "eventId": "...", "url": "/" }`.

The dashboard continues to use the USGS public data feed. No TMD endpoint or credentials were added because the official endpoint and access method have not yet been verified for a production integration.
