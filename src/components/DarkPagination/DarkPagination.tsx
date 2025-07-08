import React from 'react';

interface DarkPaginationProps {
  current: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
  className?: string;
}

const getPages = (current: number, totalPages: number) => {
  const pages: (number | string)[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    if (current <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', totalPages);
    } else if (current >= totalPages - 3) {
      pages.push(
        1,
        '...',
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      );
    } else {
      pages.push(
        1,
        '...',
        current - 1,
        current,
        current + 1,
        '...',
        totalPages,
      );
    }
  }
  return pages;
};

export const DarkPagination: React.FC<DarkPaginationProps> = ({
  current,
  total,
  pageSize,
  onChange,
  className = '',
}) => {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const pages = getPages(current, totalPages);

  return (
    <nav
      className={`flex items-center justify-center gap-1 py-2 ${className}`}
      aria-label="Пагінація"
    >
      {/* Prev */}
      <button
        className="dark-pagination-arrow"
        disabled={current === 1}
        onClick={() => onChange(current - 1)}
        aria-label="Попередня сторінка"
        type="button"
      >
        &lt;
      </button>
      {/* Pages */}
      {pages.map((page, idx) =>
        page === '...' ? (
          <span key={`ellipsis-${idx}`} className="dark-pagination-ellipsis">
            ...
          </span>
        ) : (
          <button
            key={page}
            className={`dark-pagination-page${
              page === current ? ' active' : ''
            }`}
            onClick={() => typeof page === 'number' && onChange(page)}
            aria-current={page === current ? 'page' : undefined}
            type="button"
            disabled={page === current}
          >
            {page}
          </button>
        ),
      )}
      {/* Next */}
      <button
        className="dark-pagination-arrow"
        disabled={current === totalPages}
        onClick={() => onChange(current + 1)}
        aria-label="Наступна сторінка"
        type="button"
      >
        &gt;
      </button>
    </nav>
  );
};
