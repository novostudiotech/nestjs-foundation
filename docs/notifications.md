# Notifications Module

The Notifications module provides a unified, channel-agnostic system for sending notifications. Currently supports email via [Resend](https://resend.com) with [React Email](https://react.email) templates.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Email Channel Setup](#email-channel-setup)
- [Usage](#usage)
- [Email Templates](#email-templates)
- [Customizing Templates](#customizing-templates)
- [Adding New Channels](#adding-new-channels)
- [Testing](#testing)

## Overview

The notifications system is designed with extensibility in mind:

- **Channel-based architecture**: Each delivery method (email, push, SMS) is a self-contained channel
- **Template encapsulation**: Templates live inside channels, not in a shared folder
- **Type-safe**: Full TypeScript support with typed payloads
- **Non-blocking**: Notification failures don't block main application flow

## Architecture

```text
src/notifications/
├── notifications.module.ts      # Main module
├── notifications.service.ts     # Orchestrator
├── notifications.types.ts       # Shared types
│
└── channels/
    ├── channel.interface.ts     # Channel contract
    │
    └── email/                   # Email channel (fully encapsulated)
        ├── email.channel.ts     # Channel implementation
        ├── email.service.ts     # Resend SDK wrapper
        ├── email.types.ts       # Email-specific types
        ├── render.ts            # TSX → HTML renderer
        │
        ├── templates/           # TSX email templates
        │   ├── base-layout.tsx
        │   ├── otp-code.tsx
        │   └── welcome.tsx
        │
        └── _components/         # Reusable components (ignored by preview)
            ├── button.tsx
            ├── footer.tsx
            ├── header.tsx
            └── styles.ts
```

## Email Channel Setup

### 1. Environment Variables

Add to your `.env` file:

```bash
# Resend API Key (get from https://resend.com/api-keys)
RESEND_API_KEY=re_xxxxx

# Sender email (must be from verified domain)
EMAIL_FROM=noreply@yourdomain.com

# Optional: Reply-to address
EMAIL_REPLY_TO=support@yourdomain.com

# Optional: Application name (used in templates)
APP_NAME=My App
```

### 2. Verify Domain

1. Go to [Resend Domains](https://resend.com/domains)
2. Add your domain
3. Configure DNS records (SPF, DKIM, DMARC)
4. Wait for verification

### 3. Test Configuration

```typescript
// In any service
constructor(private notifications: NotificationsService) {}

async testEmail() {
  const result = await this.notifications.send(NotificationType.OTP_SIGN_IN, {
    recipient: 'test@example.com',
    otp: '123456',
    expiresInMinutes: 5,
  });

  console.log(result); // { success: true, messageId: '...' }
}
```

## Usage

### Sending Notifications

```typescript
import { NotificationsService, NotificationType } from '#/notifications';

@Injectable()
export class MyService {
  constructor(private readonly notifications: NotificationsService) {}

  async sendOtpCode(email: string, otp: string) {
    await this.notifications.send(NotificationType.OTP_SIGN_IN, {
      recipient: email,
      otp,
      expiresInMinutes: 5,
    });
  }

  async sendWelcome(email: string, userName?: string) {
    await this.notifications.send(NotificationType.WELCOME, {
      recipient: email,
      userName,
    });
  }
}
```

### Available Notification Types

| Type | Payload | Use Case |
|------|---------|----------|
| `OTP_SIGN_IN` | `{ recipient, otp, expiresInMinutes }` | Sign-in verification |
| `OTP_EMAIL_VERIFICATION` | `{ recipient, otp, expiresInMinutes }` | Email verification |
| `OTP_PASSWORD_RESET` | `{ recipient, otp, expiresInMinutes }` | Password reset |
| `WELCOME` | `{ recipient, userName? }` | Welcome after registration |

### Better Auth Integration

The module is automatically integrated with Better Auth's `emailOTP` plugin:

```typescript
// src/app.module.ts (already configured)
AuthModule.forRootAsync({
  imports: [ConfigModule, NotificationsModule],
  useFactory: (
    configService: ConfigService<EnvConfig>,
    notificationsService: NotificationsService
  ) => {
    const databaseUrl = configService.get('DATABASE_URL');
    const secret = configService.get('AUTH_SECRET');

    // Map Better Auth OTP types to notification types
    const otpTypeMap: Record<BetterAuthOtpType, NotificationType> = {
      'sign-in': NotificationType.OTP_SIGN_IN,
      'email-verification': NotificationType.OTP_EMAIL_VERIFICATION,
      'forget-password': NotificationType.OTP_PASSWORD_RESET,
    };

    return {
      auth: getBetterAuthConfig({
        databaseUrl,
        secret,
        sendOtp: async ({ email, otp, type }) => {
          const notificationType = otpTypeMap[type];
          await notificationsService.send(notificationType, {
            recipient: email,
            otp,
            expiresInMinutes: 5,
          });
        },
      }),
    };
  },
  inject: [ConfigService, NotificationsService],
})
```

## Email Templates

Templates are React components using [@react-email/components](https://react.email/docs/components/html).

### Preview Templates

Start the preview server to edit templates with live reload:

```bash
pnpm dev:email
```

Visit [http://localhost:3001](http://localhost:3001) to see all templates.

### Template Structure

```tsx
// src/notifications/channels/email/templates/otp-code.tsx
import { Heading, Section, Text } from '@react-email/components';
import { BaseLayout } from './base-layout';

export const OtpCodeEmail: FC<OtpCodeEmailProps> = ({ otp, expiresInMinutes, appName }) => (
  <BaseLayout appName={appName} previewText={`Your code: ${otp}`}>
    <Heading>Your verification code</Heading>
    <Section style={codeContainer}>
      <Text style={codeText}>{otp}</Text>
    </Section>
    <Text>Expires in {expiresInMinutes} minutes</Text>
  </BaseLayout>
);
```

## Customizing Templates

### Option 1: Edit Existing Templates

Simply modify the TSX files in `src/notifications/channels/email/templates/`:

```tsx
// Change colors, layout, text, etc.
<Heading style={{ color: '#your-brand-color' }}>
  Welcome to {appName}!
</Heading>
```

### Option 2: Add New Template

1. Create new template file:

```tsx
// src/notifications/channels/email/templates/password-changed.tsx
export const PasswordChangedEmail: FC<Props> = ({ appName }) => (
  <BaseLayout appName={appName} previewText="Password changed">
    <Heading>Password Changed</Heading>
    <Text>Your password was successfully changed.</Text>
  </BaseLayout>
);
```

2. Add notification type:

```typescript
// src/notifications/notifications.types.ts
export enum NotificationType {
  // ... existing types
  PASSWORD_CHANGED = 'password_changed',
}
```

3. Register in email channel:

```typescript
// src/notifications/channels/email/email.channel.ts
readonly supportedTypes = [
  // ... existing types
  NotificationType.PASSWORD_CHANGED,
];

private getTemplate(type, payload, appName) {
  switch (type) {
    // ... existing cases
    case NotificationType.PASSWORD_CHANGED:
      return createElement(PasswordChangedEmail, { appName });
  }
}
```

### Option 3: Override Components

Modify reusable components in `_components/`:

```typescript
// src/notifications/channels/email/_components/styles.ts
export const styles = {
  heading: {
    color: '#your-brand-color', // Change brand color
    fontSize: '28px',            // Adjust size
  },
  // ... other styles
};
```

## Adding New Channels

Example: Adding Push Notifications

### 1. Create Channel Structure

```text
src/notifications/channels/push/
├── push.channel.ts
├── push.service.ts
├── push.types.ts
└── templates/
    ├── otp-push.ts
    └── welcome-push.ts
```

### 2. Implement Channel Interface

```typescript
// push.channel.ts
@Injectable()
export class PushChannel implements NotificationChannel {
  readonly name = 'push';
  readonly supportedTypes = [
    NotificationType.OTP_SIGN_IN,
    NotificationType.WELCOME,
  ];

  async send(type: NotificationType, payload: unknown): Promise<SendResult> {
    // Implement push notification logic
  }

  isConfigured(): boolean {
    return !!this.pushService.isConfigured();
  }
}
```

### 3. Register Channel

```typescript
// notifications.module.ts
@Module({
  imports: [EmailModule, PushModule],
  providers: [
    {
      provide: NOTIFICATION_CHANNELS,
      useFactory: (email: EmailChannel, push: PushChannel) => [email, push],
      inject: [EmailChannel, PushChannel],
    },
  ],
})
export class NotificationsModule {}
```

### 4. Use with Channel Preference

```typescript
await notifications.send(
  NotificationType.WELCOME,
  { recipient: 'user@example.com' },
  { preferredChannels: ['push', 'email'] } // Try push first, fallback to email
);
```

## Testing

### Unit Tests

Test individual components:

```typescript
describe('EmailChannel', () => {
  it('should render OTP template', async () => {
    const channel = new EmailChannel(mockEmailService);
    const result = await channel.send(NotificationType.OTP_SIGN_IN, {
      recipient: 'test@example.com',
      otp: '123456',
      expiresInMinutes: 5,
    });
    expect(result.success).toBe(true);
  });
});
```

### E2E Tests

See `e2e/notifications.spec.ts` for examples.

For testing with real Resend API:

```typescript
test.skip('should send real email', async () => {
  // Set RESEND_API_KEY and EMAIL_FROM in .env.test
  // Remove .skip() to run
});
```

### Manual Testing

1. Start preview server: `pnpm dev:email`
2. Edit templates and see changes live
3. Test with real API:

```bash
# Set env vars
export RESEND_API_KEY=re_xxxxx
export EMAIL_FROM=test@yourdomain.com

# Start app
pnpm dev

# Trigger notification (e.g., via API or admin panel)
```

## Troubleshooting

### Emails Not Sending

1. **Check configuration**:
   ```typescript
   // In any service
   const channels = notifications.getAvailableChannels(NotificationType.OTP_SIGN_IN);
   console.log(channels); // Should include 'email'
   ```

2. **Verify environment variables**:
   ```bash
   echo $RESEND_API_KEY
   echo $EMAIL_FROM
   ```

3. **Check Resend dashboard**: [https://resend.com/emails](https://resend.com/emails)

### Templates Not Showing in Preview

- Ensure files are in `templates/` directory
- Check file has `.tsx` extension
- Verify `export default` exists
- Restart preview server: `pnpm dev:email`

### TypeScript Errors

```bash
# Type check notifications module
pnpm exec tsc --noEmit src/notifications/**/*.ts
```

## Best Practices

1. **Don't await notifications in critical paths**: They're fire-and-forget
2. **Use preview server** for template development
3. **Test with real emails** before production
4. **Monitor Resend dashboard** for delivery issues
5. **Keep templates simple**: Email clients have limited CSS support
6. **Use inline styles**: External CSS doesn't work in emails

## Resources

- [Resend Documentation](https://resend.com/docs)
- [React Email Documentation](https://react.email/docs)
- [Email Client CSS Support](https://www.caniemail.com/)
- [Better Auth Email OTP Plugin](https://www.better-auth.com/docs/plugins/email-otp)
