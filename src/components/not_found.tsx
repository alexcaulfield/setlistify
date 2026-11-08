import React from 'react';
import { Link } from '@tanstack/react-router';
import ErrorMessage from './error_message';

const NotFound = () => (
  <div className="p-4">
    <ErrorMessage
      header="Page Not Found"
      message={
        <span>
          We're sorry, but this page does not exist. Please visit our{' '}
          <Link to="/" className="font-semibold underline hover:text-red-900">
            homepage
          </Link>
          !
        </span>
      }
    />
  </div>
);

export default NotFound;
