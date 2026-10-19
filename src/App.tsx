import { useState, useEffect } from 'react';
import { PromptInput } from './components/PromptInput';
import { ComponentCard } from './components/ComponentCard';
import { StreamingCard } from './components/StreamingCard';
import { useComponentGenerator } from './hooks/useComponentGenerator';
import { useLocalStorage } from './hooks/useLocalStorage';
import { addToHistory } from './utils/promptHistory';
import type { Provider } from './types';
import './App.css';

const PROVIDER_CONFIG = {
  anthropic: { label: 'Anthropic', placeholder: 'sk-ant-...' },
  google: { label: 'Google', placeholder: 'AIza...' },
} as const;

const parseProvider = (raw: unknown): Provider => {
  if (typeof raw === 'string' && raw in PROVIDER_CONFIG) return raw as Provider;
  throw new Error('invalid provider');
};

const parseString = (raw: unknown): string => {
  if (typeof raw === 'string') return raw;
  throw new Error('invalid string');
};

const parseStringArray = (raw: unknown): string[] => {
  if (Array.isArray(raw) && raw.every((item) => typeof item === 'string')) return raw;
  throw new Error('invalid string array');
};

function App() {
  const [apiKey, setApiKey] = useLocalStorage('rcg:apiKey', '', parseString);
  const [showKey, setShowKey] = useState(false);
  const [provider, setProvider] = useLocalStorage<Provider>('rcg:provider', 'google', parseProvider);
  const [promptHistory, setPromptHistory] = useLocalStorage<string[]>(
    'rcg:promptHistory',
    [],
    parseStringArray,
  );
  const [envKeys, setEnvKeys] = useState<Record<Provider, boolean>>({
    anthropic: false,
    google: false,
  });
  const {
    components,
    isLoading,
    error,
    streamingCode,
    streamingPrompt,
    generate,
    removeComponent,
    clearAll,
  } = useComponentGenerator();

  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => setEnvKeys(data.envKeys))
      .catch(() => {});
  }, []);

  const hasEnvKey = envKeys[provider];

  const handleGenerate = (prompt: string) => {
    if (!apiKey.trim() && !hasEnvKey) {
      alert(`${PROVIDER_CONFIG[provider].label} API 키를 입력하거나 .env에 설정해주세요.`);
      return;
    }
    setPromptHistory((prev) => addToHistory(prev, prompt));
    generate(prompt, apiKey || undefined, provider);
  };

  const handleProviderChange = (newProvider: Provider) => {
    setProvider(newProvider);
    setApiKey('');
  };

  const activeProvider = PROVIDER_CONFIG[provider].label;

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand-mark" aria-hidden="true">RC</div>
        <div className="header-copy">
          <h1>React 컴포넌트 생성기</h1>
          <p>요청을 입력하면 컴포넌트를 만들어 바로 미리보고, 코드로 확인할 수 있어요.</p>
        </div>
      </header>

      <main className="workspace">
        <section className="window composer-panel" aria-label="컴포넌트 생성">
          <div className="titlebar">
            <h2>프롬프트</h2>
          </div>
          <div className="window-body">
            <PromptInput
              onGenerate={handleGenerate}
              isLoading={isLoading}
              history={promptHistory}
            />
          </div>
        </section>

        <aside className="window settings-panel" aria-label="실행 설정">
          <div className="titlebar">
            <h2>실행 설정</h2>
          </div>
          <div className="window-body">
            <div className="provider-select">
              <label htmlFor="provider">Provider</label>
              <select
                id="provider"
                value={provider}
                onChange={(e) => handleProviderChange(e.target.value as Provider)}
              >
                {Object.entries(PROVIDER_CONFIG).map(([key, { label }]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="api-key-input">
              <label htmlFor="api-key">API Key</label>
              <div className="api-key-field">
                <input
                  id="api-key"
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    hasEnvKey
                      ? '서버 키 사용 중 (직접 입력으로 덮어쓰기 가능)'
                      : PROVIDER_CONFIG[provider].placeholder
                  }
                />
                <button
                  className="btn-toggle-key"
                  onClick={() => setShowKey(!showKey)}
                  type="button"
                >
                  {showKey ? '숨기기' : '보기'}
                </button>
              </div>
              <p className={`key-status ${hasEnvKey ? 'key-status--ready' : ''}`}>
                {hasEnvKey ? '.env 키가 연결되어 있습니다.' : '직접 입력하거나 서버 환경변수를 설정하세요.'}
              </p>
            </div>
          </div>
        </aside>
      </main>

      {error && (
        <div className="error-banner" role="alert">
          <p>{error}</p>
        </div>
      )}

      <section className="results-section">
        {(components.length > 0 || isLoading) && (
          <div className="results-header">
            <h2>생성된 컴포넌트 {components.length}개</h2>
            <button className="btn-clear" onClick={clearAll}>
              전체 삭제
            </button>
          </div>
        )}

        {components.length === 0 && !isLoading && (
          <div className="window empty-state">
            <div className="titlebar">
              <h2>새 컴포넌트</h2>
            </div>
            <div className="window-body empty-body">
              <div className="empty-preview" aria-hidden="true">
                <div className="empty-canvas">
                  <div className="empty-card empty-card--primary" />
                  <div className="empty-card" />
                  <div className="empty-card empty-card--wide" />
                </div>
              </div>
              <div className="empty-copy">
                <p className="empty-title">아직 만든 컴포넌트가 없어요.</p>
                <p>위 프롬프트에 만들고 싶은 UI를 적거나, 예시를 골라 시작하세요.</p>
              </div>
            </div>
          </div>
        )}

        <div className="results-grid">
          {streamingCode !== null && (
            <StreamingCard prompt={streamingPrompt ?? ''} code={streamingCode} />
          )}
          {components.map((component) => (
            <ComponentCard
              key={component.id}
              component={component}
              onRemove={removeComponent}
              onRegenerate={handleGenerate}
              isLoading={isLoading}
            />
          ))}
        </div>
      </section>

      <footer className="statusbar" aria-label="현재 작업 상태">
        <span>Provider: {activeProvider}</span>
        <span>컴포넌트 {components.length}개</span>
        <span className={hasEnvKey ? 'statusbar-ok' : ''}>
          {hasEnvKey ? '서버 키 연결됨' : '서버 키 없음'}
        </span>
      </footer>
    </div>
  );
}

export default App;
