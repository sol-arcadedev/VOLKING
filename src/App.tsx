import React from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { About } from './components/About';
import { Leaderboard } from './components/Leaderboard';
import { HallOfDegens } from './components/HallOfDegens';
import { GlobalStats } from './components/GlobalStats';
import { Rewards } from './components/Rewards';
import { Footer } from './components/Footer';
import './index.css';

const App: React.FC = () => {
    return (
        <div className="min-h-screen bg-retro-black text-white overflow-x-hidden">
            <Header />
            <main>
                <Hero />
                <Leaderboard />
                <Rewards />
                <About />
                <GlobalStats />
                <HallOfDegens />
            </main>
            <Footer />
        </div>
    );
};

export default App;