'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import apiClient from '@/lib/api-client';

/**
 * API Test Component
 * Use this to verify API routes are working correctly
 */
export function APITest() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    try {
      const response = await apiClient.testConnection();
      setResult(response);
    } catch (error: any) {
      setResult({ ok: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const testGetBattlefronts = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getBattlefronts();
      setResult(response);
    } catch (error: any) {
      setResult({ ok: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 max-w-2xl mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-4">API Test Panel</h2>
      
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Test API Connection</h3>
          <Button onClick={testConnection} disabled={loading}>
            Test GET /api/actions
          </Button>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Test Authenticated Call</h3>
          <Button onClick={testGetBattlefronts} disabled={loading}>
            Test POST /api/actions (Get Battlefronts)
          </Button>
        </div>

        {loading && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-blue-700 dark:text-blue-300">Loading...</p>
          </div>
        )}

        {result && !loading && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <h4 className="font-semibold mb-2">Result:</h4>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
        <h4 className="font-semibold mb-2 text-amber-900 dark:text-amber-100">
          Expected Results:
        </h4>
        <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1">
          <li>✅ Test 1 should return: <code>{`{ ok: true, message: "..." }`}</code></li>
          <li>✅ Test 2 should return: <code>{`{ ok: true, success: true, battlefronts: [...] }`}</code></li>
          <li>❌ If not logged in, should return authentication error</li>
        </ul>
      </div>
    </Card>
  );
}
