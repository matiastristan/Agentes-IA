import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Input } from './input';

describe('Input', () => {
  it('renderiza un input de texto que acepta value', () => {
    render(<Input placeholder="Nombre del negocio" onChange={() => {}} value="" />);
    expect(screen.getByPlaceholderText('Nombre del negocio')).toBeInTheDocument();
  });

  it('aplica el borde de error y muestra el mensaje cuando error está presente', () => {
    render(<Input error="Este campo es obligatorio" />);
    expect(screen.getByText('Este campo es obligatorio')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveClass('border-error');
  });

  it('no muestra mensaje de error cuando no se pasa error', () => {
    render(<Input />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('deshabilita el input cuando disabled=true', () => {
    render(<Input disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('asocia el label vía htmlFor/id cuando se pasa label', () => {
    render(<Input label="Nombre" id="nombre-negocio" />);
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
  });
});
