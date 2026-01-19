# Notifications Module

Multi-channel notification system with email support via [Resend](https://resend.com) and [React Email](https://react.email).

## Quick Start

### 1. Configure Environment

```bash
# .env
RESEND_API_KEY=re_xxxxx               # Get from https://resend.com/api-keys
EMAIL_FROM=noreply@yourdomain.com     # Must be from verified domain
EMAIL_REPLY_TO=support@yourdomain.com # Optional
APP_NAME=NestJS Foundation            # Required
```

### 2. Send Notifications

```typescript
import { NotificationsService, NotificationType } from '#/notifications';

@Injectable()
export class MyService {
  constructor(private readonly notifications: NotificationsService) {}

  async sendOtp(email: string, otp: string) {
    await this.notifications.send(NotificationType.OTP_SIGN_IN, {
      recipient: email,
      otp,
      expiresInMinutes: 5,
    });
  }
}
```

### 3. Preview Templates

```bash
pnpm dev:email  # Opens http://localhost:3001
```

## Architecture

```text
src/notifications/
├── notifications.service.ts     # Orchestrator - routes to channels
├── notifications.types.ts       # Shared types
│
└── channels/
    ├── channel.interface.ts     # Channel contract
    │
    └── email/                   # Email channel (fully encapsulated)
        ├── email.channel.ts     # Channel implementation
        ├── email.service.ts     # Resend SDK wrapper
        ├── templates/           # TSX email templates
        │   ├── base-layout.tsx
        │   ├── otp-code.tsx
        │   └── welcome.tsx
        └── _components/         # Reusable components
```

**Key principle**: Each channel is self-contained with its own templates and logic.

## Available Notification Types

| Type | Payload | Use Case |
|------|---------|----------|
| `OTP_SIGN_IN` | `{ recipient, otp, expiresInMinutes }` | Sign-in verification |
| `OTP_EMAIL_VERIFICATION` | `{ recipient, otp, expiresInMinutes }` | Email verification |
| `OTP_PASSWORD_RESET` | `{ recipient, otp, expiresInMinutes }` | Password reset |
| `WELCOME` | `{ recipient, userName? }` | Welcome message |

## Customizing Templates

Templates are React components in `src/notifications/channels/email/templates/`.

### Edit Existing Template

```tsx
// src/notifications/channels/email/templates/otp-code.tsx
<Heading style={{ color: '#your-brand-color' }}>
  Your verification code
</Heading>
```

### Add New Template

1. Create template file:

```tsx
// templates/password-changed.tsx
export const PasswordChangedEmail: FC<Props> = ({ appName }) => (
  <BaseLayout appName={appName} previewText="Password changed">
    <Heading>Password Changed</Heading>
    <Text>Your password was successfully changed.</Text>
  </BaseLayout>
);
```

2. Add to `notifications.types.ts`:

```typescript
export enum NotificationType {
  PASSWORD_CHANGED = 'password_changed',
}
```

3. Register in `email.channel.ts`:

```typescript
readonly supportedTypes = [
  NotificationType.PASSWORD_CHANGED,
];

private getTemplate(type, payload, appName) {
  case NotificationType.PASSWORD_CHANGED:
    return createElement(PasswordChangedEmail, { appName });
}
```

## Adding New Channels

Example: Push notifications

```text
src/notifications/channels/push/
├── push.channel.ts       # implements NotificationChannel
├── push.service.ts       # Expo/Firebase SDK wrapper
└── templates/
    └── otp-push.ts
```

Register in `notifications.module.ts`:

```typescript
{
  provide: NOTIFICATION_CHANNELS,
  useFactory: (email, push) => [email, push],
  inject: [EmailChannel, PushChannel],
}
```

Use with preference:

```typescript
await notifications.send(
  NotificationType.WELCOME,
  { recipient: 'user@example.com' },
  { preferredChannels: ['push', 'email'] } // Try push first, fallback to email
);
```

## Better Auth Integration

Automatically configured in `app.module.ts`:

```typescript
AuthModule.forRootAsync({
  imports: [NotificationsModule],
  useFactory: (notifications: NotificationsService) => ({
    auth: getBetterAuthConfig({
      sendOtp: async ({ email, otp, type }) => {
        await notifications.send(mapOtpType(type), {
          recipient: email,
          otp,
          expiresInMinutes: 5,
        });
      },
    }),
  }),
})
```

**When OTP emails are sent:**

- **On sign-up**: Automatically sends email verification OTP (`sendVerificationOnSignUp: true` in `auth.config.ts`)
- **On sign-in**: When user requests OTP via `/auth/email-otp/send-verification-otp`
- **Password reset**: When user requests password reset via `/auth/forget-password/email-otp`

**Email verification is required:**

Users must verify their email before they can sign in (`requireEmailVerification: true` in `auth.config.ts`). If a user tries to sign in without verifying their email, they will receive a `403` error.

## Testing

E2E tests in `e2e/notifications.spec.ts`. For real email testing:

```typescript
test.skip('should send real email', async () => {
  // Set RESEND_API_KEY and EMAIL_FROM in .env.test
  // Remove .skip() to run
});
```

## Troubleshooting

**Emails not sending?**

1. Check configuration:
   ```typescript
   const channels = notifications.getAvailableChannels(NotificationType.OTP_SIGN_IN);
   console.log(channels); // Should include 'email'
   ```

2. Verify Resend dashboard: [https://resend.com/emails](https://resend.com/emails)

3. Check logs for `Email service not configured` warning

## Resources

- [Resend Docs](https://resend.com/docs)
- [React Email Docs](https://react.email/docs)
- [Better Auth Email OTP](https://www.better-auth.com/docs/plugins/email-otp)
