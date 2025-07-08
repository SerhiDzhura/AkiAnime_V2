import { useEffect, useState } from 'react';
import { $api } from '../../api';
import { DarkPagination } from '../../components/DarkPagination/DarkPagination';
import { AnimeList, Title } from '../../types/anime.types';
import { AnimeCard } from '../../components';
import { Loader } from '../../components/Loader/Loader';

const PAGE_SIZE = 6;
const TOTAL_PAGES = 37;

export const AnimeListPage = () => {
  const [titles, setTitles] = useState<Title[]>();
  const [activePage, setActivePage] = useState(1);
  const [loading, setLoading] = useState(true);

  const changePage = (page: number) => {
    setActivePage(page);
  };

  useEffect(() => {
    setLoading(true);
    $api
      .get<AnimeList>('/title/updates', {
        params: {
          playlist_type: 'array',
          page: activePage,
          items_per_page: PAGE_SIZE,
        },
      })
      .then(response => {
        setTitles(response.data.list);
      })
      .finally(() => setLoading(false));
  }, [activePage]);

  if (loading) {
    return <Loader />;
  }

  return (
    <>
      <div className="container py-5">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 grid-cols-1 gap-5 justify-items-center">
          {titles &&
            titles.map(title => (
              <AnimeCard
                key={title.id}
                code={title?.code}
                image={title?.posters.original.url}
                title={title?.names.ru}
              />
            ))}
        </div>
        <div className="flex items-center justify-center py-5">
          <DarkPagination
            current={activePage}
            total={PAGE_SIZE * TOTAL_PAGES}
            pageSize={PAGE_SIZE}
            onChange={changePage}
          />
        </div>
      </div>
    </>
  );
};
