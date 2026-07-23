// Request browser-notification permission ONCE, as early as possible (right
// after the student enters the logged-in area / on app load) — never during an
// exam, where a permission prompt + reload would blank the test room.
// Chrome allows requesting without a gesture; Safari/Firefox need one, so we
// also retry on the first user interaction. Idempotent.
let done = false;

export function ensureNotifyPermission() {
  if (done) return;
  if (!('Notification' in window)) { done = true; return; }
  if (Notification.permission !== 'default') { done = true; return; }
  done = true;

  const ask = () => {
    try {
      const r = Notification.requestPermission();
      if (r && r.then) r.catch(() => {});
    } catch (e) { /* ignore */ }
  };

  ask(); // works on Chrome without a gesture
  const once = () => {
    ask();
    window.removeEventListener('pointerdown', once);
    window.removeEventListener('keydown', once);
  };
  window.addEventListener('pointerdown', once, { once: true });
  window.addEventListener('keydown', once, { once: true });
}
