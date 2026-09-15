import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NoShowBadge } from './no-show-badge';

describe('NoShowBadge', () => {
  it('muestra el texto "¿Faltó?"', () => {
    render(<NoShowBadge onConfirm={() => {}} />);
    expect(screen.getByText(/¿Faltó\?/i)).toBeInTheDocument();
  });

  it('dispara onConfirm al hacer click', () => {
    const onConfirm = vi.fn();
    render(<NoShowBadge onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onConfirm).toHaveBeenCalled();
  });
});
