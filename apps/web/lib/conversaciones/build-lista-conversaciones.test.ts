import { describe, it, expect } from 'vitest';
import { buildListaConversaciones, filtrarConversaciones } from './build-lista-conversaciones';

const CONVS = [
  { id: 'c1', phone_from: '5493876289131', customer_name: null, temperatura: 'caliente', bot_desactivado: false, created_at: '2026-09-20T10:00:00Z' },
  { id: 'c2', phone_from: '5493871111111', customer_name: 'Ana Pérez', temperatura: null, bot_desactivado: true, created_at: '2026-09-19T10:00:00Z' },
  { id: 'c3', phone_from: '5493872222222', customer_name: null, temperatura: 'frio', bot_desactivado: false, created_at: '2026-09-18T10:00:00Z' },
];
const MENSAJES = [
  { conversation_id: 'c1', role: 'user', content: 'Hola, hay turno?', created_at: '2026-09-21T10:00:00Z' },
  { conversation_id: 'c1', role: 'assistant', content: 'Sí, tengo a las 19', created_at: '2026-09-21T10:00:05Z' },
  { conversation_id: 'c2', role: 'user', content: 'Gracias', created_at: '2026-09-21T12:00:00Z' },
];

describe('buildListaConversaciones', () => {
  const lista = buildListaConversaciones({
    conversaciones: CONVS,
    mensajes: MENSAJES,
    nombresPorTelefono: { '5493876289131': 'Josue' },
    telefonosBloqueados: ['5493872222222'],
  });

  it('ordena por el mensaje más reciente primero', () => {
    expect(lista.map((c) => c.id)).toEqual(['c2', 'c1', 'c3']);
  });

  it('muestra el último mensaje de cada conversación y quién lo mandó', () => {
    const c1 = lista.find((c) => c.id === 'c1')!;
    expect(c1.ultimoMensaje).toEqual({ texto: 'Sí, tengo a las 19', deCliente: false, fecha: '2026-09-21T10:00:05Z' });
  });

  it('una conversación sin mensajes queda al final y sin último mensaje', () => {
    const c3 = lista.find((c) => c.id === 'c3')!;
    expect(c3.ultimoMensaje).toBeNull();
    expect(lista[lista.length - 1].id).toBe('c3');
  });

  it('usa el nombre de la conversación; si no hay, el de sus turnos; si no, el teléfono', () => {
    expect(lista.find((c) => c.id === 'c2')!.nombre).toBe('Ana Pérez');
    expect(lista.find((c) => c.id === 'c1')!.nombre).toBe('Josue');
    expect(lista.find((c) => c.id === 'c3')!.nombre).toBeNull();
  });

  it('marca bot activo/pausado y bloqueado', () => {
    expect(lista.find((c) => c.id === 'c2')!.botActivo).toBe(false);
    expect(lista.find((c) => c.id === 'c3')!.bloqueado).toBe(true);
    expect(lista.find((c) => c.id === 'c1')!.bloqueado).toBe(false);
  });

  it('recorta mensajes largos para la vista previa', () => {
    const l = buildListaConversaciones({
      conversaciones: [CONVS[0]],
      mensajes: [{ conversation_id: 'c1', role: 'user', content: 'x'.repeat(200), created_at: '2026-09-21T10:00:00Z' }],
      nombresPorTelefono: {},
      telefonosBloqueados: [],
    });
    expect(l[0].ultimoMensaje!.texto.length).toBeLessThanOrEqual(81);
    expect(l[0].ultimoMensaje!.texto.endsWith('…')).toBe(true);
  });
});

describe('filtrarConversaciones', () => {
  const lista = buildListaConversaciones({
    conversaciones: CONVS, mensajes: MENSAJES,
    nombresPorTelefono: { '5493876289131': 'Josue' }, telefonosBloqueados: [],
  });

  it('sin búsqueda devuelve todas', () => {
    expect(filtrarConversaciones(lista, '  ')).toHaveLength(3);
  });

  it('busca por nombre sin distinguir mayúsculas ni acentos', () => {
    expect(filtrarConversaciones(lista, 'perez').map((c) => c.id)).toEqual(['c2']);
  });

  it('busca por teléfono ignorando espacios, guiones y el +', () => {
    expect(filtrarConversaciones(lista, '+54 9 387 628-9131').map((c) => c.id)).toEqual(['c1']);
  });

  it('busca por parte del teléfono', () => {
    expect(filtrarConversaciones(lista, '2222').map((c) => c.id)).toEqual(['c3']);
  });
});
