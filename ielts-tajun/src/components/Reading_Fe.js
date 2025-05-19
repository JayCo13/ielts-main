import React from "react";

const BuildingLayout = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 via-indigo-100 to-blue-200 relative overflow-hidden">
      {/* Animated Glow Effect */}
      <div className="absolute -z-10 left-1/2 top-1/2 w-[400px] h-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-300 opacity-30 blur-3xl animate-pulse"></div>
      
      {/* Building SVG or Emoji */}
      <div className="relative flex flex-col items-center">
        {/* Example SVG: Replace with your own or use a Lottie animation */}
        <svg
          className="w-32 h-32 mb-6 drop-shadow-2xl animate-bounce"
          viewBox="0 0 64 64"
          fill="none"
        >
          <rect x="8" y="20" width="48" height="36" rx="4" fill="#3B82F6" />
          <rect x="16" y="28" width="8" height="12" rx="1" fill="#fff" />
          <rect x="28" y="28" width="8" height="12" rx="1" fill="#fff" />
          <rect x="40" y="28" width="8" height="12" rx="1" fill="#fff" />
          <rect x="24" y="44" width="16" height="8" rx="1" fill="#fff" />
          <rect x="28" y="8" width="8" height="12" rx="2" fill="#2563EB" />
        </svg>
        {/* Or use an emoji: <span className="text-8xl animate-bounce">🏢</span> */}

        <h1 className="text-4xl font-bold text-blue-700 mb-2">Building in Progress</h1>
        <p className="text-lg text-blue-900 opacity-80 mb-6">
          This section is under construction. Please check back soon!
        </p>
        <button
          className="px-6 py-2 rounded-lg bg-blue-500 text-white font-semibold shadow hover:bg-blue-600 transition"
          onClick={() => window.location.href = "/"}
        >
          Go Home
        </button>
      </div>
    </div>
  );
};

export default BuildingLayout;
