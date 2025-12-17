import React from 'react';
import ParticlesBackground from './ParticlesBackground';

const App: React.FC = () => {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#050505]">
      {/* Background particle animation */}
      <ParticlesBackground />
    </div>
  );
};

export default App;