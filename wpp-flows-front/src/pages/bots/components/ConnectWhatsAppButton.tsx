import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { botService } from '@/services/botService';
import { invalidateQueriesByFilters, queryKeys } from '@/lib/queryClient';
import { toast } from '@/stores/uiStore';

interface FbLoginResponse {
  authResponse?: { code?: string } | null;
  status?: string;
}

interface FacebookSdk {
  init: (params: Record<string, unknown>) => void;
  login: (
    cb: (response: FbLoginResponse) => void,
    options: Record<string, unknown>,
  ) => void;
}

declare global {
  interface Window {
    FB?: FacebookSdk;
    fbAsyncInit?: () => void;
  }
}

const SDK_SRC = 'https://connect.facebook.net/en_US/sdk.js';

function loadFacebookSdk(appId: string, graphVersion: string): Promise<FacebookSdk> {
  return new Promise((resolve, reject) => {
    if (window.FB) {
      resolve(window.FB);
      return;
    }
    window.fbAsyncInit = () => {
      window.FB?.init({
        appId,
        autoLogAppEvents: true,
        xfbml: false,
        version: graphVersion,
      });
      if (window.FB) resolve(window.FB);
      else reject(new Error('FB SDK failed to initialize'));
    };
    const existing = document.getElementById('facebook-jssdk');
    if (existing) return;
    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.src = SDK_SRC;
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    script.onerror = () => reject(new Error('Falha ao carregar o SDK do Facebook'));
    document.body.appendChild(script);
  });
}

export function ConnectWhatsAppButton() {
  const qc = useQueryClient();
  const [launching, setLaunching] = useState(false);
  const signupData = useRef<{ phoneNumberId?: string; wabaId?: string }>({});

  const configQ = useQuery({
    queryKey: ['bots', 'embedded-signup-config'],
    queryFn: () => botService.embeddedSignupConfig(),
    staleTime: 5 * 60 * 1000,
  });
  const notConfigured = configQ.data?.configured === false;

  const complete = useMutation({
    mutationFn: (payload: {
      code: string;
      wabaId: string;
      phoneNumberId: string;
    }) => botService.embeddedSignup(payload),
    onSuccess: (bot) => {
      void invalidateQueriesByFilters(qc, [{ queryKey: queryKeys.bots.all }]);
      toast.success('WhatsApp conectado', `${bot.name} está pronto para atender.`);
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Falha ao concluir a conexão.';
      toast.error('Não foi possível conectar', msg);
    },
  });

  const onMessage = useCallback((event: MessageEvent) => {
    if (!event.origin.endsWith('facebook.com')) return;
    try {
      const data =
        typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      if (data?.type !== 'WA_EMBEDDED_SIGNUP') return;
      if (data.event === 'FINISH' || data.event === 'FINISH_ONLY_WABA') {
        signupData.current = {
          phoneNumberId: data.data?.phone_number_id,
          wabaId: data.data?.waba_id,
        };
      }
    } catch {
      /* non-JSON postMessage — ignore */
    }
  }, []);

  // If the component unmounts mid-flow (route change with the popup open),
  // drop the listener so it doesn't leak across navigations.
  useEffect(
    () => () => window.removeEventListener('message', onMessage),
    [onMessage],
  );

  const launch = useCallback(async () => {
    const config = configQ.data;
    if (!config?.configured || !config.appId || !config.configId) {
      toast.error(
        'Embedded Signup não configurado',
        'Defina META_APP_ID e META_EMBEDDED_SIGNUP_CONFIG_ID no servidor.',
      );
      return;
    }
    setLaunching(true);
    signupData.current = {};
    window.addEventListener('message', onMessage);
    try {
      const fb = await loadFacebookSdk(config.appId, config.graphVersion);
      fb.login(
        (response) => {
          window.removeEventListener('message', onMessage);
          setLaunching(false);
          const code = response.authResponse?.code;
          const { phoneNumberId, wabaId } = signupData.current;
          if (!code || !phoneNumberId || !wabaId) {
            toast.info('Conexão cancelada', 'O fluxo do WhatsApp não foi concluído.');
            return;
          }
          complete.mutate({ code, wabaId, phoneNumberId });
        },
        {
          config_id: config.configId,
          response_type: 'code',
          override_default_response_type: true,
          extras: { setup: {}, featureType: '', sessionInfoVersion: '3' },
        },
      );
    } catch (err) {
      window.removeEventListener('message', onMessage);
      setLaunching(false);
      toast.error(
        'Falha ao abrir o WhatsApp',
        err instanceof Error ? err.message : undefined,
      );
    }
  }, [configQ.data, onMessage, complete]);

  return (
    <Button
      leftIcon={<MessageCircle />}
      onClick={() => void launch()}
      loading={launching || complete.isPending}
      disabled={configQ.isLoading || notConfigured}
      title={
        notConfigured
          ? 'Integração Meta não configurada no servidor (META_APP_ID / META_EMBEDDED_SIGNUP_CONFIG_ID).'
          : 'Conecta o número oficial do WhatsApp via Meta (Embedded Signup).'
      }
    >
      Conectar WhatsApp
    </Button>
  );
}
