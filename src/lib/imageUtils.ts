/**
 * Client-side image compression utility.
 * Resizes images to a max dimension and compresses to WebP/JPEG
 * while maintaining visual quality.
 */

export async function compressImage(
    file: File,
    options: { maxDimension?: number; quality?: number } = {}
): Promise<File> {
    const { maxDimension = 1200, quality = 0.82 } = options

    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
            try {
                let w = img.width
                let h = img.height

                // Only resize if exceeds max dimension
                if (w > maxDimension || h > maxDimension) {
                    if (w > h) {
                        h = Math.round((h / w) * maxDimension)
                        w = maxDimension
                    } else {
                        w = Math.round((w / h) * maxDimension)
                        h = maxDimension
                    }
                }

                const canvas = document.createElement('canvas')
                canvas.width = w
                canvas.height = h
                const ctx = canvas.getContext('2d')!
                ctx.drawImage(img, 0, 0, w, h)

                // Prefer WebP (smaller), fallback to JPEG
                const mimeType = 'image/webp'
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('Compression failed'))
                            return
                        }
                        const ext = mimeType === 'image/webp' ? '.webp' : '.jpg'
                        const baseName = file.name.replace(/\.[^.]+$/, '')
                        const compressed = new File([blob], `${baseName}${ext}`, {
                            type: mimeType,
                            lastModified: Date.now(),
                        })

                        console.log(
                            `[compress] ${file.name}: ${(file.size / 1024).toFixed(0)}KB → ${(compressed.size / 1024).toFixed(0)}KB (${Math.round((1 - compressed.size / file.size) * 100)}% smaller)`
                        )
                        resolve(compressed)
                    },
                    mimeType,
                    quality
                )
            } catch (err) {
                reject(err)
            }
        }
        img.onerror = () => reject(new Error('Failed to load image'))
        img.src = URL.createObjectURL(file)
    })
}
