'use client';

import * as ort from 'onnxruntime-web';

/**
 * Runs a simple MNIST model on the provided image element.
 * The image is resized to 28x28, converted to grayscale and normalized.
 * Returns the probability for class 0 as an example.
 */
export async function detectProbability(
  image: HTMLImageElement | HTMLCanvasElement,
): Promise<number> {
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
    // Average RGB to grayscale and normalize to [0,1]
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    input[i / 4] = avg / 255;
  }

  const session = await ort.InferenceSession.create('/models/mnist-8.onnx', {
    executionProviders: ['webgpu', 'wasm'],
  });

  const tensor = new ort.Tensor('float32', input, [1, 1, size, size]);
  const feeds: Record<string, ort.Tensor> = {};
  feeds[session.inputNames[0]] = tensor;
  const results = await session.run(feeds);
  const output = results[session.outputNames[0]] as ort.Tensor;
  const scores = Array.from(output.data as Float32Array);
  const max = Math.max(...scores);
  const exps = scores.map((s) => Math.exp(s - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps[0] / sum;
}

export default detectProbability;
