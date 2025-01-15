import { Route, Routes } from 'react-router-dom';
import { HomePage, AnimeListPage, AnimeDetailPage, AnimeSchedulePage, AnimeRandomPage } from './pages';
import { Layout } from './components';

export const App = () => {
  return (
    <>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route path="/" element={<HomePage />} index />
          <Route path="/anime-list" element={<AnimeListPage/>} />
          <Route path="/title/:code" element={<AnimeDetailPage />} />
          <Route path="/schedule"element={<AnimeSchedulePage />}/>
          <Route path="/random"element={<AnimeRandomPage />}/>
        </Route>
      </Routes>
    </>
  );
};
