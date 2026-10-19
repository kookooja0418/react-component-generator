import { useEffect, useRef } from 'react';

interface StreamingCardProps {
  prompt: string;
  code: string;
}

// 스트리밍 도중 화면에만 보이는 코드에서 마크다운 코드펜스 줄을 숨긴다. 최종 코드는 서버가 정리해 보낸다.
const hideFences = (code: string) => code.replace(/^```\w*\n?/gm, '').replace(/```$/gm, '');

export function StreamingCard({ prompt, code }: StreamingCardProps) {
  const codeRef = useRef<HTMLPreElement>(null);
  const visibleCode = hideFences(code);

  useEffect(() => {
    const el = codeRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [visibleCode]);

  return (
    <div className="window component-card streaming-card">
      <div className="titlebar">
        <h2>생성 중</h2>
      </div>
      <div className="card-header">
        <p className="card-prompt">{prompt}</p>
      </div>
      <div className="card-tabs" role="tablist">
        <button role="tab" aria-selected={false} className="tab" disabled>
          미리보기
        </button>
        <button role="tab" aria-selected={true} className="tab tab--active">
          코드
        </button>
      </div>
      <div className="card-content">
        <div className="code-panel">
          <div className="panel-header">
            <h3>코드 작성 중</h3>
          </div>
          <pre ref={codeRef} className="code-block streaming-code" role="status">
            <code>{visibleCode || '응답을 기다리는 중...'}</code>
            <span className="streaming-caret" aria-hidden="true" />
          </pre>
        </div>
      </div>
    </div>
  );
}
