import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
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
      });
  }, [code]); // Додано залежність code

  if (loading) {
    return <Loader />;
  }

  return (
    <>
      <div className="container py-5">
        <div className="flex flex-col items-center gap-5 md:flex-row md:items-start">
          <img src={IMG_HOST + title?.posters.original.url} alt={title?.names.ru} />
          <div>
            {/* Додано відображення назви аніме */}
            <h1 className="text-2xl font-bold text-white mb-3">{title?.names.ru}</h1>
            <p className="text-justify">{title?.description}</p>
            <div className="flex flex-wrap gap-2 py-2">
              {title?.genres.map(genre => (
                <Badge key={genre} text={genre} />
              ))}
            </div>
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
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
