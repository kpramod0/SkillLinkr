/**
 * Client-side image compression utilities.
 *
 * compressImage()  — General-purpose: resizes to max 1400px, quality 0.88, outputs WebP.
 * compressAvatar() — Avatar/face photos: max 800px, quality 0.90 — sharper faces, smaller file.
 *
 * Both functions fall back to the ORIGINAL file if the compressed result ends up larger
 * (e.g. already-compressed JPEGs or tiny PNGs that don't benefit from re-encoding).
 */

async function _compress(
    file: File,
    maxDimension: number,
    quality: number
): Promise<File> {
    return new Promise((resolve, reject) => {
        const img = new Image()

        img.onload = () => {
            try {
                let w = img.width
                let h = img.height

                // Only resize if image exceeds max dimension
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
                // Smooth rendering for downscaled images
                ctx.imageSmoothingEnabled = true
                ctx.imageSmoothingQuality = 'high'
                ctx.drawImage(img, 0, 0, w, h)

                const mimeType = 'image/webp'
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('Canvas toBlob failed'))
                            return
                        }

                        // If compressed is same size or LARGER than original, keep original
                        if (blob.size >= file.size) {
                            console.log(
                                `[compress] ${file.name}: compressed (${(blob.size / 1024).toFixed(0)}KB) >= original (${(file.size / 1024).toFixed(0)}KB) — keeping original`
                            )
                            resolve(file)
                            return
                        }

                        const ext = '.webp'
                        const baseName = file.name.replace(/\.[^.]+$/, '')
                        const compressed = new File([blob], `${baseName}${ext}`, {
                            type: mimeType,
                            lastModified: Date.now(),
                        })

                        console.log(
                            `[compress] ${file.name}: ${(file.size / 1024).toFixed(0)}KB → ${(compressed.size / 1024).toFixed(0)}KB (${Math.round((1 - compressed.size / file.size) * 100)}% smaller, ${w}×${h})`
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

        img.onerror = () => reject(new Error('Failed to load image for compression'))
        img.src = URL.createObjectURL(file)
    })
}

/**
 * General-purpose image compression.
 * Max 1400px dimension, 88% quality WebP.
 * Falls back to original if compressed is larger.
 */
export async function compressImage(
    file: File,
    options: { maxDimension?: number; quality?: number } = {}
): Promise<File> {
    const { maxDimension = 1400, quality = 0.88 } = options
    return _compress(file, maxDimension, quality)
}

/**
 * Avatar/profile-photo compression.
 * Tuned for face photos: max 800px, 90% quality — sharper faces at smaller file sizes.
 * Falls back to original if compressed is larger.
 */
export async function compressAvatar(file: File): Promise<File> {
    return _compress(file, 800, 0.90)
}
