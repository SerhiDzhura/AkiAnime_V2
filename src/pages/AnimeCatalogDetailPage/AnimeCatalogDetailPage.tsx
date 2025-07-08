import { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import ReactPlayer from 'react-player';
import { Badge } from '../../components/Badge/Badge';

// Конфігурація для axios з таймаутами та retry логікою
const apiConfig = {
  timeout: 10000, // 10 секунд таймаут
  retries: 3,
  retryDelay: 1000, // 1 секунда між спробами
};

// Функція для retry логіки
const retryRequest = async (
  requestFn: () => Promise<any>,
  retries = apiConfig.retries,
) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await requestFn();
    } catch (error: any) {
      const isLastAttempt = i === retries - 1;
      const isTimeout =
        error.code === 'ECONNABORTED' || error.message.includes('timeout');
      const isNetworkError = !error.response && error.request;

      console.warn(`[API Retry ${i + 1}/${retries}]`, {
        error: error.message,
        isTimeout,
        isNetworkError,
        isLastAttempt,
      });

      if (isLastAttempt) {
        throw error;
      }

      // Чекаємо перед наступною спробою
      await new Promise(resolve =>
        setTimeout(resolve, apiConfig.retryDelay * (i + 1)),
      );
    }
  }
};

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
        const response = await retryRequest(() =>
          axios.get(`https://anilibria.wtf/api/v1/anime/releases/${id}`),
        );
        console.log('[Anime API response]', response.data);
        setAnime(response.data);
        if (response.data.episodes && response.data.episodes.length > 0) {
          setActiveEpisode(response.data.episodes[0].ordinal);
        }
      } catch (_e) {
        setError('Не удалось загрузить данные аниме');
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
    retryRequest(() =>
      axios.get(
        `https://anilibria.wtf/api/v1/anime/releases/episodes/${ep.id}`,
      ),
    )
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
        setEpisodeError('Не удалось загрузить данные эпизода');
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

  // Автоматический переход между эпизодами
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

    console.log('[DEBUG] Начало поиска сезонов для аниме:', {
      id: anime.id,
      alias: anime.alias,
      name: anime.name?.main,
      english: anime.name?.english,
      franchises: anime.franchises,
    });

    // Функция для поиска сезонов через простой поиск
    const findSeasonsBySearch = async () => {
      if (!anime?.name?.main) {
        console.log('[searchRelatedSeasons] Нет названия аниме для поиска');
        return;
      }

      try {
        console.log('[Поиск сезонов] Начало поиска для:', anime.name.main);

        // Получаем основную назву без дополнительных слов
        const mainTitle = anime.name.main
          .replace(
            /сезон|частина|фильм|movie|season|part|4th|3rd|2nd|1st|первый|второй|третий|четвертый|вне закона|illegals/gi,
            '',
          )
          .replace(/[^-\u007Fа-яёА-ЯЁ\w\s]/gi, '')
          .trim();

        console.log('[Поиск сезонов] Очищенная назва:', mainTitle);

        // Создаем поисковые запросы
        const searchQueries = [];

        // 1. Основная назва (ограничена)
        if (mainTitle.length >= 3) {
          searchQueries.push(mainTitle.substring(0, 20));
        }

        // 2. Alias если есть
        if (anime.alias && anime.alias.length >= 3) {
          searchQueries.push(anime.alias);
        }

        // 3. Английская назва если есть
        if (anime.name.english && anime.name.english.length >= 3) {
          searchQueries.push(anime.name.english);
        }

        // 4. Базовая часть alias (без номеров сезонов) для поиска всех сезонов
        if (anime.alias) {
          const baseAlias = anime.alias.replace(
            /-\d+$|-\d+st$|-\d+nd$|-\d+rd$|-\d+th$|season-\d+$/i,
            '',
          );
          if (baseAlias !== anime.alias && baseAlias.length >= 3) {
            searchQueries.push(baseAlias);
          }
        }

        // 5. Ключевые слова с назва (первые 2-3 слова)
        if (mainTitle) {
          const titleWords = mainTitle
            .split(/\s+/)
            .filter((word: string) => word.length > 2);
          if (titleWords.length >= 2) {
            const keyWords = titleWords.slice(0, 2).join(' ');
            if (keyWords.length >= 5) {
              searchQueries.push(keyWords);
            }
          }
        }

        // 6. Специальные запросы для популярных франшиз
        const franchisePatterns = [
          { pattern: /девушка на час/i, search: 'девушка на час' },
          { pattern: /kanojo.*okarishimasu/i, search: 'kanojo okarishimasu' },
          { pattern: /naruto/i, search: 'naruto' },
          { pattern: /one piece/i, search: 'one piece' },
          { pattern: /dragon ball/i, search: 'dragon ball' },
          { pattern: /attack on titan/i, search: 'attack on titan' },
          { pattern: /sword art online/i, search: 'sword art online' },
          { pattern: /demon slayer/i, search: 'demon slayer' },
          { pattern: /jujutsu kaisen/i, search: 'jujutsu kaisen' },
          { pattern: /black clover/i, search: 'black clover' },
          { pattern: /fairy tail/i, search: 'fairy tail' },
          { pattern: /bleach/i, search: 'bleach' },
          { pattern: /hunter x hunter/i, search: 'hunter x hunter' },
          { pattern: /fullmetal alchemist/i, search: 'fullmetal alchemist' },
          { pattern: /death note/i, search: 'death note' },
          { pattern: /tokyo ghoul/i, search: 'tokyo ghoul' },
          { pattern: /parasyte/i, search: 'parasyte' },
          { pattern: /mob psycho/i, search: 'mob psycho' },
          { pattern: /one punch man/i, search: 'one punch man' },
          { pattern: /hero academia/i, search: 'hero academia' },
        ];

        for (const franchise of franchisePatterns) {
          if (
            franchise.pattern.test(anime.name.main.toLowerCase()) ||
            franchise.pattern.test(anime.alias?.toLowerCase() || '')
          ) {
            if (!searchQueries.includes(franchise.search)) {
              searchQueries.push(franchise.search);
              console.log(`[Поиск] Добавлено франшизу: ${franchise.search}`);
            }
            break;
          }
        }

        console.log('[Поиск сезонов] Запросы:', searchQueries);

        if (searchQueries.length === 0) {
          console.log('[Поиск сезонов] Нет запросов для поиска');
          setFranchiseReleases([anime]);
          return;
        }

        let allSeasons: any[] = [];

        for (const query of searchQueries) {
          try {
            console.log(`[Поиск] Ищем по запросу: "${query}"`);

            const response = await retryRequest(() =>
              axios.get(
                `https://anilibria.wtf/api/v1/anime/catalog/releases?f[search]=${encodeURIComponent(
                  query,
                )}&limit=50`,
              ),
            );

            if (response.data?.data && Array.isArray(response.data.data)) {
              console.log(
                `[Поиск] Найдено ${response.data.data.length} результатов для "${query}"`,
              );

              // Фильтруем результаты
              const filteredSeasons = response.data.data.filter((item: any) => {
                // Завжди включаем текущий аниме
                if (item.id === anime.id) return true;

                const itemTitle = item.name?.main?.toLowerCase() || '';
                const itemEnglish = item.name?.english?.toLowerCase() || '';
                const itemAlias = item.alias?.toLowerCase() || '';
                const currentTitle = anime.name.main.toLowerCase();
                const currentAlias = anime.alias?.toLowerCase() || '';

                // Точная соответственность alias
                if (itemAlias === currentAlias) return true;

                // Проверяем чи alias содержит общую часть (для сезонов)
                if (itemAlias && currentAlias) {
                  // Находим общую часть alias (без номеров сезонов)
                  const currentAliasBase = currentAlias.replace(
                    /-\d+$|-\d+st$|-\d+nd$|-\d+rd$|-\d+th$|season-\d+$/i,
                    '',
                  );
                  const itemAliasBase = itemAlias.replace(
                    /-\d+$|-\d+st$|-\d+nd$|-\d+rd$|-\d+th$|season-\d+$/i,
                    '',
                  );

                  if (
                    currentAliasBase === itemAliasBase &&
                    currentAliasBase.length > 3
                  ) {
                    console.log(
                      `[Фильтр] Найдено время за alias: ${item.name?.main} (${itemAlias})`,
                    );
                    return true;
                  }
                }

                // Проверяем чи названия содержат общие ключевые слова
                const currentWords = currentTitle
                  .split(/\s+/)
                  .filter((word: string) => word.length > 2);
                const itemWords = itemTitle
                  .split(/\s+/)
                  .filter((word: string) => word.length > 2);

                const commonWords = currentWords.filter((word: string) =>
                  itemWords.some(
                    (itemWord: string) =>
                      itemWord.includes(word) || word.includes(itemWord),
                  ),
                );

                if (commonWords.length >= 2) {
                  console.log(
                    `[Фильтр] Найдено по общим словам: ${
                      item.name?.main
                    } [${commonWords.join(', ')}]`,
                  );
                  return true;
                }

                // Проверяем сходство названий
                const titleSimilarity = calculateTitleSimilarity(
                  itemTitle,
                  itemEnglish,
                  itemAlias,
                  currentAlias,
                  mainTitle,
                );

                console.log(
                  `[Фильтр] ${
                    item.name?.main
                  } - сходство: ${titleSimilarity.toFixed(2)}`,
                );

                // Включаем если сходство достаточно высокое
                return titleSimilarity >= 0.4; // Снижаем порог еще больше
              });

              allSeasons = [...allSeasons, ...filteredSeasons];
              console.log(
                `[Поиск] Отфильтровано ${filteredSeasons.length} сезонов для "${query}"`,
              );
            }

            // Задержка между запросами
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch (error) {
            console.error(`[Поиск] Ошибка для запроса "${query}":`, error);
          }
        }

        // Удаляем дубликаты
        const uniqueSeasons = allSeasons.filter(
          (season, index, self) =>
            index === self.findIndex(s => s.id === season.id),
        );

        // Добавляем текущий аниме если его нет
        if (!uniqueSeasons.some(s => s.id === anime.id)) {
          console.log('[Поиск] Добавляем текущий аниме в результаты');
          uniqueSeasons.push(anime);
        }

        // Сортируем по году
        uniqueSeasons.sort((a, b) => (a.year || 0) - (b.year || 0));

        console.log(
          '[Поиск] Финальный результат:',
          uniqueSeasons.length,
          'сезонов',
        );
        console.log(
          '[Поиск] Сезоны:',
          uniqueSeasons.map(s => ({
            id: s.id,
            name: s.name?.main,
            year: s.year,
          })),
        );
        setFranchiseReleases(uniqueSeasons);
      } catch (error) {
        console.error('[Поиск сезонов] Общая ошибка:', error);
        console.log('[Поиск сезонов] Устанавливаем только текущий аниме');
        setFranchiseReleases([anime]);
      }
    };

    // Сначала проверяем franchise данные
    if (anime.franchises && anime.franchises.length > 0) {
      console.log('[Используем franchise данные]', anime.franchises);

      const franchiseData = anime.franchises[0];
      if (franchiseData.releases && franchiseData.releases.length > 0) {
        let releases = franchiseData.releases.map((release: any) => ({
          id: release.id,
          alias: release.code,
          name: release.names,
          year: anime.year,
          season: anime.season,
        }));

        if (!releases.some((s: any) => s.alias === anime.alias)) {
          releases.push(anime);
        }

        releases.sort((a: any, b: any) => (a.ordinal || 0) - (b.ordinal || 0));

        console.log('[Franchise] Устанавливаем', releases.length, 'сезонов');
        setFranchiseReleases(releases);
        return;
      }
    }

    // Если franchise данных нет, ищем через API
    console.log('[Нет franchise данных, ищем через API]');

    // Шаг 1: Получить franchiseId
    retryRequest(() =>
      axios.get(
        `https://anilibria.wtf/api/v1/anime/franchises/release/${anime.id}`,
      ),
    )
      .then(res => {
        const franchiseId = res.data?.id;
        console.log('[Franchise ID]', franchiseId);

        if (franchiseId) {
          console.log('[Franchise API] Найдено franchise ID, получаем релизы');
          // Шаг 2: Получить релизы франшизы
          return retryRequest(() =>
            axios.get(
              `https://anilibria.wtf/api/v1/anime/franchises/${franchiseId}`,
            ),
          );
        } else {
          console.log(
            '[Franchise API] Нет franchise ID, переходим к поиску сезонов',
          );
          findSeasonsBySearch();
          return null; // Возвращаем null чтобы не выполнять .then()
        }
      })
      .then(res => {
        if (!res) {
          console.log('[Franchise API] Пропускаем обработку (res === null)');
          return; // Если res === null, выходим
        }

        console.log('[Franchise API] Ответ:', res.data);

        let releases = res.data.releases || [];
        console.log('[Franchise API] Найдено релизов:', releases.length);

        if (!releases.some((s: any) => s.id === anime.id)) {
          console.log('[Franchise API] Добавляем текущий аниме в список');
          releases.push(anime);
        }

        const seasonOrder = ['winter', 'spring', 'summer', 'autumn'];
        releases.sort((a: any, b: any) => {
          if (a.year !== b.year) return a.year - b.year;
          const aSeason = a.season?.value || '';
          const bSeason = b.season?.value || '';
          return seasonOrder.indexOf(aSeason) - seasonOrder.indexOf(bSeason);
        });

        console.log(
          '[Franchise API] Устанавливаем',
          releases.length,
          'сезонов',
        );
        setFranchiseReleases(releases);
      })
      .catch(error => {
        console.error('[Franchise API] Ошибка:', error);
        console.log('[Franchise API] Переходим к поиску сезонов через ошибку');
        findSeasonsBySearch();
      });
  }, [anime]);

  // Функция для расчета сходства названий
  const calculateTitleSimilarity = (
    itemTitle: string,
    itemEnglish: string,
    itemAlias: string,
    currentAlias: string,
    mainTitle: string,
  ): number => {
    let score = 0;
    let totalChecks = 0;

    // 1. Точная соответственность alias (наивысший приоритет)
    if (itemAlias === currentAlias) {
      return 1.0;
    }

    // 2. Проверка сходства alias
    if (itemAlias && currentAlias) {
      totalChecks++;
      if (
        itemAlias.includes(currentAlias) ||
        currentAlias.includes(itemAlias)
      ) {
        score += 0.9;
      } else if (itemAlias.substring(0, 6) === currentAlias.substring(0, 6)) {
        score += 0.7;
      }
    }

    // 3. Проверка основной назву
    if (itemTitle && mainTitle) {
      totalChecks++;
      const mainTitleWords = mainTitle
        .split(/\s+/)
        .filter(word => word.length > 2);
      const itemTitleWords = itemTitle
        .split(/\s+/)
        .filter(word => word.length > 2);

      // Находим общие слова
      const commonWords = mainTitleWords.filter(word =>
        itemTitleWords.some(
          itemWord => itemWord.includes(word) || word.includes(itemWord),
        ),
      );

      if (commonWords.length > 0) {
        const similarity =
          commonWords.length /
          Math.max(mainTitleWords.length, itemTitleWords.length);
        score += similarity * 0.8;
      }
    }

    // 4. Проверка английской назву
    if (itemEnglish && anime?.name?.english) {
      totalChecks++;
      const currentEnglish = anime.name.english.toLowerCase();
      if (
        itemEnglish.includes(currentEnglish) ||
        currentEnglish.includes(itemEnglish)
      ) {
        score += 0.8;
      }
    }

    // 5. Проверка префиксов (первые 6 символов)
    if (itemTitle && mainTitle) {
      totalChecks++;
      const itemPrefix = itemTitle.substring(0, 6);
      const mainPrefix = mainTitle.substring(0, 6);
      if (itemPrefix === mainPrefix) {
        score += 0.6;
      }
    }

    // 6. Проверка суффиксов (остальные 4 символа)
    if (
      itemTitle &&
      mainTitle &&
      itemTitle.length > 4 &&
      mainTitle.length > 4
    ) {
      totalChecks++;
      const itemSuffix = itemTitle.slice(-4);
      const mainSuffix = mainTitle.slice(-4);
      if (itemSuffix === mainSuffix) {
        score += 0.4;
      }
    }

    // Возвращаем средний балл
    return totalChecks > 0 ? score / totalChecks : 0;
  };

  if (error) {
    return <div className="text-center text-red-500 py-10">{error}</div>;
  }
  if (!anime) {
    return <div className="text-center text-white py-10">Загрузка...</div>;
  }

  const POSTER_URL = anime.poster?.src
    ? 'https://anilibria.wtf' + anime.poster.src
    : '';

  // Диагностика franchiseReleases
  console.log('[DEBUG] franchiseReleases перед рендером:', {
    length: franchiseReleases.length,
    releases: franchiseReleases,
    shouldShow: franchiseReleases.length > 1,
  });

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
        {/* Информация */}
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
      {franchiseReleases.length > 1 && (
        <div className="mb-5 p-5 bg-slate-800/20 rounded-lg">
          <h2 className="text-xl font-semibold mb-3">
            Порядок просмотра / Следующие сезоны: ({franchiseReleases.length}{' '}
            сезонов)
          </h2>
          <ul className="list-disc pl-5">
            {franchiseReleases.map((season: any) => (
              <li key={season.id} className="mb-2">
                {season.alias ? (
                  <>
                    {season.alias === code ? (
                      <span className="text-white font-bold cursor-default">
                        {season.ordinal ? `${season.ordinal}. ` : ''}
                        {season.year} ({season.season?.description}) -{' '}
                        {season.name?.main ||
                          season.name?.english ||
                          season.alias}
                      </span>
                    ) : (
                      <Link
                        to={`/title/${season.alias}`}
                        className="relative transition-colors duration-200 before:absolute before:bottom-0 before:left-0 before:w-0 before:h-[2px] before:bg-gray-500 before:transition-all before:duration-200 hover:before:w-full text-gray-500 hover:text-white"
                      >
                        {season.ordinal ? `${season.ordinal}. ` : ''}
                        {season.year} ({season.season?.description}) -{' '}
                        {season.name?.main ||
                          season.name?.english ||
                          season.alias}
                      </Link>
                    )}
                  </>
                ) : (
                  <span className="text-gray-500">
                    {season.ordinal ? `${season.ordinal}. ` : ''}
                    {season.year} ({season.season?.description}) -{' '}
                    {season.name?.main ||
                      season.name?.english ||
                      'Нет названия'}
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
              // 4. MP4 в files
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
              // 5. Альтернативные поля для поиска видео
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
              // 6. Если ничего не нашли
              if (!videoUrl) {
                playerError =
                  'Онлайн-плеер для этой серии недоступен (нет поддерживаемого формата видео)';
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
