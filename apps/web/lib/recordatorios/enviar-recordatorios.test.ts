import { describe, it, expect, vi } from 'vitest';
import { enviarRecordatorios, textoRecordatorio } from './enviar-recordatorios';

const REC = {
  citaId: 'a', telefono: '5493871111111', nombre: 'Josue',
  cancha: 'Cancha Padel 2', fecha: '2026-09-22', horaInicio: '19:00', horaFin: '21:00',
};

function makeDeps(o: Record<string, unknown> = {}) {
  return {
    enviarPlantilla: vi.fn().mockResolvedValue({ success: true, wamid: 'w1' }),
    enviarTexto: vi.fn().mockResolvedValue({ success: true, wamid: 'w2' }),
    ventanaAbierta: vi.fn().mockResolvedValue(false),
    registrar: vi.fn().mockResolvedValue(true),
    ...o,
  };
}

describe('textoRecordatorio', () => {
  it('incluye nombre, cancha, día con fecha y rango horario', () => {
    const t = textoRecordatorio(REC);
    expect(t).toContain('Josue');
    expect(t).toContain('Cancha Padel 2');
    expect(t).toContain('martes 22/09');
    expect(t).toContain('19:00');
    expect(t).toContain('21:00');
  });
});

describe('enviarRecordatorios', () => {
  it('con plantilla configurada, envía por plantilla (funciona fuera de las 24h)', async () => {
    const deps = makeDeps();
    const r = await enviarRecordatorios([REC], { plantilla: 'recordatorio_turno', idioma: 'es_AR' }, deps);

    expect(deps.enviarPlantilla).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '5493871111111',
        plantilla: 'recordatorio_turno',
        idioma: 'es_AR',
        parametros: ['Josue', 'Cancha Padel 2', 'martes 22/09', '19:00 a 21:00'],
      })
    );
    expect(deps.enviarTexto).not.toHaveBeenCalled();
    expect(r).toMatchObject({ enviados: 1, fallidos: 0, omitidos: 0 });
  });

  it('sin plantilla pero con la conversación abierta, manda texto libre', async () => {
    const deps = makeDeps({ ventanaAbierta: vi.fn().mockResolvedValue(true) });
    const r = await enviarRecordatorios([REC], { plantilla: null, idioma: 'es_AR' }, deps);

    expect(deps.enviarTexto).toHaveBeenCalledWith(
      expect.objectContaining({ to: '5493871111111', text: expect.stringContaining('Josue') })
    );
    expect(r.enviados).toBe(1);
  });

  it('sin plantilla y fuera de las 24h no intenta enviar (Meta lo rechazaría) y lo registra', async () => {
    const deps = makeDeps();
    const r = await enviarRecordatorios([REC], { plantilla: null, idioma: 'es_AR' }, deps);

    expect(deps.enviarTexto).not.toHaveBeenCalled();
    expect(deps.enviarPlantilla).not.toHaveBeenCalled();
    expect(r.omitidos).toBe(1);
    expect(deps.registrar).toHaveBeenCalledWith(expect.objectContaining({ status: 'fallido' }));
  });

  it('si un envío falla, registra el error y sigue con los demás', async () => {
    const deps = makeDeps({
      enviarPlantilla: vi.fn()
        .mockResolvedValueOnce({ success: false, error: 'Meta respondió 400' })
        .mockResolvedValueOnce({ success: true, wamid: 'w9' }),
    });
    const otro = { ...REC, citaId: 'b', telefono: '549387222' };
    const r = await enviarRecordatorios([REC, otro], { plantilla: 'p', idioma: 'es_AR' }, deps);

    expect(r).toMatchObject({ enviados: 1, fallidos: 1 });
    expect(deps.registrar).toHaveBeenCalledWith(expect.objectContaining({ status: 'fallido', error: 'Meta respondió 400' }));
  });

  it('si una excepción rompe un envío, no corta el resto de los recordatorios', async () => {
    const deps = makeDeps({
      enviarPlantilla: vi.fn().mockRejectedValueOnce(new Error('red')).mockResolvedValueOnce({ success: true }),
    });
    const r = await enviarRecordatorios([REC, { ...REC, citaId: 'b' }], { plantilla: 'p', idioma: 'es_AR' }, deps);
    expect(r).toMatchObject({ enviados: 1, fallidos: 1 });
  });

  it('si el registro dice que ya se había enviado, no lo cuenta como enviado de nuevo', async () => {
    const deps = makeDeps({ registrar: vi.fn().mockResolvedValue(false) });
    const r = await enviarRecordatorios([REC], { plantilla: 'p', idioma: 'es_AR' }, deps);
    expect(r).toMatchObject({ enviados: 0, duplicados: 1 });
  });

  it('registra a qué turno o mensualizado corresponde cada envío', async () => {
    const deps = makeDeps();
    await enviarRecordatorios(
      [{ ...REC, citaId: undefined, abonoId: 'ab1' }],
      { plantilla: 'p', idioma: 'es_AR' },
      deps
    );
    expect(deps.registrar).toHaveBeenCalledWith(expect.objectContaining({ abonoId: 'ab1', canal: 'plantilla' }));
  });
});
