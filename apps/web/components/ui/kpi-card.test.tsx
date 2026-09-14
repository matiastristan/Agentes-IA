import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { KPICard } from './kpi-card';

describe('KPICard', () => {
  it('muestra el label y el valor', () => {
    render(<KPICard label="Mensajes hoy" value={142} />);
    expect(screen.getByText('Mensajes hoy')).toBeInTheDocument();
    expect(screen.getByText('142')).toBeInTheDocument();
  });

  it('muestra la tendencia positiva en verde con flecha hacia arriba', () => {
    render(<KPICard label="Mensajes hoy" value={142} trend={12} />);
    const trend = screen.getByText('↑ 12%');
    expect(trend).toHaveClass('text-success');
  });

  it('muestra la tendencia negativa en rojo con flecha hacia abajo', () => {
    render(<KPICard label="Conversiones" value={8} trend={-5} />);
    const trend = screen.getByText('↓ 5%');
    expect(trend).toHaveClass('text-error');
  });

  it('no muestra tendencia cuando no se pasa trend', () => {
    render(<KPICard label="Clientes nuevos" value={12} />);
    expect(screen.queryByText(/↑|↓/)).not.toBeInTheDocument();
  });
});
