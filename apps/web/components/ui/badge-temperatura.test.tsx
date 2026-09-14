import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BadgeTemperatura } from './badge-temperatura';

describe('BadgeTemperatura', () => {
  it('muestra el texto CALIENTE con clase de color correspondiente', () => {
    render(<BadgeTemperatura value="caliente" />);
    const badge = screen.getByText('Caliente');
    expect(badge).toHaveClass('text-temp-caliente');
  });

  it('muestra el texto FRÍO con clase de color correspondiente', () => {
    render(<BadgeTemperatura value="frio" />);
    expect(screen.getByText('Frío')).toHaveClass('text-temp-frio');
  });

  it('muestra un indicador cuando fue editado manualmente', () => {
    render(<BadgeTemperatura value="moderado" editadoManualmente />);
    expect(screen.getByLabelText('Editado manualmente')).toBeInTheDocument();
  });

  it('no muestra el indicador cuando es categorización automática', () => {
    render(<BadgeTemperatura value="moderado" />);
    expect(screen.queryByLabelText('Editado manualmente')).not.toBeInTheDocument();
  });
});
