import type { SpotifyImage } from '../api/types.gen';

export const getSmallestImageUrl = (
  images?: SpotifyImage[],
): string | undefined => {
  if (!images || !Array.isArray(images) || images.length === 0)
    return undefined;
  if (images.length === 1) return images[0]?.url;

  const smallest = images.reduce(
    (minImg, currentImg) => {
      const minDim =
        (minImg.width && minImg.width > 0 ? minImg.width : null) ??
        (minImg.height && minImg.height > 0 ? minImg.height : null) ??
        Infinity;
      const currentDim =
        (currentImg.width && currentImg.width > 0 ? currentImg.width : null) ??
        (currentImg.height && currentImg.height > 0
          ? currentImg.height
          : null) ??
        Infinity;

      if (currentDim < minDim) {
        return currentImg;
      }
      return minImg;
    },
    images[images.length - 1],
  );

  return smallest?.url;
};
