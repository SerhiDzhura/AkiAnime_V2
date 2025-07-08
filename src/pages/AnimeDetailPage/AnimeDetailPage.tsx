import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { $api, IMG_HOST, VIDEO_HOST } from '../../api';
import { Title } from '../../types/anime.types';
import ReactPlayer from 'react-player';
import { Badge } from '../../components';
import { Loader } from '../../components/Loader/Loader';

export const AnimeDetailPage = () => {
  const [title, setTitle] = useState<Title>();
  const [activeEpisode, setActiveEpisode] = useState(1);
  const { code } = useParams();
  const [loading, setLoading] = useState(true);

  // Додаємо стейт для всіх сезонів
  const [allReleases, setAllReleases] = useState<any[]>([]);

  useEffect(() => {
    setLoading(true);
    $api
      .get<Title>('/title', {
        params: {
          code: code,
          playlist_type: 'array',
        },
      })
      .then(response => {
        setTitle(response?.data);
        setLoading(false);

        // Додаємо логування для дебагу
        console.log('franchises:', response?.data?.franchises);
        console.log(
          'franchises[0]?.releases:',
          response?.data?.franchises?.[0]?.releases,
        );

        // Якщо франшиза є і релізів достатньо — використовуємо їх
        if (
          response?.data?.franchises?.[0]?.releases &&
          response.data.franchises[0].releases.length > 1
        ) {
          setAllReleases(response.data.franchises[0].releases);
        } else {
          // Fallback: шукаємо релізи за назвою
          const searchName =
            response?.data?.names?.ru || response?.data?.names?.en || '';
          if (searchName) {
            $api
              .get('/anime/catalog/releases', {
                params: { search: searchName },
              })
              .then(res => {
                // Додаємо логування для дебагу
                console.log('catalog releases res.data:', res.data);
                // Додаємо поточний тайтл, якщо його немає у списку
                let releases = res.data || [];
                if (
                  !releases.some((r: any) => r.code === response?.data?.code)
                ) {
                  releases = [
                    ...releases,
                    {
                      code: response?.data?.code,
                      names: response?.data?.names,
                      ordinal: releases.length + 1,
                    },
                  ];
                }
                // Сортуємо за ordinal або іншим полем
                releases.sort(
                  (a: any, b: any) => (a.ordinal || 0) - (b.ordinal || 0),
                );
                setAllReleases(releases);
                // Лог фінального масиву
                console.log('allReleases set:', releases);
              });
          }
        }
      });
  }, [code]);

  useEffect(() => {
    const videoElement = document.querySelector('video');
    if (videoElement) {
      videoElement.play();
    }
  }, [activeEpisode]);

  if (loading) {
    return <Loader />;
  }
  // Автоматичний перехід між епізодами
  const handleEpisodeEnd = () => {
    if (title?.player.list) {
      const nextEpisode = title.player.list.find(
        e => e.episode === activeEpisode + 1,
      );
      if (nextEpisode) {
        setActiveEpisode(nextEpisode.episode);
      }
    }
  };

  return (
    <>
      <div className="container py-5">
        <div className="flex flex-col items-center gap-5 md:flex-row md:items-start">
          <img
            src={IMG_HOST + title?.posters.original.url}
            alt={title?.names.ru}
          />
          <div>
            <h1 className="text-2xl font-bold text-white mb-3">
              {title?.names.ru}
            </h1>
            <p className="text-justify">{title?.description}</p>
            <div className="flex flex-wrap gap-2 py-2">
              {title?.genres.map(genre => (
                <Badge key={genre} text={genre} />
              ))}
            </div>
            {/* ПОРЯДОК ПРОСМОТРА */}
            {allReleases.length > 0 && (
              <div className="mt-5 p-5 bg-slate-800/20 rounded-lg">
                <h2 className="text-xl font-semibold mb-3">
                  Порядок просмотра:
                </h2>
                <ul className="list-disc pl-5">
                  {allReleases.map(season => (
                    <li key={season.code} className="mb-2">
                      <Link
                        to={`/title/${season.code}`}
                        className={`relative transition-colors duration-200 
                          before:absolute before:bottom-0 before:left-0 before:w-0 before:h-[2px] 
                          before:bg-gray-500 before:transition-all before:duration-200 
                          hover:before:w-full ${
                            code === season.code
                              ? 'text-gray-500 font-semibold'
                              : 'text-white'
                          }`}
                      >
                        {season.ordinal}. {season.names?.ru || season.names?.en}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="container py-5">
        <div className="p-5 bg-slate-800/20 rounded-lg">
          <select
            value={activeEpisode}
            onChange={e => setActiveEpisode(Number(e.target.value))}
            className="w-full bg-slate-800 p-2 rounded-lg outline-none cursor-pointer"
          >
            {title?.player.list.map(episode => (
              <option key={episode?.uuid} value={episode?.episode}>
                Серия {episode?.episode}
              </option>
            ))}
          </select>
          {title?.player.list.map(episode => (
            <div className="mt-5" key={episode?.uuid}>
              {episode?.episode === activeEpisode && (
                <ReactPlayer
                  width="100%"
                  height="100%"
                  url={VIDEO_HOST + episode?.hls.hd}
                  controls
                  onEnded={handleEpisodeEnd}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
