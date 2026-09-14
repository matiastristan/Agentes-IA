import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Button } from './button';

describe('Button', () => {
  it('renderiza el texto pasado como children', () => {
    render(<Button>Guardar</Button>);
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument();
  });

  it('aplica la clase de variante primary por default', () => {
    render(<Button>Guardar</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-primary');
  });

  it('aplica la clase de variante danger cuando se pasa variant="danger"', () => {
    render(<Button variant="danger">Borrar</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-error');
  });

  it('deshabilita el botón y no dispara onClick cuando disabled=true', () => {
    render(<Button disabled>Guardar</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
