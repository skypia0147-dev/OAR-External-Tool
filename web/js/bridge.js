// Calls into the C# host (WebView2 web messages). Each call gets a reply with the same id.

const pending = new Map();
let seq = 0;
const listeners = new Map();
const webview = window.chrome?.webview;

export const inHost = !!webview;

if (webview) {
  webview.addEventListener('message', (e) => {
    const msg = e.data;
    if (msg?.type === 'reply') {
      const p = pending.get(msg.id);
      if (!p) return;
      pending.delete(msg.id);
      if (msg.ok) p.resolve(msg.result);
      else p.reject(Object.assign(new Error(msg.error?.message ?? 'Host error'), { code: msg.error?.code }));
    } else if (msg?.type === 'event') {
      for (const fn of listeners.get(msg.name) ?? []) fn(msg);
    }
  });
}

/** @returns {Promise<any>} */
export function call(method, params = {}, files) {
  if (!webview) return Promise.reject(new Error('Not running inside OAR External Tool'));
  const id = `c${++seq}`;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    const msg = { type: 'call', id, method, params };
    if (files?.length && webview.postMessageWithAdditionalObjects) webview.postMessageWithAdditionalObjects(msg, files);
    else webview.postMessage(msg);
  });
}

export function on(name, fn) {
  if (!listeners.has(name)) listeners.set(name, []);
  listeners.get(name).push(fn);
}
