import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PromptInput } from './PromptInput';

describe('PromptInput', () => {
  it('프롬프트가 비어 있으면 생성 버튼이 비활성이다', () => {
    render(<PromptInput onGenerate={vi.fn()} isLoading={false} />);
    expect(screen.getByRole('button', { name: '컴포넌트 생성' })).toBeDisabled();
  });

  it('입력하면 버튼이 활성화되고 클릭 시 입력값으로 onGenerate가 호출된다', async () => {
    const onGenerate = vi.fn();
    const user = userEvent.setup();
    render(<PromptInput onGenerate={onGenerate} isLoading={false} />);

    await user.type(screen.getByRole('textbox'), '프로필 카드');
    const submit = screen.getByRole('button', { name: '컴포넌트 생성' });
    expect(submit).toBeEnabled();

    await user.click(submit);
    expect(onGenerate).toHaveBeenCalledWith('프로필 카드');
  });

  it('로딩 중에는 생성 버튼이 비활성이고 "생성 중..." 을 보여준다', () => {
    render(<PromptInput onGenerate={vi.fn()} isLoading={true} />);
    expect(screen.getByRole('button', { name: '생성 중...' })).toBeDisabled();
  });

  describe('길이 제한', () => {
    const typeLong = (length: number) =>
      fireEvent.change(screen.getByRole('textbox'), { target: { value: '가'.repeat(length) } });

    it('입력한 글자 수를 최대 길이와 함께 보여준다', () => {
      render(<PromptInput onGenerate={vi.fn()} isLoading={false} />);
      typeLong(12);
      expect(screen.getByText('12 / 500')).toBeInTheDocument();
    });

    it('500자 이하면 에러 메시지를 보여주지 않는다', () => {
      render(<PromptInput onGenerate={vi.fn()} isLoading={false} />);
      typeLong(500);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('500자를 넘으면 에러 메시지를 보여준다', () => {
      render(<PromptInput onGenerate={vi.fn()} isLoading={false} />);
      typeLong(503);
      expect(screen.getByRole('alert')).toHaveTextContent(
        '프롬프트는 500자까지 입력할 수 있어요. 3자를 줄여주세요.',
      );
    });

    it('500자를 넘으면 생성 버튼이 비활성이다', () => {
      render(<PromptInput onGenerate={vi.fn()} isLoading={false} />);
      typeLong(501);
      expect(screen.getByRole('button', { name: '컴포넌트 생성' })).toBeDisabled();
    });

    it('500자를 넘으면 Ctrl+Enter로도 생성되지 않는다', () => {
      const onGenerate = vi.fn();
      render(<PromptInput onGenerate={onGenerate} isLoading={false} />);
      typeLong(501);
      fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', ctrlKey: true });
      expect(onGenerate).not.toHaveBeenCalled();
    });

    it('글자 수를 줄여 500자 이하가 되면 다시 생성할 수 있다', () => {
      const onGenerate = vi.fn();
      render(<PromptInput onGenerate={onGenerate} isLoading={false} />);
      typeLong(501);
      typeLong(500);
      fireEvent.click(screen.getByRole('button', { name: '컴포넌트 생성' }));
      expect(onGenerate).toHaveBeenCalledWith('가'.repeat(500));
    });
  });
});
