import React from 'react';
import { Music } from 'lucide-react';

const BasicHeader = () => (
  <header className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/80">
    <div className="mx-auto flex max-w-5xl items-center px-4 py-3">
      <div className="flex items-center gap-2">
        <Music className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-neutral-100">Setlistify</span>
      </div>
    </div>
  </header>
);

export default BasicHeader;
