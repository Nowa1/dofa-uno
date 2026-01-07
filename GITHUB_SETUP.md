# GitHub Repository Setup Guide

## Статус: GitHub CLI не установлен

GitHub CLI (`gh`) не найден в системе. Ниже представлены альтернативные методы для создания репозитория и публикации кода.

---

## Метод 1: Установка GitHub CLI (Рекомендуется)

### Установка Homebrew (если не установлен):
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### Установка GitHub CLI через Homebrew:
```bash
brew install gh
```

### После установки:

1. **Авторизация в GitHub:**
```bash
gh auth login
```
Выберите:
- GitHub.com
- HTTPS
- Authenticate with your browser (или используйте токен)

2. **Создание репозитория и push:**
```bash
cd /Users/mashavasylyuk/Desktop/dofa.uno
gh repo create dofa-uno --public --source=. --description="DOFA.UNO - AI-powered task management with gamification and neural tunnel visualization" --push
```

3. **Открыть репозиторий в браузере:**
```bash
gh repo view --web
```

---

## Метод 2: Ручное создание через GitHub Web Interface

### Шаг 1: Создать репозиторий на GitHub
1. Перейти на https://github.com/new
2. Repository name: `dofa-uno`
3. Description: `DOFA.UNO - AI-powered task management with gamification and neural tunnel visualization`
4. Выбрать: **Public**
5. **НЕ** инициализировать с README, .gitignore или license (у нас уже есть код)
6. Нажать **Create repository**

### Шаг 2: Добавить remote и push
После создания репозитория GitHub покажет инструкции. Выполните:

```bash
cd /Users/mashavasylyuk/Desktop/dofa.uno

# Добавить remote origin (замените YOUR_USERNAME на ваш GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/dofa-uno.git

# Проверить текущую ветку
git branch

# Если ветка называется master, переименовать в main
git branch -M main

# Push кода
git push -u origin main
```

---

## Метод 3: Использование GitHub Desktop

1. Скачать GitHub Desktop: https://desktop.github.com/
2. Установить и авторизоваться
3. File → Add Local Repository → выбрать `/Users/mashavasylyuk/Desktop/dofa.uno`
4. Repository → Push to GitHub
5. Выбрать имя: `dofa-uno`, описание, и Public
6. Нажать Push repository

---

## Проверка текущего состояния Git

Проверить статус репозитория:
```bash
cd /Users/mashavasylyuk/Desktop/dofa.uno
git status
git log --oneline
git remote -v
```

---

## Информация о проекте

**Название репозитория:** dofa-uno  
**Описание:** DOFA.UNO - AI-powered task management with gamification and neural tunnel visualization  
**Тип:** Public  
**Текущая директория:** `/Users/mashavasylyuk/Desktop/dofa.uno`

---

## Что делать после создания репозитория

1. **Проверить URL репозитория:**
```bash
git remote -v
```

2. **Обновить README.md** с ссылкой на репозиторий

3. **Добавить badges** (опционально):
   - Build status
   - License
   - Version

4. **Настроить GitHub Pages** (если нужно для документации)

5. **Добавить Topics** на GitHub:
   - task-management
   - gamification
   - ai
   - react
   - fastapi
   - python
   - javascript

---

## Troubleshooting

### Если git remote уже существует:
```bash
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/dofa-uno.git
```

### Если нужно изменить URL remote:
```bash
git remote set-url origin https://github.com/YOUR_USERNAME/dofa-uno.git
```

### Если возникают проблемы с push:
```bash
# Проверить авторизацию
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Использовать Personal Access Token вместо пароля
# Создать токен: https://github.com/settings/tokens
```

---

## Следующие шаги после успешного push

1. ✅ Код опубликован на GitHub
2. 📝 Обновить документацию с ссылками на репозиторий
3. 🔧 Настроить CI/CD (GitHub Actions)
4. 🚀 Настроить автоматический деплой на Railway/Vercel
5. 📊 Добавить GitHub Issues для трекинга задач
6. 🤝 Настроить Contributing guidelines

---

## Полезные ссылки

- GitHub CLI: https://cli.github.com/
- GitHub Desktop: https://desktop.github.com/
- Personal Access Tokens: https://github.com/settings/tokens
- GitHub Docs: https://docs.github.com/
