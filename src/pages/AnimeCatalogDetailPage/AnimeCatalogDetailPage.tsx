import { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import ReactPlayer from 'react-player';
import { Badge } from '../../components/Badge/Badge';

interface AnimeGenre {
  id: number;
  name: string;
}

interface AnimeEpisode {
  id: string;
  ordinal: number;
  name: string | null;
  hls?: {
    fhd?: string;
    hd?: string;
    sd?: string;
  };
  files?: any;
}

interface AnimeTitle {
  id: number;
  alias: string;
  name: {
    main: string;
    english?: string;
    alternative?: string | null;
  };
  description: string;
  genres: AnimeGenre[];
  poster: {
    src: string;
    preview?: string;
    thumbnail?: string;
    optimized?: any;
  };
  year: number;
  season: {
    value: string;
    description: string;
  };
  episodes: AnimeEpisode[];
  franchises?: {
    id:
      | {
          releases: {
            id: string;
            ordinal: number;
            names?: {
              ru?: string;
              en?: string;
            };
            code: string;
          }[];
        }[]
      | undefined;
    releases: {
      id: string;
      ordinal: number;
      names?: {
        ru?: string;
        en?: string;
      };
      code: string;
    }[];
  }[];
}

export const AnimeCatalogDetailPage = () => {
  const { id } = useParams();
  const { id: code } = useParams();
  const [anime, setAnime] = useState<AnimeTitle | null>(null);
  const [activeEpisode, setActiveEpisode] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [episodeDetail, setEpisodeDetail] = useState<any | null>(null);
  const [episodeLoading, setEpisodeLoading] = useState(false);
  const [episodeError, setEpisodeError] = useState<string | null>(null);
  const [timecodes] = useState<any>(null);
  const [franchiseReleases, setFranchiseReleases] = useState<any[]>([]);

  useEffect(() => {
    const fetchAnime = async () => {
      try {
        const response = await axios.get(
          `https://anilibria.wtf/api/v1/anime/releases/${id}`,
        );
        console.log('[Anime API response]', response.data);
        setAnime(response.data);
        if (response.data.episodes && response.data.episodes.length > 0) {
          setActiveEpisode(response.data.episodes[0].ordinal);
        }
      } catch (_e) {
        setError('Не вдалося завантажити дані аніме');
      }
    };
    fetchAnime();
  }, [id]);

  // Fetch timecodes for all episodes - temporarily disabled due to 403 error
  useEffect(() => {
    if (!anime) return;
    console.log('[Timecodes] Skipping timecodes fetch due to 403 error');
  }, [anime, id]);

  // Fetch episode details when activeEpisode changes
  useEffect(() => {
    if (!anime || !anime.episodes) return;
    const ep = anime.episodes.find(e => e.ordinal === activeEpisode);
    if (!ep) return;
    setEpisodeLoading(true);
    setEpisodeError(null);
    setEpisodeDetail(null);
    axios
      .get(`https://anilibria.wtf/api/v1/anime/releases/episodes/${ep.id}`)
      .then(res => {
        console.log('[Episode Detail Response]', {
          episodeId: ep.id,
          episodeName: ep.name,
          fullResponse: res.data,
        });
        setEpisodeDetail(res.data);
        setEpisodeLoading(false);
      })
      .catch(err => {
        console.error('[Episode Detail Error]', {
          episodeId: ep.id,
          error: err.response?.data || err.message,
        });
        setEpisodeError('Не вдалося завантажити дані епізоду');
        setEpisodeLoading(false);
      });
  }, [anime, activeEpisode]);

  // Get timecode for current episode
  const getCurrentEpisodeTimecode = () => {
    if (!timecodes || !anime) return null;
    const ep = anime.episodes.find(e => e.ordinal === activeEpisode);
    if (!ep) return null;
    return timecodes[ep.id] || null;
  };

  // Автоматичний перехід між епізодами
  const handleEpisodeEnd = () => {
    if (anime?.episodes) {
      const episodes = anime.episodes;
      const currentIndex = episodes.findIndex(
        ep => ep.ordinal === activeEpisode,
      );
      if (currentIndex !== -1 && currentIndex < episodes.length - 1) {
        setActiveEpisode(episodes[currentIndex + 1].ordinal);
      }
    }
  };

  useEffect(() => {
    if (!anime) return;

    // Крок 1: Отримати franchiseId за releaseId
    axios
      .get(`https://anilibria.wtf/api/v1/anime/franchises/release/${anime.id}`)
      .then(res => {
        const franchiseId = res.data?.id;
        console.log('[franchiseId для франшизи]', franchiseId);
        if (!franchiseId) {
          // Якщо franchiseId немає, спробуємо знайти сезони через пошук
          console.log('[Спроба пошуку сезонів через releases/list]');
          searchRelatedSeasons();
          return;
        }
        // Крок 2: Отримати всі релізи франшизи
        axios
          .get(`https://anilibria.wtf/api/v1/anime/franchises/${franchiseId}`)
          .then(res2 => {
            let releases = res2.data.releases || [];
            // Додаємо поточний реліз, якщо його немає у списку
            if (!releases.some((s: any) => s.id === anime.id)) {
              releases.push(anime);
            }
            // Сортуємо за роком і сезоном (зима, весна, літо, осінь)
            const seasonOrder = ['winter', 'spring', 'summer', 'autumn'];
            releases.sort((a: any, b: any) => {
              if (a.year !== b.year) return a.year - b.year;
              const aSeason = a.season?.value || '';
              const bSeason = b.season?.value || '';
              return seasonOrder.indexOf(aSeason) - seasonOrder.indexOf(bSeason);
            });
            setFranchiseReleases(releases);
            console.log('[Franchise API response]', res2.data);
          })
          .catch(() => {
            console.log('[Franchise API помилка, спробуємо пошук сезонів]');
            searchRelatedSeasons();
          });
      })
      .catch(() => {
        console.log('[Franchise release API помилка, спробуємо пошук сезонів]');
        searchRelatedSeasons();
      });
  }, [anime]);

  // Функція для пошуку пов'язаних сезонів через releases/list
  const searchRelatedSeasons = async () => {
    if (!anime?.name?.main) return;

    try {
      // Отримуємо основну назву без додаткових слів (сезон, частина тощо)
      const mainTitle = anime.name.main
        .replace(/сезон|частина|фильм|movie|season|part/gi, '')
        .replace(/[^-\u007Fа-яёА-ЯЁ\w\s]/gi, '')
        .trim();

      console.log('[Пошук сезонів для назви]', mainTitle);

      const response = await axios.get(
        `https://anilibria.wtf/api/v1/anime/catalog/releases?f[search]=${encodeURIComponent(
          mainTitle,
        )}&limit=20`,
      );

      console.log('[Releases list response]', response.data);

      let relatedSeasons: any[] = [];
      if (response.data?.data && Array.isArray(response.data.data)) {
        // Фільтруємо тільки ті, що мають схожу назву
        relatedSeasons = response.data.data.filter((item: any) => {
          const itemTitle = item.name?.main?.toLowerCase() || '';
          const currentTitle = anime.name.main.toLowerCase();
          // Перевіряємо схожість назв
          const titleSimilarity =
            itemTitle.includes(mainTitle.toLowerCase()) ||
            mainTitle.toLowerCase().includes(itemTitle) ||
            itemTitle.includes(currentTitle) ||
            currentTitle.includes(itemTitle);
          return titleSimilarity;
        });
      }
      // Додаємо поточний реліз, якщо його немає у списку
      if (!relatedSeasons.some((s) => s.id === anime.id)) {
        relatedSeasons.push(anime);
      }
      // Сортуємо за роком і сезоном (зима, весна, літо, осінь)
      const seasonOrder = ['winter', 'spring', 'summer', 'autumn'];
      relatedSeasons.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        const aSeason = a.season?.value || '';
        const bSeason = b.season?.value || '';
        return seasonOrder.indexOf(aSeason) - seasonOrder.indexOf(bSeason);
      });
      setFranchiseReleases(relatedSeasons);
    } catch (error) {
      console.error('[Помилка пошуку сезонів]', error);
      setFranchiseReleases([anime]); // хоча б поточний
    }
  };

  if (error) {
    return <div className="text-center text-red-500 py-10">{error}</div>;
  }
  if (!anime) {
    return <div className="text-center text-white py-10">Завантаження...</div>;
  }

  const POSTER_URL = anime.poster?.src
    ? 'https://anilibria.wtf' + anime.poster.src
    : '';

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Постер */}
        <div className="flex-shrink-0">
          <img
            src={POSTER_URL}
            alt={anime.name?.main}
            className="rounded-lg w-72 h-auto object-cover shadow-lg"
          />
        </div>
        {/* Інформація */}
        <div className="flex-1 text-white">
          <h1 className="text-3xl font-bold mb-2">{anime.name?.main}</h1>
          {anime.name?.english && (
            <div className="text-gray-400 mb-2">{anime.name.english}</div>
          )}
          <div className="mb-4 text-lg">{anime.description}</div>
          <div className="mb-2">
            <span className="font-semibold">Год:</span> {anime.year}
          </div>
          <div className="mb-2">
            <span className="font-semibold">Жанры:</span>{' '}
            <div className="flex flex-wrap gap-2 py-2">
              {anime.genres?.map(g => (
                <Badge key={g.id} text={g.name} />
              ))}
            </div>
          </div>
          <div className="mb-4">
            <span className="font-semibold">Сезон:</span>{' '}
            {anime.season?.description}
          </div>
        </div>
      </div>
      {/* Порядок просмотра / Следующие сезоны */}
      {franchiseReleases.length > 0 && (
        <div className="mb-5 p-5 bg-slate-800/20 rounded-lg">
          <h2 className="text-xl font-semibold mb-3">
            Порядок просмотра / Следующие сезоны:
          </h2>
          <ul className="list-disc pl-5">
            {franchiseReleases.map((season: any) => (
              <li key={season.id} className="mb-2">
                {season.alias ? (
                  <>
                    {season.alias === code ? (
                      <span className="text-white font-bold cursor-default">
                        {season.year} ({season.season?.description}) -{' '}
                        {season.name?.main ||
                          season.name?.english ||
                          season.alias}
                      </span>
                    ) : (
                      <a
                        href={`/title/${season.alias}`}
                        className="relative transition-colors duration-200 before:absolute before:bottom-0 before:left-0 before:w-0 before:h-[2px] before:bg-gray-500 before:transition-all before:duration-200 hover:before:w-full text-gray-500 hover:text-white"
                      >
                        {season.year} ({season.season?.description}) -{' '}
                        {season.name?.main ||
                          season.name?.english ||
                          season.alias}
                      </a>
                    )}
                  </>
                ) : (
                  <span className="text-gray-500">
                    {season.year} ({season.season?.description}) -{' '}
                    {season.name?.main || season.name?.english || 'Немає назви'}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* Плеєр */}
      {anime.episodes && anime.episodes.length > 0 && (
        <div className="bg-slate-800/40 rounded-lg p-4 mt-6">
          <select
            value={activeEpisode}
            onChange={e => setActiveEpisode(Number(e.target.value))}
            className="w-full bg-slate-900 p-2 rounded mb-4 text-white"
          >
            {anime.episodes.map(ep => {
              const hasTimecode = timecodes && timecodes[ep.id];
              return (
                <option key={ep.id} value={ep.ordinal}>
                  Серия {ep.ordinal} {ep.name ? `- ${ep.name}` : ''}
                  {hasTimecode ? ' (просмотрено)' : ''}
                </option>
              );
            })}
          </select>
          {episodeLoading && (
            <div className="text-center text-white py-4">Загрузка серии...</div>
          )}
          {episodeError && (
            <div className="text-center text-red-400 py-4">{episodeError}</div>
          )}
          {episodeDetail &&
            !episodeLoading &&
            !episodeError &&
            (() => {
              let playerError = '';
              let videoUrl = '';

              // Log the full episode detail structure for debugging
              console.log('[Video Search] Episode detail structure:', {
                episodeId: episodeDetail.id,
                episodeName: episodeDetail.name,
                allKeys: Object.keys(episodeDetail),
                hls_1080: episodeDetail.hls_1080,
                hls_720: episodeDetail.hls_720,
                hls_480: episodeDetail.hls_480,
                files: episodeDetail.files,
                video: episodeDetail.video,
                player: episodeDetail.player,
                streams: episodeDetail.streams,
                sources: episodeDetail.sources,
              });

              // 1. HLS 1080p
              if (
                episodeDetail.hls_1080 &&
                typeof episodeDetail.hls_1080 === 'string' &&
                episodeDetail.hls_1080.startsWith('http')
              ) {
                videoUrl = episodeDetail.hls_1080;
              }
              // 2. HLS 720p
              else if (
                episodeDetail.hls_720 &&
                typeof episodeDetail.hls_720 === 'string' &&
                episodeDetail.hls_720.startsWith('http')
              ) {
                videoUrl = episodeDetail.hls_720;
              }
              // 3. HLS 480p
              else if (
                episodeDetail.hls_480 &&
                typeof episodeDetail.hls_480 === 'string' &&
                episodeDetail.hls_480.startsWith('http')
              ) {
                videoUrl = episodeDetail.hls_480;
              }
              // 4. MP4 у files
              else if (
                episodeDetail.files &&
                Array.isArray(episodeDetail.files)
              ) {
                const mp4file = episodeDetail.files.find(
                  (f: any) =>
                    typeof f === 'string' && f.match(/^https?:\/\/.*\.mp4$/i),
                );
                if (mp4file) {
                  videoUrl = mp4file;
                }
              }
              // 5. Альтернативні поля для пошуку відео
              else if (
                episodeDetail.video &&
                typeof episodeDetail.video === 'string' &&
                episodeDetail.video.startsWith('http')
              ) {
                videoUrl = episodeDetail.video;
              } else if (
                episodeDetail.player &&
                typeof episodeDetail.player === 'string' &&
                episodeDetail.player.startsWith('http')
              ) {
                videoUrl = episodeDetail.player;
              } else if (
                episodeDetail.streams &&
                Array.isArray(episodeDetail.streams)
              ) {
                const stream = episodeDetail.streams.find(
                  (s: any) =>
                    s.url &&
                    typeof s.url === 'string' &&
                    s.url.startsWith('http'),
                );
                if (stream) {
                  videoUrl = stream.url;
                }
              } else if (
                episodeDetail.sources &&
                Array.isArray(episodeDetail.sources)
              ) {
                const source = episodeDetail.sources.find(
                  (s: any) =>
                    s.src &&
                    typeof s.src === 'string' &&
                    s.src.startsWith('http'),
                );
                if (source) {
                  videoUrl = source.src;
                }
              }
              // 6. Якщо нічого не знайшли
              if (!videoUrl) {
                playerError =
                  'Онлайн-плеєр для цієї серії недоступний (немає підтримуваного формату відео)';
                // Log detailed error to console
                console.error('[Player Error]', {
                  episodeId: episodeDetail.id,
                  episodeName: episodeDetail.name,
                  hls_1080: episodeDetail.hls_1080,
                  hls_720: episodeDetail.hls_720,
                  hls_480: episodeDetail.hls_480,
                  files: episodeDetail.files,
                  video: episodeDetail.video,
                  player: episodeDetail.player,
                  streams: episodeDetail.streams,
                  sources: episodeDetail.sources,
                  reason: 'No supported video format found (HLS or MP4)',
                });
              }

              const timecode = getCurrentEpisodeTimecode();

              return (
                <div>
                  {!playerError && (
                    <ReactPlayer
                      url={videoUrl}
                      controls
                      width="100%"
                      height="100%"
                      onEnded={handleEpisodeEnd}
                    />
                  )}
                  {playerError && (
                    <div className="text-center text-yellow-400 py-4">
                      {playerError}
                    </div>
                  )}
                  {timecode && timecode.time && (
                    <div className="text-sm text-gray-400 mt-2">
                      Прогресс просмотра: {Math.floor(timecode.time / 60)}:
                      {(timecode.time % 60).toFixed(0).padStart(2, '0')}
                    </div>
                  )}
                </div>
              );
            })()}
        </div>
      )}
    </div>
  );
};
