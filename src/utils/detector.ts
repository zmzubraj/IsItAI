'use client';

// Heavy libraries are loaded on demand so the initial bundle stays light.
import type * as ortTypes from 'onnxruntime-web';
import { computeHeuristics, HeuristicScores } from './heuristics';

export interface DetectionResult extends HeuristicScores {
  probability: number;
  cameraInfoPresent: boolean;
}

/**
 * Runs a simple MNIST model on the provided image element and returns
 * the model probability together with heuristic scores and EXIF info.
 */
export async function detectImage(
  image: HTMLImageElement | HTMLCanvasElement,
): Promise<DetectionResult> {
  const ort = await import('onnxruntime-web');
  const size = 28;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  ctx.drawImage(image, 0, 0, size, size);
  const imageData = ctx.getImageData(0, 0, size, size);
  const { data } = imageData;
  const input = new Float32Array(size * size);

  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    input[i / 4] = avg / 255;
  }

  const session = await ort.InferenceSession.create('/models/mnist-8.onnx', {
    executionProviders: ['webgpu', 'wasm'],
  });

  const tensor = new ort.Tensor('float32', input, [1, 1, size, size]);
  const feeds: Record<string, ortTypes.Tensor> = {};
  feeds[session.inputNames[0]] = tensor as unknown as ortTypes.Tensor;
  const results = await session.run(feeds);
  const output = results[session.outputNames[0]] as ortTypes.Tensor;
  const scores = Array.from(output.data as Float32Array);
  const max = Math.max(...scores);
  const exps = scores.map((s) => Math.exp(s - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  const probability = exps[0] / sum;

  const heuristics = computeHeuristics(image);

  let cameraInfoPresent = false;
  try {
    let buffer: ArrayBuffer | undefined;
    if (image instanceof HTMLImageElement && image.src.startsWith('data:')) {
      const res = await fetch(image.src);
      buffer = await res.arrayBuffer();
    }
    if (buffer) {
      const exifr = (await import('exifr')).default;
      const exif = await exifr.parse(buffer);
      cameraInfoPresent = Boolean(exif?.Make || exif?.Model);
    }
  } catch {
    // ignore EXIF parsing errors
  }

  return { probability, cameraInfoPresent, ...heuristics };
}

export default detectImage;

