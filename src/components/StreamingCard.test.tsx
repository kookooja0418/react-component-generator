import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StreamingCard } from './StreamingCard';

describe('StreamingCard', () => {
  it('요청한 프롬프트를 보여준다', () => {
    render(<StreamingCard prompt="로그인 폼" code="" />);
    expect(screen.getByText('로그인 폼')).toBeInTheDocument();
  });

  it('코드 탭이 선택된 상태다', () => {
    render(<StreamingCard prompt="버튼" code="" />);
    expect(screen.getByRole('tab', { name: '코드' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: '미리보기' })).toHaveAttribute('aria-selected', 'false');
  });

  it('생성이 끝나기 전에는 미리보기 탭을 누를 수 없다', () => {
    render(<StreamingCard prompt="버튼" code="" />);
    expect(screen.getByRole('tab', { name: '미리보기' })).toBeDisabled();
  });

  it('받은 코드를 실시간으로 보여준다', () => {
    render(<StreamingCard prompt="버튼" code="const Button = () => null;" />);
    expect(screen.getByText('const Button = () => null;')).toBeInTheDocument();
  });

  it('아직 받은 코드가 없으면 대기 문구를 보여준다', () => {
    render(<StreamingCard prompt="버튼" code="" />);
    expect(screen.getByText('응답을 기다리는 중...')).toBeInTheDocument();
  });

  it('응답에 섞인 코드펜스는 화면에서 숨긴다', () => {
    render(<StreamingCard prompt="버튼" code={'```jsx\nconst A = 1;'} />);
    expect(screen.getByRole('status')).toHaveTextContent('const A = 1;');
    expect(screen.getByRole('status')).not.toHaveTextContent('```');
  });
});
