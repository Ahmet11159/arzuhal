/**
 * Fotoğrafı tarayıcıda küçültüp JPEG data URL'e çevirir (en uzun kenar ≤ maxSize).
 * Telefon kamerasından gelen 5–10 MB görselleri ~100–250 KB'a indirir.
 */
export async function compressImage(file: File, maxSize = 1280, quality = 0.8, maxChars = 650_000): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Lütfen bir görsel seçin');
  const bitmap = await createImageBitmap(file).catch(() => null);
  const src = bitmap ?? (await loadImage(file));
  const w = 'naturalWidth' in src ? src.naturalWidth : src.width;
  const h = 'naturalHeight' in src ? src.naturalHeight : src.height;
  const scale = Math.min(1, maxSize / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Görsel işlenemedi');
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
  bitmap?.close();
  let out = canvas.toDataURL('image/jpeg', quality);
  // Sınırı aşarsa kaliteyi düşürerek tekrar dene
  for (let q = quality - 0.15; out.length > maxChars && q > 0.3; q -= 0.15) out = canvas.toDataURL('image/jpeg', q);
  if (out.length > maxChars) throw new Error('Fotoğraf çok büyük');
  return out;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Görsel okunamadı'));
    img.src = URL.createObjectURL(file);
  });
}
