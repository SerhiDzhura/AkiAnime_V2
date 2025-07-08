import { Link } from 'react-router-dom';
import { AnimeCardProps } from './AnimeCard.types';
import { IMG_HOST } from '../../api';

export const AnimeCard = ({ code, image, title }: AnimeCardProps) => {
  return (
    <>
      <div className="w-full border border-slate-500 rounded-lg md:p-2 p-5">
        <img
          src={IMG_HOST + image}
          alt={title}
          loading="lazy"
          className="mx-auto"
        />
        <h2 className="text-center text-lg mt-2 truncate">{title}</h2>
        <div className="flex items-end justify-center p-2">
          <Link
            to={`/anime/${code}`}
            className="bg-gradient-to-r from-blue-500 to-violet-500 px-3 py-2 rounded-lg font-semibold hover:opacity-85 transition-opacity"
          >
            Перейти к просмотру
          </Link>
        </div>
      </div>
    </>
  );
};
