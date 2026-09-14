import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Toggle } from './toggle';

describe('Toggle', () => {
  it('renderiza con role switch y aria-checked según checked', () => {
    render(<Toggle checked={true} onCheckedChange={() => {}} label="Abierto" />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('aria-checked es false cuando checked=false', () => {
    render(<Toggle checked={false} onCheckedChange={() => {}} label="Abierto" />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });

  it('llama a onCheckedChange con el valor invertido al hacer click', () => {
    const onCheckedChange = vi.fn();
    render(<Toggle checked={false} onCheckedChange={onCheckedChange} label="Abierto" />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('no dispara onCheckedChange cuando disabled=true', () => {
    const onCheckedChange = vi.fn();
    render(<Toggle checked={false} onCheckedChange={onCheckedChange} label="Abierto" disabled />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it('asocia el label de forma accesible', () => {
    render(<Toggle checked={true} onCheckedChange={() => {}} label="Abierto lunes" />);
    expect(screen.getByLabelText('Abierto lunes')).toBeInTheDocument();
  });
});
