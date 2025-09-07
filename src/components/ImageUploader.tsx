'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import ResultPanel from './ResultPanel';
import ProgressConsole from './ProgressConsole';
import type { WorkerResult } from '../types/worker';

interface ImageUploaderProps {
  onFileSelect: (dataUrl: string) => void;
  maxSizeMB?: number;
  onAnalysisComplete?: () => void;
}

export default function ImageUploader({ onFileSelect, maxSizeMB = 5, onAnalysisComplete }: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<WorkerResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<{ step: string; progress: number }[]>([]);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const worker = new Worker(new URL('./detectorWorker.ts', import.meta.url));
    workerRef.current = worker;
    const handler = (e: MessageEvent<WorkerResult | { step: string; progress: number }>) => {
      if ('probability' in e.data) {
        setResult(e.data);
        setLoading(false);
        onAnalysisComplete?.();
      } else if ('step' in e.data) {
        setSteps((prev) => [...prev, e.data as { step: string; progress: number }]);
      }
    };
    worker.addEventListener('message', handler);
    return () => {
      worker.removeEventListener('message', handler);
      worker.terminate();
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File size must be less than ${maxSizeMB}MB.`);
      return;
    }

    setError('');
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);
      setResult(null);
      setLoading(true);
      setSteps([]);
      onFileSelect(dataUrl);
      workerRef.current?.postMessage({ imageData: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const handleReset = () => {
    setPreview(null);
    setResult(null);
    setError('');
    setLoading(false);
    setSteps([]);
  };

  return (
    <div className="flex w-full flex-col items-center">
      <input type="file" accept="image/*" onChange={handleChange} />
      {error && <p className="mt-2 text-sm text-red-500 dark:text-red-400">{error}</p>}
      {preview && (
        <Image
          src={preview}
          alt="Preview"
          width={200}
          height={200}
          className="mt-4 rounded object-contain"
        />
      )}
      {loading && <ProgressConsole steps={steps} />}
      <ResultPanel result={result} loading={loading} onReset={handleReset} image={preview} />
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">No data leaves your device</p>
    </div>
  );
}

