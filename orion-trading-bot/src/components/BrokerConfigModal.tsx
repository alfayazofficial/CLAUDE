import React, { useState } from 'react';
import { BrokerConfig, BrokerProvider } from '../types/trading';
import { idempotentBroker } from '../lib/idempotent-broker';
import { Server, X, Shield, CheckCircle2, RotateCcw, Key } from 'lucide-react';

interface BrokerConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BrokerConfigModal: React.FC<BrokerConfigModalProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<BrokerConfig>(idempotentBroker.getConfig());
  const [initialBal, setInitialBal] = useState<number>(100000);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    idempotentBroker.updateConfig(config);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleReset = () => {
    if (window.confirm('Reset account balance and clear trade history?')) {
      idempotentBroker.resetAccount(initialBal);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-[#090c12] p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-400">
              <Server className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-100 uppercase tracking-wider">
                Broker Connection &amp; Routing Layer
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                Hardened API Execution Gateway
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-3 text-xs">
          {/* Provider Selection */}
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
              Broker Provider
            </label>
            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              {(
                [
                  { id: 'PAPER', name: 'Paper (Local ACID)' },
                  { id: 'ALPACA', name: 'Alpaca Markets' },
                  { id: 'CCXT_BINANCE', name: 'CCXT (Binance API)' },
                  { id: 'INTERACTIVE_BROKERS', name: 'Interactive Brokers' },
                ] as { id: BrokerProvider; name: string }[]
              ).map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setConfig({ ...config, provider: b.id })}
                  className={`p-2 rounded border text-left transition-colors ${
                    config.provider === b.id
                      ? 'border-cyan-500 bg-cyan-950/40 text-cyan-300 font-bold'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>

          {/* Testnet vs Live Mode */}
          <div className="flex items-center justify-between p-2.5 rounded border border-slate-800 bg-slate-900/40">
            <div>
              <div className="font-semibold text-slate-200">Execution Mode</div>
              <div className="text-[10px] text-slate-400">
                {config.isTestnet
                  ? 'Paper / Sandbox simulation environment with slippage guard'
                  : 'LIVE CAPITAL: Direct broker routing (Idempotent tracking enforced)'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setConfig({ ...config, isTestnet: !config.isTestnet })}
              className={`px-3 py-1 rounded font-mono text-[10px] font-bold border transition-colors ${
                config.isTestnet
                  ? 'border-emerald-500/50 bg-emerald-950/50 text-emerald-300'
                  : 'border-rose-500/50 bg-rose-950/50 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.4)]'
              }`}
            >
              {config.isTestnet ? 'SANDBOX / PAPER' : 'LIVE CAPITAL'}
            </button>
          </div>

          {/* API Keys (If external broker selected) */}
          {config.provider !== 'PAPER' && (
            <div className="space-y-2 pt-1">
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                  API Key ID
                </label>
                <input
                  type="text"
                  value={config.apiKey}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                  placeholder="e.g. PK78491028472918"
                  className="w-full rounded border border-slate-800 bg-slate-900 px-3 py-1.5 font-mono text-slate-100 focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                  API Secret Key
                </label>
                <input
                  type="password"
                  value={config.apiSecret}
                  onChange={(e) => setConfig({ ...config, apiSecret: e.target.value })}
                  placeholder="••••••••••••••••••••••••"
                  className="w-full rounded border border-slate-800 bg-slate-900 px-3 py-1.5 font-mono text-slate-100 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Account Balance Reset Option */}
          <div className="border-t border-slate-800/80 pt-3 flex items-center justify-between">
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wider block">
                Reset Account Capital ($)
              </label>
              <input
                type="number"
                value={initialBal}
                onChange={(e) => setInitialBal(parseFloat(e.target.value) || 100000)}
                className="w-28 rounded border border-slate-800 bg-slate-900 px-2 py-1 font-mono text-slate-200 mt-1 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded border border-slate-700 bg-slate-800 px-3 py-1.5 font-mono text-[10px] font-semibold text-slate-300 hover:text-white transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset Capital &amp; Ledger</span>
            </button>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-800/80 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded bg-slate-800 hover:bg-slate-700 px-4 py-1.5 font-mono text-xs font-semibold text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded bg-cyan-600 hover:bg-cyan-500 px-4 py-1.5 font-mono text-xs font-bold text-slate-950 shadow-md transition-colors"
            >
              {savedSuccess ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
              <span>{savedSuccess ? 'Config Saved!' : 'Save Configuration'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
