import { describe, it, expect } from 'vitest';
import { getSmallestImageUrl } from './image-utils';

describe('getSmallestImageUrl', () => {
  it('returns the URL of the smallest image by dimensions', () => {
    const images = [
      { url: 'https://example.com/large.jpg', width: 300, height: 300 },
      { url: 'https://example.com/small.jpg', width: 64, height: 64 },
    ];
    expect(getSmallestImageUrl(images)).toBe('https://example.com/small.jpg');
  });

  it('returns undefined when image collection is empty or undefined', () => {
    expect(getSmallestImageUrl([])).toBeUndefined();
    expect(getSmallestImageUrl(undefined)).toBeUndefined();
  });

  it('falls back to the available image URL when dimensions are missing or single image provided', () => {
    expect(getSmallestImageUrl([{ url: 'https://example.com/single.jpg', width: 0, height: 0 }])).toBe(
      'https://example.com/single.jpg'
    );
  });
});
