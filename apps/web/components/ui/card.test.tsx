import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Card, CardHeader, CardTitle, CardContent } from './card';

describe('Card', () => {
  it('renderiza children dentro de un contenedor con clase bg-card', () => {
    render(<Card>Contenido</Card>);
    expect(screen.getByText('Contenido')).toHaveClass('bg-card');
  });

  it('aplica className adicional sin perder las clases base', () => {
    render(<Card className="custom-class">Contenido</Card>);
    const card = screen.getByText('Contenido');
    expect(card).toHaveClass('bg-card');
    expect(card).toHaveClass('custom-class');
  });

  it('CardTitle usa el token de tamaño de título de card', () => {
    render(<CardTitle>Mi título</CardTitle>);
    expect(screen.getByText('Mi título')).toHaveClass('text-lg');
  });

  it('CardHeader y CardContent renderizan sus children', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Título</CardTitle>
        </CardHeader>
        <CardContent>Cuerpo</CardContent>
      </Card>
    );
    expect(screen.getByText('Título')).toBeInTheDocument();
    expect(screen.getByText('Cuerpo')).toBeInTheDocument();
  });
});
