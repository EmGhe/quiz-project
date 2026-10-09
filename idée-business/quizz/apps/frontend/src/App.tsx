import { useState, useEffect } from 'react';

function App() {
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    fetch('http://localhost:3000/health')
      .then(res => res.json())
      .then(data => setHealth(data))
      .catch(err => console.error('Backend not running:', err));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary-600 mb-4">
          Quiz Game Platform
        </h1>
        <p className="text-gray-600 mb-8">
          Frontend + Backend initialized successfully
        </p>
        {health && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 inline-block">
            <p className="text-green-800 font-medium">
              ✓ Backend Status: {health.status}
            </p>
            <p className="text-green-600 text-sm mt-1">
              {health.service} • {new Date(health.timestamp).toLocaleTimeString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
