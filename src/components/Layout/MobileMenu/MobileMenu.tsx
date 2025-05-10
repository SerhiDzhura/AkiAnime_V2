import { Bars3BottomLeftIcon } from '@heroicons/react/16/solid';
import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';

export const MobileMenu = () => {
  const [active, setActive] = useState(false);

  return (
    <>
      <header className="md:hidden sticky top-0 left-0 bg-slate-900 border-b border-b-slate-500 z-10 ">
        <nav className="container flex items-center justify-between py-2">
          <h1 className="text-2xl bg-gradient-to-r from-blue-500 to-violet-500 font-bold bg-clip-text text-transparent">
            <Link to="/">AkiAnime</Link>
          </h1>
          <button onClick={() => setActive(!active)}>
            <Bars3BottomLeftIcon className="w-10" />
          </button>
        </nav>
      </header>
      <div
        className={`md:hidden absolute top-0 left-0 w-full h-full bg-slate-800 py-24 transition-transform ${
          active ? '-translate-y-0' : '-translate-y-full'
        }`}
      >
        <nav className="w-full h-full container flex flex-col items-end gap-5">
          <NavLink to ="/catalog" className="text-2xl font-semibold">
            Каталог
          </NavLink>
          <NavLink to="/anime-list" className="text-2xl font-semibold">
            Список аниме
          </NavLink>
          <NavLink to="/schedule" className="text-2xl font-semibold">
            Расписание
          </NavLink>
          <NavLink to="/random" className="text-2xl font-semibold">
            Случайно
          </NavLink>
        </nav>
      </div>
    </>
  );
};
