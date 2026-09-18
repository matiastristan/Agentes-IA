'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function TypingIndicator() {
  return (
    <div className="flex gap-1 items-center px-3 py-2" aria-label="El agente está escribiendo">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-text-muted animate-pulse"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}

export default function TestChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;

    const userMessage: Message = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    setText('');
    setLoading(true);

    const res = await fetch('/api/negocio/test-chat', {
      method: 'POST',
      body: JSON.stringify({ text: userMessage.content }),
    });
    const data = await res.json();
    setLoading(false);

    setMessages((prev) => [...prev, { role: 'assistant', content: data.respuesta ?? 'Error' }]);
  }

  return (
    <main className="flex-1 bg-background p-6 md:p-8 flex flex-col">
      <h1 className="text-2xl font-semibold text-text-primary mb-1 animate-fade-slide-in">
        Probar tu agente
      </h1>
      <p className="text-sm text-text-secondary mb-6 animate-fade-slide-in">
        Es el mismo motor que responde por WhatsApp — acá probás sin gastar nada ni molestar a
        ningún cliente real.
      </p>

      <Card className="flex-1 mb-4 overflow-y-auto animate-fade-slide-in">
        <CardHeader>
          <CardTitle>Conversación de prueba</CardTitle>
        </CardHeader>
        <CardContent>
          {messages.length === 0 && !loading && (
            <p className="text-sm text-text-muted">
              Escribí algo como lo haría un cliente real — &quot;Hola, quiero reservar para
              mañana&quot;.
            </p>
          )}
          <div className="flex flex-col gap-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={m.role === 'user' ? 'text-right animate-fade-slide-in' : 'text-left animate-fade-slide-in'}
              >
                <span
                  className={
                    m.role === 'user'
                      ? 'inline-block bg-primary-tint text-primary rounded-lg px-3 py-2 text-sm'
                      : 'inline-block bg-bg-tint text-text-primary rounded-lg px-3 py-2 text-sm'
                  }
                >
                  {m.content}
                </span>
              </div>
            ))}
            {loading && (
              <div className="text-left">
                <span className="inline-block bg-bg-tint rounded-lg">
                  <TypingIndicator />
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escribí como si fueras un cliente..."
          />
        </div>
        <Button type="submit" disabled={loading}>
          Enviar
        </Button>
      </form>
    </main>
  );
}
