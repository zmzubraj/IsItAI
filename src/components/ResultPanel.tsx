'use client';

import React from 'react';
import { generateCertificate } from '../utils/generateCertificate';

interface WorkerResult {
  probability: number;
  cameraInfoPresent: boolean;
  frequencySpectrum: number;
  noiseResidual: number;
  colorHistogram: number;
  finalVerdict: string;
}

interface ResultPanelProps {
  result: WorkerResult | null;
  loading: boolean;
  onReset: () => void;
  image: string | null;
}

export default function ResultPanel({ result, loading, onReset, image }: ResultPanelProps) {
  if (loading) {
    return (
      <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">Analyzing...</div>
    );
  }

  if (!result) return null;

  const verdict = result.finalVerdict === 'AI-generated' ? 'AI Generated' : 'Real Photo';

  return (
    <div className="card mt-4 w-full max-w-sm text-sm text-gray-800 dark:text-gray-100">
      <p>Frequency Spectrum: {result.frequencySpectrum.toFixed(2)}</p>
      <p>Noise Residual: {result.noiseResidual.toFixed(2)}</p>
      <p>Color Histogram: {result.colorHistogram.toFixed(2)}</p>
      <p>Camera Info Present: {result.cameraInfoPresent ? 'Yes' : 'No'}</p>
      <p className="mt-2 font-semibold">
        Overall Confidence: {(result.probability * 100).toFixed(2)}%
      </p>
      <p className="font-semibold">Verdict: {verdict}</p>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => image && generateCertificate(image, result)}
          className="btn"
        >
          Download Certificate
        </button>
        <button
          type="button"
          onClick={onReset}
          className="btn-secondary"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

