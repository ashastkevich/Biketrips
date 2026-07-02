"use client";

export type AuthProvider = "telegram" | "phone" | "email" | "vk" | "yandex";

export interface AuthOptionsProps {
  onSelect?: (provider: AuthProvider) => void;
  onClose?: () => void;
}

const authOptions: Array<{
  provider: AuthProvider;
  label: string;
  icon: React.ReactNode;
  recommended?: boolean;
}> = [
  {
    provider: "telegram",
    label: "Продолжить через Telegram",
    recommended: true,
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20.7 3.5 3.8 10c-1.2.5-1.2 1.2-.2 1.5l4.3 1.4 1.7 5.2c.2.6.1.8.7.8.5 0 .7-.2 1-.5l2.1-2 4.4 3.2c.8.5 1.4.2 1.6-.8l2.9-13.7c.3-1.2-.5-1.8-1.6-1.4Zm-11.9 9 9.7-6.1c.5-.3.9-.1.5.2l-8 7.2-.3 3.1-1.9-4.4Z" />
      </svg>
    ),
  },
  {
    provider: "phone",
    label: "Продолжить по телефону",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7.1 2.5h3l1.4 5.2-2 1.5a15.6 15.6 0 0 0 5.3 5.3l1.5-2 5.2 1.4v3c0 2.5-2 4.6-4.6 4.6A14.4 14.4 0 0 1 2.5 7.1c0-2.6 2-4.6 4.6-4.6Zm1.5 2h-1.5c-1.4 0-2.6 1.2-2.6 2.6a12.4 12.4 0 0 0 12.4 12.4c1.4 0 2.6-1.2 2.6-2.6v-1.5l-2.4-.6-1.8 2.2-.7-.3a17.5 17.5 0 0 1-7.3-7.3L7 8.7l2.2-1.8-.6-2.4Z" />
      </svg>
    ),
  },
  {
    provider: "email",
    label: "Продолжить через почту",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 4.5h16a2.5 2.5 0 0 1 2.5 2.5v10a2.5 2.5 0 0 1-2.5 2.5H4A2.5 2.5 0 0 1 1.5 17V7A2.5 2.5 0 0 1 4 4.5Zm0 2c-.2 0-.3 0-.4.2l8.4 6.1 8.4-6.1-.4-.2H4Zm16.5 2.6-7.9 5.7a1 1 0 0 1-1.2 0L3.5 9.1V17c0 .3.2.5.5.5h16c.3 0 .5-.2.5-.5V9.1Z" />
      </svg>
    ),
  },
  {
    provider: "vk",
    label: "Продолжить через VK",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12.5 18.5C5.3 18.5 1.2 13.6 1 5.5h3.6c.1 6 2.8 8.5 4.9 9V5.5h3.4v5.1c2-.2 4.1-2.5 4.8-5.1h3.4a9.8 9.8 0 0 1-4.4 6.4 10.2 10.2 0 0 1 5.2 6.6h-3.8a6.6 6.6 0 0 0-5.2-4.7v4.7h-.4Z" />
      </svg>
    ),
  },
  {
    provider: "yandex",
    label: "Продолжить через Яндекс",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M13.8 4.3h-1.4c-2.5 0-3.8 1.2-3.8 3.1 0 2.1.9 3 2.9 4.3l1.6 1.1-4.7 6.9H5l4.2-6.2c-2.4-1.7-3.8-3.3-3.8-5.9 0-3.3 2.3-5.3 7-5.3H17v17.4h-3.2V4.3Z" />
      </svg>
    ),
  },
];

export function AuthOptions({ onSelect, onClose }: AuthOptionsProps) {
  return (
    <section className="auth-options" aria-labelledby="auth-options-title">
      {onClose ? (
        <button
          className="ui-dialog__close"
          type="button"
          aria-label="Закрыть"
          onClick={onClose}
        >
          ×
        </button>
      ) : null}
      <div className="auth-options__header">
        <p className="eyebrow">BikeTrips</p>
        <h2 id="auth-options-title">Войти</h2>
        <p>Выберите удобный способ. Это займёт меньше минуты.</p>
      </div>

      <div className="auth-options__list">
        {authOptions.map(({ provider, label, icon, recommended }) => (
          <button
            className={`auth-option auth-option--${provider}`}
            key={provider}
            type="button"
            onClick={() => onSelect?.(provider)}
          >
            <span className="auth-option__icon">{icon}</span>
            <span>{label}</span>
            {recommended ? <span className="auth-option__badge">Рекомендуем</span> : null}
          </button>
        ))}
      </div>

      <p className="auth-options__legal">
        Продолжая, вы принимаете условия использования и политику конфиденциальности.
      </p>
    </section>
  );
}
