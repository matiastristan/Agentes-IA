import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TurnoCard } from './turno-card';

describe('TurnoCard', () => {
  it('estado disponible: fondo neutro, sin datos de cliente', () => {
    render(<TurnoCard estado="disponible" hora="14:00" />);
    expect(screen.getByText('14:00')).toBeInTheDocument();
    expect(screen.getByText(/disponible/i)).toBeInTheDocument();
  });

  it('estado ocupado muestra el nombre del cliente y usa fondo primary-tint', () => {
    render(<TurnoCard estado="ocupado" hora="15:00" clienteNombre="Juan Pérez" />);
    const card = screen.getByTestId('turno-card');
    expect(card).toHaveClass('bg-primary-tint');
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
  });

  it('estado no_show usa fondo de error y muestra badge', () => {
    render(<TurnoCard estado="no_show" hora="10:00" clienteNombre="Ana" />);
    const card = screen.getByTestId('turno-card');
    expect(card).toHaveClass('bg-error-bg');
    expect(screen.getByText(/no show/i)).toBeInTheDocument();
  });

  it('estado reprogramada usa fondo de warning', () => {
    render(<TurnoCard estado="reprogramada" hora="11:00" clienteNombre="Luis" />);
    expect(screen.getByTestId('turno-card')).toHaveClass('bg-warning-bg');
  });
});
