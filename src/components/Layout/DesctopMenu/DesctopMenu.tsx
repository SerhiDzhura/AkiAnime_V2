import { Link, NavLink } from 'react-router-dom';

export const DesctopMenu = () => {
  return (
    <>
      <header className="hidden md:block sticky top-0 left-0 bg-slate-900 border-b border-b-slate-500 z-10">
        <nav className="container py-3 flex items-center justify-between">
          <h1 className="text-2xl bg-gradient-to-r from-blue-500 to-violet-500 font-bold bg-clip-text text-transparent">
            <Link to="/">AkiAnime</Link>
          </h1>
          <div className="flex gap-5">
            <NavLink to="/anime-list" 
            className="header-link text-lg font-semibold">
              Список аниме
            </NavLink>
            <NavLink to="/schedule" 
            className="header-link text-lg font-semibold">
             Расписание
            </NavLink>
            <NavLink to="/random" 
            className="header-link text-lg font-semibold">
              Случайно
            </NavLink>
          </div>
        </nav>
      </header>
    </>
  );
};
