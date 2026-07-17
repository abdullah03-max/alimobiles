import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useImeiStore } from '@/stores/imeiStore';

const STORAGE_KEY = 'pos_product_imeis';

/**
 * One-time migration utility that moves IMEIs from localStorage
 * to Supabase's product_imeis table. Shows a button only if
 * localStorage contains IMEI data that hasn't been migrated yet.
 */
export default function MigrateImeis() {
  const [localImeis, setLocalImeis] = useState<any[]>([]);
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState<{ success: number; skipped: number; failed: number } | null>(null);
  const loadData = useImeiStore(s => s.loadData);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as any[];
        if (parsed.length > 0) {
          setLocalImeis(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  if (localImeis.length === 0 && !result) return null;

  const handleMigrate = async () => {
    setMigrating(true);
    let success = 0;
    let skipped = 0;
    let failed = 0;

    for (const item of localImeis) {
      const imei1 = item.imei1 || item.imei || '';
      const imei2 = item.imei2 || '';
      if (!imei1) {
        skipped++;
        continue;
      }

      const row = {
        product_id: item.productId,
        imei: item.imei || imei1,
        imei1,
        imei2,
        status: item.status || 'available',
        color: item.color || null,
        ram: item.ram || null,
        storage: item.storage || null,
        sold_at: item.soldAt || null,
      };

      const { error } = await supabase.from('product_imeis').insert(row);
      if (error) {
        // Check if it's a duplicate key error (IMEI already exists in Supabase)
        if (error.code === '23505') {
          skipped++;
        } else {
          console.error('Migration error for IMEI:', imei1, error);
          failed++;
        }
      } else {
        success++;
      }
    }

    setResult({ success, skipped, failed });

    // If all succeeded or were skipped (no failures), clear localStorage
    if (failed === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
      setLocalImeis([]);
    }

    // Reload IMEI store from Supabase
    await loadData();
    setMigrating(false);
  };

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 text-amber-600 text-xl">⚠️</div>
        <div className="flex-1">
          <h4 className="font-semibold text-amber-900 text-sm">IMEI Data Migration Required</h4>
          {!result ? (
            <>
              <p className="text-amber-800 text-xs mt-1">
                Found <strong>{localImeis.length}</strong> IMEI record(s) stored in this browser's local storage.
                These need to be migrated to the cloud database so they're accessible from all devices.
              </p>
              <button
                onClick={handleMigrate}
                disabled={migrating}
                className="mt-2 inline-flex items-center px-3 py-1.5 rounded-md bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 disabled:opacity-50 transition"
              >
                {migrating ? 'Migrating...' : `Migrate ${localImeis.length} IMEIs to Cloud`}
              </button>
            </>
          ) : (
            <div className="text-xs mt-1 space-y-1">
              <p className="text-green-700">✅ Migrated: <strong>{result.success}</strong></p>
              {result.skipped > 0 && <p className="text-amber-700">⏭️ Skipped (duplicates): <strong>{result.skipped}</strong></p>}
              {result.failed > 0 && <p className="text-red-700">❌ Failed: <strong>{result.failed}</strong> — check console for details</p>}
              {result.failed === 0 && <p className="text-green-800 font-semibold">Local storage data cleared. Migration complete!</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
