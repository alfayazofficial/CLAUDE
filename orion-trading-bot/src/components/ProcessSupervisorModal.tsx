import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Server,
  Activity,
  RotateCcw,
  CheckCircle2,
  Copy,
  Terminal,
  X,
  ShieldCheck,
} from 'lucide-react';

interface ProcessSupervisorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProcessSupervisorModal: React.FC<ProcessSupervisorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [uptimeSeconds, setUptimeSeconds] = useState(14820);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setUptimeSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const hours = Math.floor(uptimeSeconds / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = uptimeSeconds % 60;

  const ecosystemConfig = `module.exports = {
  apps: [{
    name: 'orion-trading-engine',
    script: 'dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    max_memory_restart: '1G',
    restart_delay: 4000,
    exp_backoff_restart_delay: 100,
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      MAX_DAILY_DRAWDOWN: '3.0',
      HEARTBEAT_TIMEOUT_MS: '10000'
    }
  }]
};`;

  const dockerfileSnippet = `FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]`;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-xl border border-slate-800 bg-[#090c12] p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-400">
              <Cpu className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-100 uppercase tracking-wider">
                Process Supervision &amp; High Availability
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                PM2 Cluster / Docker Container Supervisor Monitor
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

        {/* Live Supervisor Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="rounded border border-slate-800 bg-slate-900/50 p-2.5">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Daemon Status</div>
            <div className="flex items-center gap-1.5 font-mono font-bold text-emerald-400 mt-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
              <span>ONLINE (PID 4091)</span>
            </div>
          </div>

          <div className="rounded border border-slate-800 bg-slate-900/50 p-2.5">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Uptime</div>
            <div className="font-mono font-bold text-slate-200 mt-1">
              {hours}h {minutes}m {seconds}s
            </div>
          </div>

          <div className="rounded border border-slate-800 bg-slate-900/50 p-2.5">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Restart Policy</div>
            <div className="font-mono font-bold text-cyan-300 mt-1">
              unless-stopped
            </div>
          </div>

          <div className="rounded border border-slate-800 bg-slate-900/50 p-2.5">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Memory / CPU</div>
            <div className="font-mono font-bold text-indigo-300 mt-1">
              84.2 MB / 0.8%
            </div>
          </div>
        </div>

        {/* Production Configuration Snippets */}
        <div className="space-y-3">
          {/* PM2 Ecosystem */}
          <div className="rounded border border-slate-800 bg-slate-950 p-3">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-[10px] font-mono text-cyan-400 font-semibold uppercase tracking-wider">
                ecosystem.config.js (PM2 Supervisor Specification)
              </span>
              <button
                onClick={() => handleCopy(ecosystemConfig, 'pm2')}
                className="flex items-center gap-1 text-[10px] font-mono text-slate-400 hover:text-white"
              >
                {copied === 'pm2' ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copied === 'pm2' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="text-[10px] font-mono text-slate-300 overflow-x-auto max-h-28 bg-[#05070a] p-2 rounded border border-slate-900">
              {ecosystemConfig}
            </pre>
          </div>

          {/* Docker Containerfile */}
          <div className="rounded border border-slate-800 bg-slate-950 p-3">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-[10px] font-mono text-cyan-400 font-semibold uppercase tracking-wider">
                Dockerfile (Containerized Process Isolation)
              </span>
              <button
                onClick={() => handleCopy(dockerfileSnippet, 'docker')}
                className="flex items-center gap-1 text-[10px] font-mono text-slate-400 hover:text-white"
              >
                {copied === 'docker' ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copied === 'docker' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="text-[10px] font-mono text-slate-300 overflow-x-auto max-h-28 bg-[#05070a] p-2 rounded border border-slate-900">
              {dockerfileSnippet}
            </pre>
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="rounded bg-slate-800 hover:bg-slate-700 px-4 py-1.5 font-mono text-xs font-semibold text-slate-200 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
