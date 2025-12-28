import { FC } from 'react';

interface HeaderProps {
  title?: string;
}

export const Header: FC<HeaderProps> = ({ title = 'Next.js App' }) => {
  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4 ">
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>
    </header>
  );
};


