export const IMAGE_MAX_BYTES = 1_500_000; // ~1.5 MB for the API payload
export const IMAGE_MAX_SIDE = 2000;
const MIN_QUALITY = 0.55;
const INITIAL_QUALITY = 0.86;

export type PreparedImage = {
	file: File;
	dataUrl: string;
	originalBytes: number;
	bytes: number;
	width: number;
	height: number;
	compressed: boolean;
};

function blobToDataUrl(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.onerror = () => reject(reader.error ?? new Error('Could not read image'));
		reader.readAsDataURL(blob);
	});
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => (blob ? resolve(blob) : reject(new Error('Could not compress image'))),
			type,
			quality
		);
	});
}

async function draw(
	source: ImageBitmap,
	width: number,
	height: number
): Promise<HTMLCanvasElement> {
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const context = canvas.getContext('2d', { alpha: false });
	if (!context) throw new Error('Canvas is unavailable');
	context.fillStyle = '#ffffff';
	context.fillRect(0, 0, width, height);
	context.imageSmoothingEnabled = true;
	context.imageSmoothingQuality = 'high';
	context.drawImage(source, 0, 0, width, height);
	return canvas;
}

/**
 * Resize/compress only when the image is too large or the browser format is
 * not one Gemma can consume directly. Returns a JPEG data URL for the model.
 */
export async function prepareReceiptImage(file: File): Promise<PreparedImage> {
	const bitmap = await createImageBitmap(file);
	try {
		const originalWidth = bitmap.width;
		const originalHeight = bitmap.height;
		const dimensionsFit = Math.max(originalWidth, originalHeight) <= IMAGE_MAX_SIDE;
		const isDirectlySupported = /^image\/(?:jpeg|jpg|png|webp)$/i.test(file.type);

		if (dimensionsFit && isDirectlySupported && file.size <= IMAGE_MAX_BYTES) {
			return {
				file,
				dataUrl: await blobToDataUrl(file),
				originalBytes: file.size,
				bytes: file.size,
				width: originalWidth,
				height: originalHeight,
				compressed: false
			};
		}

		let width = originalWidth;
		let height = originalHeight;
		const scale = Math.min(1, IMAGE_MAX_SIDE / Math.max(width, height));
		width = Math.max(1, Math.round(width * scale));
		height = Math.max(1, Math.round(height * scale));

		let quality = INITIAL_QUALITY;
		let canvas = await draw(bitmap, width, height);
		let blob = await canvasToBlob(canvas, 'image/jpeg', quality);

		while (blob.size > IMAGE_MAX_BYTES && quality > MIN_QUALITY) {
			quality = Math.max(MIN_QUALITY, quality - 0.07);
			blob = await canvasToBlob(canvas, 'image/jpeg', quality);
		}

		// If quality reduction is not enough, shrink the dimensions too.
		while (blob.size > IMAGE_MAX_BYTES && Math.max(width, height) > 900) {
			width = Math.max(1, Math.round(width * 0.85));
			height = Math.max(1, Math.round(height * 0.85));
			canvas = await draw(bitmap, width, height);
			blob = await canvasToBlob(canvas, 'image/jpeg', Math.max(MIN_QUALITY, quality));
		}

		const compressedFile = new File([blob], 'receipt-compressed.jpg', {
			type: 'image/jpeg',
			lastModified: Date.now()
		});

		return {
			file: compressedFile,
			dataUrl: await blobToDataUrl(blob),
			originalBytes: file.size,
			bytes: blob.size,
			width,
			height,
			compressed: true
		};
	} finally {
		bitmap.close();
	}
}