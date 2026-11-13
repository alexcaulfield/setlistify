import React, { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorMessageProps {
  header: string;
  message: ReactNode;
}

const ErrorMessage = ({ header, message }: ErrorMessageProps) => (
  <div className="mx-auto max-w-xl rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm" role="alert">
    <div className="flex items-start gap-3">
      <AlertCircle className="mt-0.5 h-5 w-5 text-red-600 shrink-0" />
      <div>
        <h3 className="text-sm font-semibold text-red-800">{header}</h3>
        <div className="mt-1 text-sm text-red-700">{message}</div>
      </div>
    </div>
  </div>
);

export default ErrorMessage;
