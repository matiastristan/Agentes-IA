'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

// NOTA: este componente requiere que la App de Meta tenga el producto
// "Embedded Signup" habilitado (Facebook Login for Business + App Review
// aprobado). Sin eso, FB.login con este config_id no funciona en producción
// — ver docs/superpowers/runbooks/meta-whatsapp-setup.md, Parte B.
//
// Variables de entorno necesarias (públicas, van al bundle del cliente):
//   NEXT_PUBLIC_META_APP_ID
//   NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID

declare global {
  interface Window {
    FB?: {
      init: (params: Record<string, unknown>) => void;
      login: (
        callback: (response: { authResponse?: { code?: string } }) => void,
        params: Record<string, unknown>
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

function loadFacebookSdk(): Promise<void> {
  return new Promise((resolve) => {
    if (window.FB) {
      resolve();
      return;
    }

    window.fbAsyncInit = () => {
      window.FB!.init({
        appId: process.env.NEXT_PUBLIC_META_APP_ID,
        autoLogAppEvents: true,
        xfbml: false,
        version: 'v21.0',
      });
      resolve();
    };

    const script = document.createElement('script');
    script.src = 'https://connect.facebook.net/es_LA/sdk.js';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  });
}

export function ConectarWhatsAppButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignupMessage = useCallback(
    (event: MessageEvent) => {
      if (!event.origin.endsWith('facebook.com')) return;

      try {
        const data = JSON.parse(event.data);
        if (data.type !== 'WA_EMBEDDED_SIGNUP') return;

        if (data.event === 'FINISH') {
          const { phone_number_id: phoneNumberId } = data.data;
          window.sessionStorage.setItem('embedded_signup_phone_number_id', phoneNumberId);
        }
      } catch {
        // mensajes de otros orígenes/formatos, no son del Embedded Signup
      }
    },
    []
  );

  useEffect(() => {
    window.addEventListener('message', handleSignupMessage);
    return () => window.removeEventListener('message', handleSignupMessage);
  }, [handleSignupMessage]);

  async function handleClick() {
    setLoading(true);
    setError(null);

    await loadFacebookSdk();

    window.FB!.login(
      async (response) => {
        const code = response.authResponse?.code;
        const phoneNumberId = window.sessionStorage.getItem('embedded_signup_phone_number_id');

        if (!code || !phoneNumberId) {
          setError('No se completó la conexión con WhatsApp.');
          setLoading(false);
          return;
        }

        const res = await fetch('/api/negocio/meta/conectar', {
          method: 'POST',
          body: JSON.stringify({ code, phoneNumberId }),
        });

        setLoading(false);

        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? 'No se pudo completar la conexión.');
          return;
        }

        router.refresh();
      },
      {
        config_id: process.env.NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID,
        response_type: 'code',
        override_default_response_type: true,
      }
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handleClick} disabled={loading}>
        {loading ? 'Conectando...' : 'Conectar WhatsApp'}
      </Button>
      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
