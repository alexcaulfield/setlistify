import React from 'react';
import { User } from 'lucide-react';

interface ArtistCardProps {
  artistImg?: {
    url: string;
  };
  artistName: string;
  artistFollowers: {
    total: number;
  };
  artistGenre: string;
}

const ArtistCard = ({
  artistImg,
  artistName,
  artistFollowers,
  artistGenre,
}: ArtistCardProps) => {
  return (
    <div className="mt-4 flex justify-center">
      <div className="w-full max-w-xs overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {artistImg?.url && (
          <img
            src={artistImg.url}
            alt={artistName}
            className="h-48 w-full object-cover"
          />
        )}
        <div className="p-4 space-y-2">
          <h2 className="text-lg font-bold text-gray-900">{artistName}</h2>
          {artistGenre && (
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
              {artistGenre}
            </p>
          )}
          <div className="flex items-center text-sm text-gray-600">
            <User className="mr-1.5 h-4 w-4 text-gray-400" />
            <span>{artistFollowers.total.toLocaleString()} followers</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArtistCard;
