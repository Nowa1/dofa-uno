# Git Repository Setup

Ваш проект готов к деплою! Теперь нужно создать GitHub репозиторий.

## Шаги:

1. Перейдите на https://github.com/new
2. Создайте новый репозиторий (например, `dofa-uno`)
3. НЕ добавляйте README, .gitignore или license (они уже есть)
4. После создания выполните команды:

```bash
git remote add origin https://github.com/YOUR_USERNAME/dofa-uno.git
git branch -M main
git push -u origin main
```

5. После push переходите к деплою согласно DEPLOYMENT.md
