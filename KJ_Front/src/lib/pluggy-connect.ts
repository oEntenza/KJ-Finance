const PLUGGY_CONNECT_SCRIPT_URL = 'https://cdn.pluggy.ai/pluggy-connect/latest/pluggy-connect.js';

type PluggyItemData = {
  item?: {
    id?: string;
    connector?: {
      name?: string;
    };
    status?: string;
  };
};

type PluggyConnectEventPayload = {
  event?: string;
  item?: {
    id?: string;
    status?: string;
  };
  connector?: {
    name?: string;
  };
  timestamp?: number;
};

type PluggyConnectConfig = {
  connectToken: string;
  includeSandbox?: boolean;
  language?: string;
  onSuccess?: (data: PluggyItemData) => void | Promise<void>;
  onError?: (error: unknown) => void | Promise<void>;
  onOpen?: () => void | Promise<void>;
  onClose?: () => void | Promise<void>;
  onEvent?: (payload: PluggyConnectEventPayload) => void | Promise<void>;
};

declare global {
  interface Window {
    PluggyConnect?: new (config: PluggyConnectConfig) => {
      init: () => Promise<void>;
      destroy?: () => Promise<void>;
    };
  }
}

let pluggyScriptPromise: Promise<void> | null = null;

export function loadPluggyConnectScript() {
  if (window.PluggyConnect) {
    return Promise.resolve();
  }

  if (pluggyScriptPromise) {
    return pluggyScriptPromise;
  }

  pluggyScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${PLUGGY_CONNECT_SCRIPT_URL}"]`);

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Falha ao carregar o SDK do Pluggy Connect.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = PLUGGY_CONNECT_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Falha ao carregar o SDK do Pluggy Connect.'));
    document.head.appendChild(script);
  });

  return pluggyScriptPromise;
}

export async function openPluggyConnect(config: PluggyConnectConfig) {
  await loadPluggyConnectScript();

  if (!window.PluggyConnect) {
    throw new Error('SDK do Pluggy Connect não foi disponibilizado na janela.');
  }

  const instance = new window.PluggyConnect(config);
  await instance.init();
  return instance;
}
