import React, { useEffect, useState } from 'react';

export default function AnimatedSplash({ onFinish }: { onFinish: () => void }) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      const finish = setTimeout(onFinish, 500);
      return () => clearTimeout(finish);
    }, 1500);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-white transition-opacity duration-500 ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <h1
        className="text-5xl font-black tracking-widest"
        style={{
          backgroundImage: 'linear-gradient(90deg, #00B4DB, #7B2FBE)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        PRAYANTRA
      </h1>
      <p className="mt-4 text-gray-500 tracking-wider">
        Integrate. Automate. Accelerate.
      </p>
    </div>
  );
}