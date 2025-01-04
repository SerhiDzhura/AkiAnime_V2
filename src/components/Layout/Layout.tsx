import { Outlet } from 'react-router-dom';
import { MobileMenu } from './MobileMenu/MobileMenu';
import { DesctopMenu } from './DesctopMenu/DesctopMenu';


export const Layout = () => {
  return (
    <>
      <DesctopMenu />
      <MobileMenu />
      <Outlet />
    </>
  );
};
