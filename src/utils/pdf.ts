// ============================================================
// biforst-sys — PDF Utilities
// Shared helpers untuk pembuatan PDF (jsPDF).
// Menggantikan copy-paste loadImage() di 3 file.
// ============================================================

/** Warna primer BTS untuk header tabel PDF */
export const PDF_PRIMARY_COLOR: [number, number, number] = [22, 50, 79];

/**
 * Load gambar dari public folder secara async.
 * Dipakai untuk stempel dan tanda tangan digital di PDF.
 * Mengembalikan null jika gagal load (graceful degradation).
 */
export function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
  });
}
