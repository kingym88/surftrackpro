import React from 'react';
import { Screen } from '../types';

interface QuiverScreenProps {
  onNavigate: (screen: Screen) => void;
}

export const QuiverScreen: React.FC<QuiverScreenProps> = ({ onNavigate }) => {
  return (
    <div className="pb-24">
        {/* Header */}
        <header className="px-6 pt-4 pb-6 sticky top-0 bg-background-dark/80 backdrop-blur-md z-40 border-b border-primary/5">
            <div className="flex justify-between items-center mb-2">
                <h1 className="text-3xl font-bold tracking-tight text-text">Your Quiver</h1>
                <button className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-icons-round">search</span>
                </button>
            </div>
            <p className="text-textMuted text-sm">Managing 4 boards in your collection</p>
        </header>

        <main className="px-5 py-6 space-y-6">
            {/* Board 1 */}
            <div className="bg-background rounded-xl overflow-hidden shadow-sm border border-primary/10 group cursor-pointer hover:border-primary/30 transition-all">
                <div className="relative h-48 overflow-hidden bg-surface">
                    <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBjE1n5yCXr9A3XTsrdN90grY1qum_n8X1PWwcx-2wunFJB5kiXU0nlddxXnCGUcoRaYk4m0HuSi2xa9lLGfruzqh7DUXfPWCNPhw7jeuR8DPSC3jHmPx20DZbVAoSr_aKVafJznmI4tkZm4M6fJr_yYWWkFkOFj--PO0vHDgFWXlnO-BSUit9hqrReCT_cuWssX3DUFb5cRm_Pocy_vKgNvHkj21zpPJw6JHYQ0710cAwb4YtrEzWv-peeS6SR6Gx-KBWXvrI4nc2M" alt="Surfboard" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-3 right-3">
                        <span className="bg-primary text-text text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-lg">Daily Driver</span>
                    </div>
                </div>
                <div className="p-5">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-xl font-bold text-text">Firewire Seaside</h3>
                            <p className="text-slate-500 text-sm">Rob Machado Designs</p>
                        </div>
                        <div className="text-right">
                            <span className="text-2xl font-bold text-primary">32.7<span className="text-sm ml-0.5">L</span></span>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-3 border-t border-border">
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase text-slate-500 font-semibold">Length</span>
                            <span className="font-medium text-textMuted">5'6"</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase text-slate-500 font-semibold">Width</span>
                            <span className="font-medium text-textMuted">21 1/4"</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase text-slate-500 font-semibold">Thick</span>
                            <span className="font-medium text-textMuted">2 1/2"</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Board 2 */}
            <div className="bg-background rounded-xl overflow-hidden shadow-sm border border-primary/10 group cursor-pointer hover:border-primary/30 transition-all">
                <div className="relative h-48 overflow-hidden bg-surface">
                    <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCmfvqlq_Fmy5qaE6DNBVQHqoSUyy06cQkofwIIY0KFGkJZOPQTewZtBaAA4IuhyYGkVduD47UNDgXswEe-AUrBSN0oV7m7KpRHtmUU4uRT3EQi343pIhjdzAAqNO4VILhEyeZfJNfWlPQU6JUhrzP7Kd4599t0aF4dxi05E6ofgbbrHosFQz157suRK2fqdboofQql1c2RAzA1HqiHz-sKfD_6Q0na46xBCVKAEif_IzYKIa1_8tw-v1UfnsDop78SoCPzQjnX2yGw" alt="Surfboard" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-3 right-3">
                        <span className="bg-background/80 backdrop-blur-md text-text text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">Step-up</span>
                    </div>
                </div>
                <div className="p-5">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-xl font-bold text-text">Lost Driver 2.0</h3>
                            <p className="text-slate-500 text-sm">Mayhem</p>
                        </div>
                        <div className="text-right">
                            <span className="text-2xl font-bold text-primary">28.5<span className="text-sm ml-0.5">L</span></span>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-3 border-t border-border">
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase text-slate-500 font-semibold">Length</span>
                            <span className="font-medium text-textMuted">5'11"</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase text-slate-500 font-semibold">Width</span>
                            <span className="font-medium text-textMuted">19"</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase text-slate-500 font-semibold">Thick</span>
                            <span className="font-medium text-textMuted">2 3/8"</span>
                        </div>
                    </div>
                </div>
            </div>
        </main>

        <button 
          onClick={() => onNavigate(Screen.ADD_BOARD)}
          className="fixed bottom-24 right-6 w-16 h-16 bg-primary text-text rounded-full shadow-2xl flex items-center justify-center transform active:scale-95 transition-transform z-40 hover:bg-primary/90"
        >
            <span className="material-icons-round text-3xl">add</span>
        </button>
    </div>
  );
};