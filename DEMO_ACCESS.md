# Демо-доступ к FocusTrack AI

Публичный демонстрационный аккаунт для входа в приложение и быстрого ознакомления с продуктом.

| Поле | Значение |
|------|----------|
| URL | https://focustrack-ai.vercel.app/ |
| Email | `demo@focustrack.ai` |
| Пароль | `focustrack-demo` |

**Как войти:** кнопка **«Войти»** в шапке → форма email/пароль → ввести данные выше.

## Примечания

- Это **публичный демо-аккаунт**, не личные учётные данные. Не является секретом: тот же пароль
  задан в `supabase/seed.sql` (хранится в БД как bcrypt-хеш через `crypt(...)`), а `publishable`-ключ
  Supabase по своей природе клиентский.
- Данные защищены **RLS**: каждый пользователь видит и редактирует только свои строки (`user_id = auth.uid()`).
- **Без входа** приложение работает в демо-режиме (баннер «изменения не сохраняются»).
- **После входа** — режим «Supabase подключен»: цели/задачи грузятся из БД, создание/изменения и
  недельное ревью сохраняются между сессиями.
- Также поддерживается вход через **Google OAuth** (нужна настройка провайдера в Supabase, см. ниже).

## Google OAuth

Кнопка **Google** на фронте вызывает `signInWithOAuth("google")` через Supabase Auth. Секреты
провайдера хранятся только в Supabase Dashboard, не в коде приложения.

Если провайдер не включён, Supabase вернёт ошибку `provider is not enabled`, а UI покажет
понятное сообщение с отсылкой к этому файлу.

### Быстрая настройка (production)

Проект Supabase: `wbxyyvvuqrhqtuywfeto`.

1. **Google Cloud Console** → APIs & Services → Credentials → OAuth client ID (Web application):
   - **Authorized JavaScript origins:** `https://focustrack-ai.vercel.app`, `http://127.0.0.1:5173`
   - **Authorized redirect URIs:**
     `https://wbxyyvvuqrhqtuywfeto.supabase.co/auth/v1/callback`
2. **Supabase Dashboard** → Authentication → Providers → **Google**:
   - включить провайдер;
   - вставить Client ID и Client Secret из Google.
3. **Supabase Dashboard** → Authentication → URL Configuration:
   - **Site URL:** `https://focustrack-ai.vercel.app`
   - **Redirect URLs:** добавить `https://focustrack-ai.vercel.app` и `http://127.0.0.1:5173`

После сохранения кнопка **Google** должна перенаправлять на экран входа Google, а не показывать
JSON-ошибку.

Подробная инструкция и описание flow: `docs/integrations/integration_documentation.md` (раздел OAuth2).
