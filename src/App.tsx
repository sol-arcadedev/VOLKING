import React from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { About } from './components/About';
import { Leaderboard } from './components/Leaderboard';
import { Rewards } from './components/Rewards';
import { Footer } from './components/Footer';
import './index.css';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-dark-900 text-white">
      <Header />
      <main>
        <Hero />
        <About />
        <Leaderboard />
        <Rewards />
      </main>
      <Footer />
    </div>
  );
};

export default App;
