import { useEffect, useState } from 'react';

export default function TestAdmin() {
  const [result, setResult] = useState<string>('Testing...');

  useEffect(() => {
    testAdmin();
  }, []);

  const testAdmin = async () => {
    try {
      console.log('Testing admin API...');

      const response = await fetch('http://localhost:3000/api/admin/stats', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const text = await response.text();
        setResult(`Error ${response.status}: ${text}`);
        return;
      }

      const data = await response.json();
      setResult(`Success! Data: ${JSON.stringify(data, null, 2)}`);
    } catch (err: any) {
      console.error('Test error:', err);
      setResult(`Fetch error: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold mb-4">Admin API Test</h1>
      <pre className="bg-white p-4 rounded shadow">
        {result}
      </pre>
      <button
        onClick={testAdmin}
        className="mt-4 bg-primary-600 text-white px-4 py-2 rounded"
      >
        Test Again
      </button>
    </div>
  );
}
