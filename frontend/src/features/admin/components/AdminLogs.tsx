import { useState, useEffect, useCallback, useRef } from 'react';
import Button from '@shared/components/Button';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import ErrorMessage from '@shared/components/ErrorMessage';
import { HiRefresh } from 'react-icons/hi';
import { adminApi } from '@lib/api-client';
import type { AdminLogEntry, AdminLogsResponse } from '@shared/types/api';
import pageLayout from '@shared/styles/page-layout.module.css';
import styles from './AdminLogs.module.css';

const LOG_LEVELS = ['info', 'warn', 'error', 'debug'] as const;
const LOG_FETCH_LIMIT = 500;
const AUTO_REFRESH_INTERVAL_MS = 4000;

function formatTags(entry: AdminLogEntry): string[] {
  const tags: string[] = [];
  if (entry.request) {
    tags.push(`${entry.request.method} ${entry.request.path}`);
  }
  return tags;
}

export default function AdminLogs() {
  const [data, setData] = useState<AdminLogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [levels, setLevels] = useState<('info' | 'debug' | 'warn' | 'error')[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLogs = useCallback(() => {
    setLoading(true);
    setError(null);
    adminApi
      .getLogs({
        level: levels.length > 0 ? levels : undefined,
        limit: LOG_FETCH_LIMIT,
        offset: 0,
      })
      .then((res) => setData(res.data))
      .catch(() => setError('Failed to load logs'))
      .finally(() => setLoading(false));
  }, [levels]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!autoRefresh) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = setInterval(fetchLogs, AUTO_REFRESH_INTERVAL_MS);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefresh, fetchLogs]);

  const toggleLevel = (level: (typeof LOG_LEVELS)[number]) => {
    setLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    );
  };

  const levelBtnClass = (level: string) => {
    switch (level) {
      case 'ERROR': return styles.levelError;
      case 'WARN': return styles.levelWarn;
      case 'INFO': return styles.levelInfo;
      case 'DEBUG': return styles.levelDebug;
      default: return '';
    }
  };

  const entryLevelClass = (level: string) => {
    switch (level) {
      case 'ERROR': return styles.logLevelError;
      case 'WARN': return styles.logLevelWarn;
      case 'INFO': return styles.logLevelInfo;
      case 'DEBUG': return styles.logLevelDebug;
      default: return '';
    }
  };

  const bracketLevelClass = (level: string) => {
    switch (level) {
      case 'ERROR': return styles.levelError;
      case 'WARN': return styles.levelWarn;
      case 'INFO': return styles.levelInfo;
      case 'DEBUG': return styles.levelDebug;
      default: return '';
    }
  };

  if (error) return <ErrorMessage message={error} />;

  return (
    <div className={pageLayout.settingsLayout}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <h2 className={styles.title}>Application Logs</h2>
          <div className={styles.controls}>
            <div className={styles.levelButtons}>
              {LOG_LEVELS.map((l) => (
                <button
                  key={l}
                  type="button"
                  className={`${styles.levelBtn} ${levelBtnClass(l.toUpperCase())} ${levels.includes(l) ? styles.active : ''}`}
                  onClick={() => toggleLevel(l)}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <div className={styles.refreshControls}>
              <Button
                variant="secondary"
                className={styles.autoRefreshBtn}
                onClick={() => setAutoRefresh((v) => !v)}
              >
                <HiRefresh className={styles.refreshIcon} aria-hidden />
                Auto Refresh {autoRefresh ? 'On' : 'Off'}
              </Button>
              <Button
                variant="secondary"
                onClick={fetchLogs}
                disabled={loading}
              >
                <HiRefresh className={styles.refreshIcon} aria-hidden />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        <p className={styles.hint}>
          API requests are logged at INFO level. Rebuild the app image if you only see errors.
        </p>
        {loading && !data ? (
          <LoadingSpinner message="Loading logs..." />
        ) : (
          <>
            <div className={styles.meta}>
              {data?.total ?? 0} log entries
            </div>
            <div className={`${styles.list} ${styles.listDark}`}>
              {(data?.entries ?? []).map((entry: AdminLogEntry, i: number) => {
                const id = `${entry.timestamp}-${i}`;
                const isExpanded = expandedId === id;
                const hasDetails = !!(entry.error || entry.request);
                const tags = formatTags(entry);
                return (
                  <div
                    key={id}
                    className={`${styles.logRow} ${entryLevelClass(entry.level)} ${hasDetails ? styles.logRowExpandable : ''}`}
                  >
                    <div
                      className={styles.logRowMain}
                      onClick={() => hasDetails && setExpandedId(isExpanded ? null : id)}
                      role={hasDetails ? 'button' : undefined}
                      tabIndex={hasDetails ? 0 : undefined}
                      onKeyDown={(e) => {
                        if (hasDetails && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault();
                          setExpandedId(isExpanded ? null : id);
                        }
                      }}
                    >
                      <span className={styles.logChevron}>
                        {hasDetails ? (isExpanded ? '▼' : '>') : ''}
                      </span>
                      <span className={styles.logTime}>{entry.timestamp}</span>
                      <span className={`${styles.logLevelBracket} ${bracketLevelClass(entry.level)}`}>
                        [{entry.level}]
                      </span>
                      {tags.length > 0 && (
                        tags.map((tag, ti) => (
                          <span key={ti} className={styles.logTag}>[{tag}]</span>
                        ))
                      )}
                      <span className={styles.logMessage}>{entry.message}</span>
                      {hasDetails && (
                        <span className={styles.logExpandHint}>(click to expand)</span>
                      )}
                    </div>
                    {isExpanded && hasDetails && (
                      <div className={styles.logRowDetails}>
                        {entry.error && (
                          <pre className={styles.logError}>{entry.error.message}</pre>
                        )}
                        {entry.request && (
                          <div className={styles.logRequest}>
                            {entry.request.method} {entry.request.path}
                            {entry.request.ip && ` · ${entry.request.ip}`}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
