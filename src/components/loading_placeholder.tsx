import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingPlaceholder = () => (
  <div className="mx-auto flex max-w-sm flex-col items-center gap-6 px-4 py-8">
    <div className="w-full rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="aspect-square w-full animate-pulse rounded-lg bg-gray-200 dark:bg-neutral-800" />
    </div>
    <button
      disabled
      className="inline-flex items-center gap-2 rounded-full bg-gray-300 px-6 py-3 font-semibold text-gray-500 cursor-not-allowed opacity-75 dark:bg-neutral-800 dark:text-neutral-400"
      aria-busy="true"
      aria-label="Loading"
    >
      <Loader2 className="h-5 w-5 animate-spin" />
      <span>Loading...</span>
    </button>
  </div>
);

export default LoadingPlaceholder;
