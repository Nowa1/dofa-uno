# Создание GitHub Personal Access Token

## Шаги:

1. **Откройте страницу создания токена:**
   https://github.com/settings/tokens/new

2. **Настройте токен:**
   - Note: `dofa-uno deployment`
   - Expiration: `90 days` (или на ваше усмотрение)
   - Select scopes: ✅ **repo** (полный доступ к репозиториям)

3. **Создайте токен:**
   - Нажмите "Generate token"
   - **ВАЖНО:** Скопируйте токен сейчас! Он больше не будет показан.

4. **Используйте токен для push:**
   ```bash
   git push -u origin main
   ```
   
   Когда запросит:
   - Username: `Nowa1`
   - Password: вставьте скопированный токен (не ваш пароль!)

5. **Сохраните токен в keychain (опционально):**
   macOS автоматически предложит сохранить токен в Keychain.
   Согласитесь, чтобы не вводить его каждый раз.

## После успешного push:

Ваш код будет доступен на: https://github.com/Nowa1/dofa-uno

Затем переходите к деплою согласно файлу DEPLOYMENT.md
