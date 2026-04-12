import React, { createContext, useContext, useMemo, useState } from 'react';

type AlertOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
};

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
};

type PromptOptions = {
  title?: string;
  message: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  inputType?: 'text' | 'password';
};

type DialogContextValue = {
  alert: (options: AlertOptions) => Promise<void>;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
};

type DialogState =
  | null
  | ({ kind: 'alert'; resolve: () => void } & AlertOptions)
  | ({ kind: 'confirm'; resolve: (value: boolean) => void } & ConfirmOptions)
  | ({ kind: 'prompt'; resolve: (value: string | null) => void } & PromptOptions);

const DialogContext = createContext<DialogContextValue | null>(null);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<DialogState>(null);
  const [inputValue, setInputValue] = useState('');
  const [inputName, setInputName] = useState('dialog-input');

  const value = useMemo<DialogContextValue>(
    () => ({
      alert: (options) =>
        new Promise<void>((resolve) => {
          setDialog({ kind: 'alert', resolve, confirmLabel: 'Fechar', ...options });
        }),
      confirm: (options) =>
        new Promise<boolean>((resolve) => {
          setDialog({
            kind: 'confirm',
            resolve,
            confirmLabel: 'Confirmar',
            cancelLabel: 'Cancelar',
            tone: 'default',
            ...options,
          });
        }),
      prompt: (options) =>
        new Promise<string | null>((resolve) => {
          setInputValue('');
          setInputName(`dialog-input-${Date.now()}`);
          setDialog({
            kind: 'prompt',
            resolve,
            confirmLabel: 'Confirmar',
            cancelLabel: 'Cancelar',
            inputType: 'text',
            ...options,
          });
        }),
    }),
    [],
  );

  function close() {
    setDialog(null);
    setInputValue('');
  }

  function handleCancel() {
    if (!dialog) return;

    if (dialog.kind === 'confirm') dialog.resolve(false);
    if (dialog.kind === 'prompt') dialog.resolve(null);
    if (dialog.kind === 'alert') dialog.resolve();
    close();
  }

  function handleConfirm() {
    if (!dialog) return;

    if (dialog.kind === 'alert') dialog.resolve();
    if (dialog.kind === 'confirm') dialog.resolve(true);
    if (dialog.kind === 'prompt') dialog.resolve(inputValue);
    close();
  }

  return (
    <DialogContext.Provider value={value}>
      {children}

      {dialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-transparent bg-[var(--color-surface)] shadow-2xl overflow-hidden modal-gold-border gold-border-relative">
            <div className="h-1 w-full bg-gradient-to-r from-transparent via-[var(--color-accent)]/40 to-transparent" />
            <div className="p-8">
              <h2 className="text-xl font-bold text-white tracking-tight">
                {dialog.title || 'K&J Finance'}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-400">{dialog.message}</p>

              {dialog.kind === 'prompt' && (
                <input
                  autoFocus
                  type={dialog.inputType}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={dialog.placeholder}
                  autoComplete={dialog.inputType === 'password' ? 'new-password' : 'off'}
                  name={inputName}
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  data-lpignore="true"
                  className="mt-5 w-full bg-[var(--color-bg-alt)] border border-gray-800 rounded-2xl py-3 px-4 text-gray-200 focus:border-[var(--color-accent)]/50 outline-none transition-all"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConfirm();
                    if (e.key === 'Escape') handleCancel();
                  }}
                />
              )}

              <div className="mt-6 flex items-center justify-end gap-3">
                {dialog.kind !== 'alert' && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-5 py-2.5 rounded-2xl border border-gray-700 text-gray-300 text-sm font-bold uppercase tracking-wider hover:bg-gray-800 transition-all"
                  >
                    {dialog.cancelLabel}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleConfirm}
                  className={`px-5 py-2.5 rounded-2xl text-[var(--color-bg)] text-sm font-bold uppercase tracking-wider transition-all ${
                    dialog.kind === 'confirm' && dialog.tone === 'danger'
                      ? 'bg-rose-500 hover:bg-rose-400'
                      : 'bg-[var(--color-accent)] hover:bg-[var(--color-accent-strong)]'
                  }`}
                >
                  {dialog.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);

  if (!context) {
    throw new Error('useDialog must be used within DialogProvider');
  }

  return context;
}
