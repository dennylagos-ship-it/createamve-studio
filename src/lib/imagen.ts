/**
 * Convierte una foto elegida en el teléfono o la PC en una miniatura cuadrada
 * (recorte centrado, JPEG) lista para guardarse en la ficha del cliente.
 * Así no hace falta configurar almacenamiento aparte: pesa ~20-40 KB.
 */
export async function fotoAMiniatura(file: File, lado = 320): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('El archivo no es una imagen')
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((ok, fail) => {
      const i = new Image()
      i.onload = () => ok(i)
      i.onerror = () => fail(new Error('No se pudo leer la imagen. Prueba con JPG o PNG.'))
      i.src = url
    })
    const corte = Math.min(img.naturalWidth, img.naturalHeight)
    const sx = (img.naturalWidth - corte) / 2
    const sy = (img.naturalHeight - corte) / 2
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = Math.min(lado, corte)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Tu navegador no pudo procesar la imagen')
    ctx.fillStyle = '#ffffff' // logos PNG con fondo transparente
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, sx, sy, corte, corte, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.85)
  } finally {
    URL.revokeObjectURL(url)
  }
}
