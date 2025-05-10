import { useEffect, useState } from 'react'; 
import { useParams, Link } from 'react-router-dom';
import { $api, IMG_HOST } from '../../api';
import ReactPlayer from 'react-player';
import { Badge } from '../../components';

// Типи для нового API
interface AnimeRelease {
  id: number;
  type: {
    value: string;
    description: string;
  };
  year: number;
  name: {
    main: string;
    english: string;
    alternative: string;
  };
  alias: string;
  season: {
    value: string;
    description: string;
  };
  poster: {
    src: string;
    thumbnail: string;
    optimized: {
      src: string;
      thumbnail: string;
    };
  };
  description: string;
  episodes_total: number;
  genres: {
    id: number;
    name: string;
    total_releases: number;
    image: {
      preview: string;
      thumbnail: string;
      optmized: {
        preview: string;
        thumbnail: string;
      };
    };
  }[];
  episodes: {
    id: string;
    name: string;
    ordinal: number;
    duration: number;
    hls_480: string;
    hls_720: string;
    hls_1080: string;
    sort_order: number;
    name_english: string;
  }[];
  age_rating: {
    value: string;
    label: string;
    is_adult: boolean;
    description: string;
  };
}

export const AnimeCatalogDetailPage = () => {
  const [anime, setAnime] = useState<AnimeRelease | null>(null);
  const [activeEpisode, setActiveEpisode] = useState<number | null>(null);
  const { aliasOrId } = useParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    $api
      .get<AnimeRelease[]>(`/anime/releases/${aliasOrId}`)
      .then(response => {
        if (response.data && response.data.length > 0) {
          const animeData = response.data[0];
          setAnime(animeData);
          
          // Встановлюємо перший епізод як активний за замовчуванням
          if (animeData.episodes && animeData.episodes.length > 0) {
            // Сортуємо епізоди за ordinal
            const sortedEpisodes = [...animeData.episodes].sort((a, b) => a.sort_order - b.sort_order);
            setActiveEpisode(sortedEpisodes[0].sort_order);
          }
        } else {
          setError('Аніме не знайдено');
        }
      })
      .catch(error => {
        console.error('Помилка завантаження аніме:', error);
        setError('Не вдалося завантажити дані аніме');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [aliasOrId]);

  useEffect(() => {
    const videoElement = document.querySelector('video');
    if (videoElement) {
      videoElement.play();
    }
  }, [activeEpisode]);

  // Автоматичний перехід між епізодами
  const handleEpisodeEnd = () => {
    if (anime?.episodes && activeEpisode !== null) {
      // Сортуємо епізоди за sort_order
      const sortedEpisodes = [...anime.episodes].sort((a, b) => a.sort_order - b.sort_order);
      const currentIndex = sortedEpisodes.findIndex(ep => ep.sort_order === activeEpisode);
      if (currentIndex !== -1 && currentIndex < sortedEpisodes.length - 1) {
        setActiveEpisode(sortedEpisodes[currentIndex + 1].sort_order);
      }
    }
  };

  // Відображення повідомлення про помилку
  if (error) {
    return (
      <div className="container py-5">
        <div className="p-5 bg-slate-800/20 rounded-lg text-center">
          <p className="text-red-500">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Спробувати знову
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container py-5">
        <div className="p-5 bg-slate-800/20 rounded-lg text-center">
          <p className="text-white">Завантаження...</p>
        </div>
      </div>
    );
  }

  const getPosterUrl = () => {
    if (!anime?.poster) return '';
    return anime.poster.optimized?.src || anime.poster.src;
  };

  const getCurrentEpisode = () => {
    if (!anime?.episodes || activeEpisode === null) return null;
    return anime.episodes.find(ep => ep.sort_order === activeEpisode);
  };

  const currentEpisode = getCurrentEpisode();

  return (
    <>
      <div className="container py-5">
        <div className="flex flex-col items-center gap-5 md:flex-row md:items-start">
          {getPosterUrl() && (
            <img
              src={IMG_HOST + getPosterUrl()}
              alt={anime?.name?.main || anime?.name?.english}
              className="rounded-lg max-w-xs w-full h-auto object-cover"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold text-white mb-3">
              {anime?.name?.main || anime?.name?.english || 'Завантаження...'}
            </h1>
            {anime?.name?.alternative && (
              <p className="text-gray-400 mb-3">{anime.name.alternative}</p>
            )}
            {/* Інформація про аніме */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
              {anime?.year && (
                <div><span className="text-gray-400">Рік:</span> {anime.year}</div>
              )}
              {anime?.type && (
                <div><span className="text-gray-400">Тип:</span> {anime.type.description}</div>
              )}
              {anime?.season && (
                <div><span className="text-gray-400">Сезон:</span> {anime.season.description}</div>
              )}
              {anime?.episodes_total && (
                <div><span className="text-gray-400">Кількість епізодів:</span> {anime.episodes_total}</div>
              )}
              {anime?.age_rating && (
                <div><span className="text-gray-400">Віковий рейтинг:</span> {anime.age_rating.label}</div>
              )}
            </div>
            {/* Опис */}
            {anime?.description && (
              <p className="text-justify mb-4">{anime.description}</p>
            )}
            {/* Жанри */}
            <div className="flex flex-wrap gap-2 py-2">
              {anime?.genres?.map(genre => (
                <Badge key={genre.id} text={genre.name} />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="container py-5">
        {anime?.episodes && anime.episodes.length > 0 ? (
          <div className="p-5 bg-slate-800/20 rounded-lg">
            <select
              value={activeEpisode || ''}
              onChange={e => setActiveEpisode(Number(e.target.value))}
              className="w-full bg-slate-800 p-2 rounded-lg outline-none cursor-pointer"
            >
              {[...anime.episodes]
                .sort((a, b) => a.sort_order - b.sort_order)
                .map(episode => (
                  <option key={episode.id} value={episode.sort_order}>
                    Серія {episode.ordinal} - {episode.name}
                  </option>
                ))}
            </select>
            {currentEpisode && (
              <div className="mt-5">
                <ReactPlayer
                  width="100%"
                  height="100%"
                  url={currentEpisode.hls_1080 || currentEpisode.hls_720 || currentEpisode.hls_480}
                  controls
                  onEnded={handleEpisodeEnd}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="p-5 bg-slate-800/20 rounded-lg">
            <p className="text-center py-4">
              {anime ? 'Епізоди не знайдено' : 'Завантаження інформації про епізоди...'}
            </p>
          </div>
        )}
      </div>
    </>
  );
};