import { useEffect, useState } from 'react';
import { Pagination, PaginationProps, Select, Input, Button, Space, Form, Collapse } from 'antd';
import { AnimeCard } from '../../components'; import { Loader } from '../../components/Loader/Loader';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { FilterOutlined } from '@ant-design/icons';

const { Option } = Select;
const { Panel } = Collapse;

// Прямая ссылка на API вместо использования переменных среды
const ANILIBRIA_API_URL = 'https://anilibria.top/api/v1';
// Ссылка на главный сайт для изображений
const ANILIBRIA_SITE_URL = 'https://anilibria.top';

// Типы данных для релизов
interface Anime {
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
  fresh_at: string;
  is_ongoing: boolean;
  age_rating: {
    value: string;
    label: string;
    is_adult: boolean;
    description: string;
  };
  description: string;
  episodes_total: number;
  genres: Array<{
    id: number;
    name: string;
  }>;
}

interface ApiResponse {
  data: Anime[];
  meta: {
    pagination: {
      total: number;
      count: number;
      per_page: number;
      current_page: number;
      total_pages: number;
    };
  };
}

// Константы для фильтров
const ANIME_TYPES = [
  { value: 'TV', label: 'ТВ' },
  { value: 'ONA', label: 'ONA' },
  { value: 'WEB', label: 'WEB' },
  { value: 'OVA', label: 'OVA' },
  { value: 'OAD', label: 'OAD' },
  { value: 'MOVIE', label: 'Фильм' },
  { value: 'DORAMA', label: 'Дорама' },
  { value: 'SPECIAL', label: 'Спешл' }
];

const SEASONS = [
  { value: 'winter', label: 'Зима' },
  { value: 'spring', label: 'Весна' },
  { value: 'summer', label: 'Лето' },
  { value: 'autumn', label: 'Осень' }
];

const AGE_RATINGS = [
  { value: 'R0_PLUS', label: '0+' },
  { value: 'R6_PLUS', label: '6+' },
  { value: 'R12_PLUS', label: '12+' },
  { value: 'R16_PLUS', label: '16+' },
  { value: 'R18_PLUS', label: '18+' }
];

const PUBLISH_STATUSES = [
  { value: 'IS_ONGOING', label: 'Онгоинг' },
  { value: 'IS_NOT_ONGOING', label: 'Завершено' }
];

const PRODUCTION_STATUSES = [
  { value: 'IS_IN_PRODUCTION', label: 'В производстве' },
  { value: 'IS_NOT_IN_PRODUCTION', label: 'Производство завершено' }
];

const SORT_OPTIONS = [
  { value: 'FRESH_AT_DESC', label: 'Сначала новые' },
  { value: 'FRESH_AT_ASC', label: 'Сначала старые' },
  { value: 'RATING_DESC', label: 'По рейтингу (убывание)' },
  { value: 'RATING_ASC', label: 'По рейтингу (возрастание)' },
  { value: 'YEAR_DESC', label: 'По году (убывание)' },
  { value: 'YEAR_ASC', label: 'По году (возрастание)' }
];

// Генерируем годы для фильтра
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1979 + 1 }, (_, i) => ({
  value: (1980 + i).toString(),
  label: (1980 + i).toString()
}));

export const AnimeCatalogPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [pagination, setPagination] = useState({ 
    current: 1, 
    total: 0, 
    pageSize: 12 
  });
  const [loading, setLoading] = useState(true);
  const [genres, setGenres] = useState<Array<{ id: number; name: string }>>([]);
  const [isMobileView, setIsMobileView] = useState<boolean>(false);
  const [filterCollapsed, setFilterCollapsed] = useState<boolean>(true);
  const [isNavigationMenuOpen, setIsNavigationMenuOpen] = useState<boolean>(false);
  const [activeFilters, setActiveFilters] = useState<number>(0);

  // Форма фильтров
  const [form] = Form.useForm();

  // Проверка мобильного режима
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth <= 768);
    };
    
    // Инициализация при первой загрузке
    checkMobileView();
    
    // Добавляем слушатель для изменения размера окна
    window.addEventListener('resize', checkMobileView);
    
    // Очищаем слушатель при демонтаже компонента
    return () => {
      window.removeEventListener('resize', checkMobileView);
    };
  }, []);
  
  // Отслеживание состояния навигационного меню
  useEffect(() => {
    // Функция для определения, открыто ли боковое меню
    const checkNavigationMenu = () => {
      // Возможные способы определения, открыто ли меню:
      // 1. Поиск элемента с определенным классом или стилем
      const navMenu = document.querySelector('.main-navigation-menu');
      if (navMenu) {
        const isOpen = window.getComputedStyle(navMenu).display !== 'none';
        setIsNavigationMenuOpen(isOpen);
        
        // Если меню открыто, закрываем фильтры
        if (isOpen) {
          setFilterCollapsed(true);
        }
      }
    };
    
    // Проверяем начальное состояние
    checkNavigationMenu();
    
    // Можно также добавить наблюдатель за изменениями DOM
    const observer = new MutationObserver(checkNavigationMenu);
    observer.observe(document.body, { 
      childList: true, 
      subtree: true, 
      attributes: true, 
      attributeFilter: ['class', 'style'] 
    });
    
    // Также можно слушать события, которые могут указывать на открытие/закрытие меню
    document.addEventListener('click', (e) => {
      // Проверяем, был ли клик на кнопке меню или элементе меню
      const target = e.target as HTMLElement;
      if (target.closest('.menu-toggle-button') || target.closest('.navigation-link')) {
        setTimeout(checkNavigationMenu, 50); // Небольшая задержка для завершения анимации
      }
    });
    
    return () => {
      observer.disconnect();
    };
  }, []);
  
  // Закрытие фильтров при изменении маршрута
  useEffect(() => {
    setFilterCollapsed(true);
  }, [location.pathname]);

  // Загрузка жанров
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const response = await axios.get(`${ANILIBRIA_API_URL}/anime/catalog/references/genres`);
        setGenres(response.data.map((genre: any) => ({ 
          id: genre.id, 
          name: genre.title 
        })));
      } catch (error) {
        console.error('Ошибка при загрузке жанров:', error);
      }
    };

    fetchGenres();
  }, []);

  // Загрузка аниме релизов
  const fetchAnime = async (filters: any = {}) => {
    setLoading(true);
    
    try {
      const params = new URLSearchParams();
      
      // Добавляем базовые параметры
      params.append('page', filters.page?.toString() || '1');
      params.append('limit', filters.limit?.toString() || '12');
      
      // Подсчет активных фильтров
      let activeFiltersCount = 0;
      
      // Добавляем фильтры, только если они есть
      if (filters.genres?.length) {
        params.append('f[genres]', filters.genres.join(','));
        activeFiltersCount += 1;
      }
      
      if (filters.types?.length) {
        params.append('f[types]', filters.types.join(','));
        activeFiltersCount += 1;
      }
      
      if (filters.seasons?.length) {
        params.append('f[seasons]', filters.seasons.join(','));
        activeFiltersCount += 1;
      }
      
      if (filters.fromYear) {
        params.append('f[years][from_year]', filters.fromYear);
        activeFiltersCount += 1;
      }
      
      if (filters.toYear) {
        params.append('f[years][to_year]', filters.toYear);
        activeFiltersCount += 1;
      }
      
      if (filters.search) {
        params.append('f[search]', filters.search);
        activeFiltersCount += 1;
      }
      
      if (filters.sorting && filters.sorting !== 'FRESH_AT_DESC') {
        params.append('f[sorting]', filters.sorting);
        activeFiltersCount += 1;
      }
      
      if (filters.ageRatings?.length) {
        params.append('f[age_ratings]', filters.ageRatings.join(','));
        activeFiltersCount += 1;
      }
      
      if (filters.publishStatuses?.length) {
        params.append('f[publish_statuses]', filters.publishStatuses.join(','));
        activeFiltersCount += 1;
      }
      
      if (filters.productionStatuses?.length) {
        params.append('f[production_statuses]', filters.productionStatuses.join(','));
        activeFiltersCount += 1;
      }
      
      setActiveFilters(activeFiltersCount);
      
      const response = await axios.get<ApiResponse>(`${ANILIBRIA_API_URL}/anime/catalog/releases?${params.toString()}`);
      
      setAnimeList(response.data.data);
      setPagination({
        current: response.data.meta.pagination.current_page,
        total: response.data.meta.pagination.total,
        pageSize: filters.limit || 12
      });
    } catch (error) {
      console.error('Ошибка при загрузке релизов:', error);
      setAnimeList([]);
    } finally {
      setLoading(false);
    }
  };

  // Загрузка начальных данных
  useEffect(() => {
    fetchAnime({ page: 1, limit: 12, sorting: 'FRESH_AT_DESC' });
  }, []);

  // Изменение страницы
  const handlePageChange: PaginationProps['onChange'] = (page) => {
    const values = form.getFieldsValue();
    fetchAnime({ ...values, page });
  };

  // Применение фильтров
  const handleApplyFilters = (values: any) => {
    fetchAnime({ ...values, page: 1 });
    // Закрываем фильтр после применения на мобильных устройствах
    if (isMobileView) {
      setFilterCollapsed(true);
    }
  };

  // Сброс фильтров
  const handleResetFilters = () => {
    form.resetFields();
    fetchAnime({ page: 1, limit: 12, sorting: 'FRESH_AT_DESC' });
    // Закрываем фильтр после сброса на мобильных устройствах
    if (isMobileView) {
      setFilterCollapsed(true);
    }
  };

  // Обработчик изменения состояния свертывания фильтра
  const handleFilterCollapseChange = (key: string | string[]) => {
    setFilterCollapsed(key.length === 0);
  };

  // Определение, нужно ли скрывать фильтры
  const shouldHideFilters = isNavigationMenuOpen || isMobileView;

  return (
    <div className="container mx-auto py-4 px-3">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Каталог аниме</h1>
        
        {/* Информация об активных фильтрах */}
        {activeFilters > 0 && (
          <span className="text-xs text-gray-500">Активных фильтров: {activeFilters}</span>
        )}
      </div>
      
      {/* Скрываем весь компонент фильтров, если меню навигации открыто или в мобильном режиме */}
      <div className={shouldHideFilters ? "hidden" : ""}>
        <div className="mb-3 filter-wrapper">
          <Collapse 
            className="filter-collapse" 
            activeKey={filterCollapsed ? [] : ['1']} 
            onChange={handleFilterCollapseChange}
            size="small"
            ghost // Прозрачный фон, чтобы фильтр был менее заметным
            bordered={false} // Без рамок
          >
            <Panel 
              header={
                <div className="flex items-center text-white">
                  <FilterOutlined className="mr-1" />
                  <span className="text-sm">{activeFilters > 0 ? `Фильтры (${activeFilters})` : "Фильтры"}</span>
                </div>
              }
              key="1" 
              style={{ borderRadius: '4px', backgroundColor: '#1a2b5f', border: '1px solid #2a3f7a' }}
            >
              <Form 
                form={form}
                layout="vertical" 
                onFinish={handleApplyFilters}
                initialValues={{ 
                  limit: 12, 
                  sorting: 'FRESH_AT_DESC' 
                }}
                size="small"
                className="filter-form-compact"
              >
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  <Form.Item name="search" label={<span className="text-xs text-white">Поиск</span>} style={{ marginBottom: '8px' }}>
                    <Input placeholder="Название аниме" size="small" />
                  </Form.Item>
                  
                  <Form.Item name="sorting" label={<span className="text-xs text-white">Сортировка</span>} style={{ marginBottom: '8px' }}>
                    <Select placeholder="Сортировка" size="small" style={{ fontSize: '12px' }}>
                      {SORT_OPTIONS.map(option => (
                        <Option key={option.value} value={option.value}>{option.label}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                  
                  <Form.Item name="types" label={<span className="text-xs text-white">Типы</span>} style={{ marginBottom: '8px' }}>
                    <Select 
                      mode="multiple" 
                      placeholder="Типы" 
                      allowClear 
                      size="small" 
                      style={{ fontSize: '12px' }}
                      maxTagCount={1}
                    >
                      {ANIME_TYPES.map(type => (
                        <Option key={type.value} value={type.value}>{type.label}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                  
                  <Form.Item name="seasons" label={<span className="text-xs text-white">Сезоны</span>} style={{ marginBottom: '8px' }}>
                    <Select 
                      mode="multiple" 
                      placeholder="Сезоны" 
                      allowClear 
                      size="small" 
                      style={{ fontSize: '12px' }}
                      maxTagCount={1}
                    >
                      {SEASONS.map(season => (
                        <Option key={season.value} value={season.value}>{season.label}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                  
                  <div className="flex space-x-1">
                    <Form.Item name="fromYear" label={<span className="text-xs text-white">От</span>} className="w-1/2" style={{ marginBottom: '8px' }}>
                      <Select 
                        placeholder="Год" 
                        allowClear 
                        size="small" 
                        style={{ fontSize: '12px' }}
                      >
                        {YEARS.map(year => (
                          <Option key={year.value} value={year.value}>{year.label}</Option>
                        ))}
                      </Select>
                    </Form.Item>
                    
                    <Form.Item name="toYear" label={<span className="text-xs text-white">До</span>} className="w-1/2" style={{ marginBottom: '8px' }}>
                      <Select 
                        placeholder="Год" 
                        allowClear 
                        size="small" 
                        style={{ fontSize: '12px' }}
                      >
                        {YEARS.map(year => (
                          <Option key={year.value} value={year.value}>{year.label}</Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </div>
                </div>
                
                <div className="flex flex-wrap justify-between items-center mt-2">
                  <Space size="small">
                    <Button 
                      type="primary" 
                      htmlType="submit" 
                      size="small" 
                      style={{ 
                        fontSize: '12px', 
                        backgroundColor: '#1e40af', 
                        borderColor: '#1e40af' 
                      }}
                    >
                      Применить
                    </Button>
                    <Button 
                      onClick={handleResetFilters} 
                      size="small" 
                      style={{ 
                        fontSize: '12px', 
                        backgroundColor: '#d32f2f', 
                        color: 'white', 
                        borderColor: '#b71c1c' 
                      }}
                    >
                      Сбросить фильтры
                    </Button>
                  </Space>
                  
                  <div className="flex items-center mt-2 md:mt-0">
                    <span className="text-xs text-white mr-2">На странице:</span>
                    <Form.Item name="limit" noStyle>
                      <Select 
                        size="small" 
                        style={{ width: 60, fontSize: '12px' }}
                      >
                        <Option value={6}>6</Option>
                        <Option value={12}>12</Option>
                        <Option value={24}>24</Option>
                        <Option value={36}>36</Option>
                      </Select>
                    </Form.Item>
                  </div>
                </div>
              </Form>
            </Panel>
          </Collapse>
        </div>
      </div>
      
     {loading && <Loader />} 
      
      {!loading && animeList.length === 0 && (
        <div className="text-center py-6">
          <p className="text-base">По вашему запросу ничего не найдено</p>
          <Button 
            onClick={handleResetFilters} 
            className="mt-3" 
            size="small"
            style={{ 
              backgroundColor: '#d32f2f', 
              color: 'white', 
              borderColor: '#b71c1c' 
            }}
          >
            Сбросить фильтры
          </Button>
        </div>
      )}
      
      {/* Сетка для отображения аниме */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {animeList.map(anime => (
          <div key={anime.id}>
            <AnimeCard 
              code={anime.id.toString()} 
              image={anime.poster.src} 
              title={anime.name.main} 
            />
          </div>
        ))}
      </div>
      
      <div className="flex items-center justify-center py-4 mt-3">
        <Pagination
          responsive
          current={pagination.current}
          total={pagination.total}
          pageSize={pagination.pageSize}
          onChange={handlePageChange}
          showSizeChanger={false}
          size="small"
        />
      </div>
    </div>
  );
};