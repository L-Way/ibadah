/*
  Lima Waktu — service worker
  Tujuan: aplikasi tetap terbuka tanpa internet setelah dikunjungi sekali,
  dan versi terbaru index.html langsung terpakai saat online.

  Berkas ini sengaja tidak menyebut nama berkas apa pun secara tetap
  (tidak ada daftar berkas untuk di-precache, tidak ada nomor versi untuk
  dinaikkan). Jadi kalau Anda hanya mengubah index.html, berkas ini TIDAK
  perlu ikut diedit maupun di-deploy ulang — cukup unggah index.html yang
  baru dan pengguna akan mendapatkannya begitu online.
*/
const CACHE = "lima-waktu-runtime";
const OLD_CACHES = ["nuur-runtime"]; // dibersihkan otomatis dari versi sebelumnya (Nuur)

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    // Bersihkan cache dari versi lama supaya tidak menumpuk sia-sia
    // di penyimpanan pengguna yang sudah pernah memakai versi "Nuur".
    await Promise.all(OLD_CACHES.map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Jangan sentuh permintaan lintas asal yang bukan untuk dibaca ulang
  // sebagai aset statis (mis. API yang selalu berubah polanya sendiri
  // sudah punya penyimpanan sendiri di IndexedDB lewat index.html).
  const sameOrigin = url.origin === self.location.origin;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const fresh = await fetch(req);
      // Simpan salinan supaya bisa dipakai saat offline nanti.
      if (fresh && fresh.ok && (sameOrigin || req.mode === "cors" || req.mode === "no-cors")) {
        cache.put(req, fresh.clone());
      }
      return fresh;
    } catch (err) {
      const cached = await cache.match(req, { ignoreSearch: true });
      if (cached) return cached;
      // Navigasi ke halaman saat offline & belum pernah dibuka:
      // coba beri halaman utama yang mungkin sudah tersimpan.
      if (req.mode === "navigate") {
        const fallback = await cache.match("./index.html");
        if (fallback) return fallback;
      }
      throw err;
    }
  })());
});
