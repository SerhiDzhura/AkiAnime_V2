import { useEffect, useState } from 'react';
import { $api } from '../../api';
import { Pagination, PaginationProps } from 'antd';
import { AnimeList, IPagination, Title } from '../../types/anime.types';
import { AnimeCard } from '../../components';
import { Loader } from '../../components/Loader/Loader';


export const AnimeListPage = () => {
  const [titles, setTitles] = useState<Title[]>();
  const [pagination, setPagination] = useState<IPagination>();
  const [activePage, setActivePage] = useState(1);
  const [loading, setLoading] = useState(true)

  const changePage: PaginationProps['onChange'] = page => {
    setActivePage(page);
  };

  useEffect(() => {
    setLoading(true)
    $api
      .get<AnimeList>('/title/updates', {
        params: {
          playlist_type: 'array',
          page: activePage,
          items_per_page: 6,
        },
      })
      .then(response => {
        setTitles(response.data.list);
        setPagination(response.data.pagination);
        setLoading(false);
      });
  }, [activePage]);

  if (loading){ 
     return <Loader />;
  }

  return (
    <>
      <div className="container py-5">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 grid-cols-1 gap-5 justify-items-center">
          {titles &&
            titles?.map(title => (
              <AnimeCard
                key={title.id}
                code={title?.code}
                image={title?.posters.original.url}
                title={title?.names.ru}
              />
            ))}
        </div>
        <div className="flex items-center justify-center py-5">
          <Pagination
            responsive // адаптивність для різних пристроїв
            current={activePage} // активна сторінка
            total={pagination?.pages} // загальна кількість сторінок
            defaultCurrent={1} // стартова сторінка
            onChange={changePage} // функція зміни сторінки
            showSizeChanger={false} // приховати зміну кількості елементів
            size="small" // компактний розмір (за бажанням)
            className="block" // універсальний клас для стилізації
          />
        </div>
      </div>
    </>
  );
};
