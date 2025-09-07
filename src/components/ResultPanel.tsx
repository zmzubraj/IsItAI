'use client';

import React from 'react';

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
}

export default function ResultPanel({ result, loading, onReset }: ResultPanelProps) {
  if (loading) {
    return (
      <div className="mt-4 text-sm text-gray-500">Analyzing...</div>
    );
  }

  if (!result) return null;

  const verdict = result.finalVerdict === 'AI-generated' ? 'AI Generated' : 'Real Photo';

  return (
    <div className="mt-4 w-full max-w-sm rounded border p-4 text-sm text-gray-700">
      <p>Frequency Spectrum: {result.frequencySpectrum.toFixed(2)}</p>
      <p>Noise Residual: {result.noiseResidual.toFixed(2)}</p>
      <p>Color Histogram: {result.colorHistogram.toFixed(2)}</p>
      <p>Camera Info Present: {result.cameraInfoPresent ? 'Yes' : 'No'}</p>
      <p className="mt-2 font-semibold">
        Overall Confidence: {(result.probability * 100).toFixed(2)}%
      </p>
      <p className="font-semibold">Verdict: {verdict}</p>
      <button
        type="button"
        onClick={onReset}
        className="mt-4 rounded bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300"
      >
        Clear
      </button>
    </div>
  );
}

