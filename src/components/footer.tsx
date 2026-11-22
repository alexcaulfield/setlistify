import React from 'react';

const Footer = () => (
  <footer className="mt-auto border-t border-gray-200 bg-white py-6 text-center text-sm text-gray-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
    <div className="mx-auto max-w-5xl px-4 space-y-2">
      <p>
        Any questions? Create an issue on{' '}
        <a
          href="https://github.com/alexcaulfield/setlistify/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
        >
          GitHub
        </a>
      </p>
    </div>
  </footer>
);

export default Footer;
