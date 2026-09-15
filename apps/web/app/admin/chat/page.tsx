'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AdminChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;

    const userMessage: Message = { role: 'user', content: text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setText('');
    setLoading(true);

    const res = await fetch('/api/admin/chat', {
      method: 'POST',
      body: JSON.stringify({ text: userMessage.content, history: messages }),
    });
    const data = await res.json();
    setLoading(false);

    setMessages([...nextMessages, { role: 'assistant', content: data.responseText ?? 'Error' }]);
  }

  return (
    <main className="min-h-screen bg-background p-8 flex flex-col">
      <h1 className="text-2xl font-semibold text-text-primary mb-6">Tu agente</h1>

      <Card className="flex-1 mb-4 overflow-y-auto">
        <CardHeader>
          <CardTitle>Conversación</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={m.role === 'user' ? 'text-right' : 'text-left'}
              >
                <span
                  className={
                    m.role === 'user'
                      ? 'inline-block bg-primary-tint text-primary rounded-lg px-3 py-2 text-sm'
                      : 'inline-block bg-gray-50 text-text-primary rounded-lg px-3 py-2 text-sm'
                  }
                >
                  {m.content}
                </span>
              </div>
            ))}
            {loading && <p className="text-sm text-text-muted">Pensando...</p>}
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Preguntale algo a tu agente..."
          />
        </div>
        <Button type="submit" disabled={loading}>
          Enviar
        </Button>
      </form>
    </main>
  );
}
