import sharp from "sharp";

// Raster test files, not clinical material or output from an AI image provider.
// Tests submit their actual bytes through the upload contract; never reuse media IDs.
export const galleryUploads = await Promise.all([1, 2, 3, 4].map(async (number) => ({
  imageBase64: (await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640"><rect width="960" height="640" fill="#f9f6ed"/><rect x="48" y="48" width="12" height="544" fill="#184c46"/><text x="96" y="180" font-family="sans-serif" font-size="30" fill="#184c46">ARCHIVO DE PRUEBA LOCAL</text><text x="96" y="350" font-family="sans-serif" font-size="100" fill="#184c46">${number}</text><text x="96" y="450" font-family="sans-serif" font-size="28" fill="#333333">Carga dedicada, sin informacion clinica</text></svg>`)).png().toBuffer()).toString("base64"),
  title: `Archivo dedicado de galería ${number}`,
  altText: `Lámina técnica de prueba número ${number}, sin información clínica`,
  caption: `Archivo ${number} cargado expresamente para comprobar la galería. No es una imagen clínica.`
})));
