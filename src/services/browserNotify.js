const IS_SUPPORTED = typeof window !== 'undefined' && 'Notification' in window;

export function showBrowserNotification(title, body, onClickUrl) {
  if (!IS_SUPPORTED) return;
  if (Notification.permission !== 'granted') return;
  try {
    const n = new Notification(title, {
      body,
      icon: '/logoooooooooo.png',
      badge: '/logoooooooooo.png',
      tag: 'vcm-lead-' + Date.now(),
      requireInteraction: true,
    });
    if (onClickUrl) {
      n.onclick = (e) => {
        e.preventDefault();
        window.focus();
        window.location.href = onClickUrl;
        n.close();
      };
    }
    setTimeout(() => n.close(), 10000);
  } catch (e) {
    console.error('Browser notification failed:', e.message);
  }
}

export function getNotificationPermission() {
  if (!IS_SUPPORTED) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (!IS_SUPPORTED) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (e) {
    console.error('Permission request failed:', e.message);
    return 'denied';
  }
}
