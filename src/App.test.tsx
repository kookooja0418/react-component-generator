import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

const encoder = new TextEncoder();
const line = (event: object) => encoder.encode(`${JSON.stringify(event)}\n`);

const stubFetch = () =>
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) =>
      Promise.resolve(
        url === '/api/config'
          ? { ok: true, json: async () => ({ envKeys: { anthropic: false, google: false } }) }
          : {
              ok: true,
              body: new ReadableStream<Uint8Array>({
                start(controller) {
                  controller.enqueue(line({ type: 'delta', text: 'render(<p/>)' }));
                  controller.enqueue(line({ type: 'done', code: 'render(<p/>)' }));
                  controller.close();
                },
              }),
            },
      ),
    ),
  );

// 스트림을 직접 제어해 생성 도중 상태를 관찰한다.
const stubOpenStream = () => {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({ start: (c) => { controller = c; } });
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) =>
      Promise.resolve(
        url === '/api/config'
          ? { ok: true, json: async () => ({ envKeys: { anthropic: false, google: false } }) }
          : { ok: true, body },
      ),
    ),
  );
  return {
    send: (event: object) => controller.enqueue(line(event)),
    close: () => controller.close(),
  };
};

describe('App 상태 저장', () => {
  beforeEach(() => {
    localStorage.clear();
    stubFetch();
  });

  it('저장된 Provider를 복원한다', () => {
    localStorage.setItem('rcg:provider', JSON.stringify('anthropic'));
    render(<App />);
    expect(screen.getByLabelText('Provider')).toHaveValue('anthropic');
  });

  it('알 수 없는 Provider 저장값은 무시하고 기본값 google을 쓴다', () => {
    localStorage.setItem('rcg:provider', JSON.stringify('openai'));
    render(<App />);
    expect(screen.getByLabelText('Provider')).toHaveValue('google');
  });

  it('저장된 API 키를 복원한다', () => {
    localStorage.setItem('rcg:apiKey', JSON.stringify('AIza-saved'));
    render(<App />);
    expect(screen.getByLabelText('API Key')).toHaveValue('AIza-saved');
  });

  it('API 키를 입력하면 저장한다', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText('API Key'), 'AIza-new');
    expect(JSON.parse(localStorage.getItem('rcg:apiKey') ?? '""')).toBe('AIza-new');
  });

  it('Provider를 바꾸면 저장된 Provider가 갱신되고 API 키는 비워진다', async () => {
    const user = userEvent.setup();
    localStorage.setItem('rcg:apiKey', JSON.stringify('AIza-saved'));
    render(<App />);
    await user.selectOptions(screen.getByLabelText('Provider'), 'anthropic');
    expect(JSON.parse(localStorage.getItem('rcg:provider') ?? '""')).toBe('anthropic');
    expect(JSON.parse(localStorage.getItem('rcg:apiKey') ?? 'null')).toBe('');
  });

  it('생성한 프롬프트를 히스토리에 저장하고 다시 불러온다', async () => {
    const user = userEvent.setup();
    localStorage.setItem('rcg:apiKey', JSON.stringify('AIza-saved'));
    const { unmount } = render(<App />);
    await user.type(screen.getByRole('textbox', { name: '만들고 싶은 컴포넌트' }), '프로필 카드');
    await user.click(screen.getByRole('button', { name: '컴포넌트 생성' }));
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem('rcg:promptHistory') ?? '[]')).toEqual(['프로필 카드']);
    });

    unmount();
    render(<App />);
    expect(screen.getByRole('button', { name: '프로필 카드' })).toBeInTheDocument();
  });
});

describe('App 스트리밍', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('rcg:apiKey', JSON.stringify('AIza-saved'));
  });

  const startGenerate = async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByRole('textbox', { name: '만들고 싶은 컴포넌트' }), '버튼');
    await user.click(screen.getByRole('button', { name: '컴포넌트 생성' }));
  };

  it('생성 중에는 코드 탭에서 받은 코드를 실시간으로 보여준다', async () => {
    const stream = stubOpenStream();
    await startGenerate();
    stream.send({ type: 'delta', text: 'const Btn = () => null;' });
    expect(await screen.findByText('const Btn = () => null;')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '코드' })).toHaveAttribute('aria-selected', 'true');
  });

  it('생성이 끝나면 미리보기 탭으로 전환된다', async () => {
    const stream = stubOpenStream();
    await startGenerate();
    stream.send({ type: 'delta', text: 'render(<p/>)' });
    stream.send({ type: 'done', code: 'render(<p/>)' });
    stream.close();
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: '미리보기' })).toHaveAttribute('aria-selected', 'true');
    });
    expect(screen.getByRole('tab', { name: '미리보기' })).toBeEnabled();
  });
});
