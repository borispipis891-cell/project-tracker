# Phase 3: Многопользовательская работа - Завершено ✓

## Реализованные функции

### 1. Система ролей и прав доступа

#### Роли в проекте:
- **Owner (Владелец)** - создатель проекта, полный контроль
- **Editor (Редактор)** - может редактировать проект и задачи
- **Viewer (Наблюдатель)** - только просмотр

#### Глобальные роли пользователей:
- **admin** - администратор системы (первый зарегистрированный пользователь)
- **user** - обычный пользователь

### 2. Структура базы данных

#### Обновленная модель Project
```prisma
model Project {
  id          Int       @id @default(autoincrement())
  name        String
  ownerId     String    // Владелец проекта
  owner       User      @relation("ProjectOwner", fields: [ownerId], references: [id])
  members     ProjectMember[] // Участники
  // ... остальные поля
}
```

#### ProjectMember
```prisma
model ProjectMember {
  id        String   @id @default(cuid())
  projectId Int
  userId    String
  role      String   // editor, viewer
  addedAt   DateTime @default(now())
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([projectId, userId])
}
```

#### Invitation
```prisma
model Invitation {
  id        String   @id @default(cuid())
  projectId Int
  email     String
  role      String   // editor, viewer
  token     String   @unique
  status    String   // pending, accepted, expired
  expiresAt DateTime
  createdAt DateTime @default(now())
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
}
```

### 3. API Endpoints

#### `/api/projects/invite` (POST)
Приглашение пользователя в проект
```typescript
{
  email: string;
  role: 'editor' | 'viewer';
  projectId: number;
}
```

#### `/api/projects/members` (GET)
Получить список участников проекта
- Query: `?projectId=1`

#### `/api/projects/members` (DELETE)
Удалить участника из проекта
- Query: `?memberId=xxx`

#### `/api/projects/members` (PATCH)
Изменить роль участника
```typescript
{
  memberId: string;
  role: 'editor' | 'viewer';
}
```

#### `/api/projects/list` (GET)
Получить список проектов пользователя (владелец + участник)

#### `/api/projects/accept-invite` (POST)
Принять приглашение
```typescript
{
  token: string;
}
```

### 4. Страницы

#### `/projects/[id]/team`
Управление командой проекта:
- Просмотр владельца и участников
- Приглашение новых участников (только владелец)
- Изменение ролей (только владелец)
- Удаление участников (только владелец)

#### `/accept-invite?token=xxx`
Страница принятия приглашения:
- Автоматическое перенаправление на вход если не авторизован
- Проверка токена и добавление в проект
- Перенаправление на страницу команды после успеха

### 5. Компоненты

#### `<ProjectNav>`
Навигация по разделам проекта:
- Детали
- Команда
- История
- Файлы

#### `<RoleBadge>`
Отображение роли пользователя с иконкой

#### `<ProjectRoleInfo>`
Подробная информация о роли и доступных действиях

### 6. Утилиты

#### `project-permissions.ts`
Helper функции для проверки прав доступа:
- `getUserProjectRole()` - получить роль и права
- `checkProjectAccess()` - проверить доступ на просмотр
- `checkProjectEditAccess()` - проверить доступ на редактирование

### 7. Безопасность

#### Middleware
Защита роутов проектов:
- Проверка авторизации
- Перенаправление на вход с возвратом

#### API защита
- Проверка сессии на всех endpoints
- Проверка прав доступа к конкретному проекту
- Проверка прав на действия (удаление, изменение ролей)

### 8. Регистрация

Обновленная регистрация:
- Первый пользователь автоматически получает роль `admin`
- Остальные пользователи получают роль `user`
- Уведомление об назначении администратором

## Как использовать

### Создание проекта
При создании проекта текущий пользователь автоматически назначается владельцем (`ownerId`).

### Приглашение участника
1. Перейти на страницу `/projects/[id]/team`
2. Ввести email и выбрать роль
3. Нажать "Пригласить"
4. Система проверит:
   - Если пользователь зарегистрирован - добавит сразу
   - Если нет - создаст приглашение с токеном

### Принятие приглашения
1. Пользователь получает ссылку `/accept-invite?token=xxx`
2. Если не авторизован - перенаправляется на вход
3. После входа автоматически добавляется в проект
4. Перенаправляется на страницу команды

### Управление участниками
Владелец может:
- Изменять роли участников
- Удалять участников
- Просматривать список всех участников

Участники могут:
- Просматривать список команды
- Видеть свою роль

## Миграция существующих данных

Скрипт для назначения владельцев существующим проектам:

```bash
npx ts-node scripts/assign-project-owners.ts
```

Или через Prisma Studio:
```bash
npx prisma studio
```

## Тестирование

1. Зарегистрируйте первого пользователя (будет admin)
2. Создайте проект (вы владелец)
3. Зарегистрируйте второго пользователя
4. Пригласите его в проект
5. Войдите под вторым пользователем и примите приглашение
6. Проверьте права доступа

## Что дальше?

Phase 4: Email уведомления
- Отправка реальных email при приглашениях
- Уведомления об изменениях в проектах
- Дайджесты активности

Phase 5: Облачное хранилище
- Интеграция с S3/Cloudinary
- Загрузка файлов
- Превью документов
