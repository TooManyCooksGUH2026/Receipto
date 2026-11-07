/**
 * Copy the ONNX Runtime Web binaries into static/ort so the on-device OCR
 * pipeline never depends on a CDN. Runs automatically after npm install.
 */
import { copyFile, mkdir, readdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const source = resolve('node_modules/onnxruntime-web/dist');
const destination = resolve('static/ort');

try {
	await rm(destination, { recursive: true, force: true });
	await mkdir(destination, { recursive: true });
	const files = await readdir(source);
	// ORT Web uses the JSEP build by default. Keep the plain SIMD build too as
	// a fallback for browsers without JSEP support.
	const wanted = files.filter((file) =>
		/^ort-wasm-simd-threaded(?:\.jsep)?\.(?:wasm|mjs)$/.test(file)
	);
	await Promise.all(
		wanted.map((file) => copyFile(resolve(source, file), resolve(destination, file)))
	);
	console.log(`Copied ${wanted.length} ONNX Runtime Web files to static/ort`);
} catch (error) {
	console.warn('Could not copy ONNX Runtime Web assets:', error.message);
}
