import { getNovu } from "./novu";

export interface TimeoSubscriber {
  /** Timeo user ID (used as Novu subscriberId) */
  userId: string;
  email: string;
  name: string;
  phone?: string;
  avatarUrl?: string;
  /** Locale for i18n templates (defaults to "en") */
  locale?: string;
}

/**
 * Create or update a subscriber in Novu.
 * Call this when a user signs up or updates their profile.
 */
export async function upsertSubscriber(
  subscriber: TimeoSubscriber
): Promise<void> {
  const novu = getNovu();
  const nameParts = subscriber.name.split(" ");

  await novu.subscribers.identify(subscriber.userId, {
    email: subscriber.email,
    firstName: nameParts[0],
    lastName: nameParts.slice(1).join(" ") || undefined,
    phone: subscriber.phone,
    avatar: subscriber.avatarUrl,
    locale: subscriber.locale ?? "en",
  });
}

/**
 * Delete a subscriber from Novu.
 * Call this when a user account is deleted.
 */
export async function deleteSubscriber(userId: string): Promise<void> {
  const novu = getNovu();
  await novu.subscribers.delete(userId);
}

/**
 * Update subscriber global notification preferences in Novu.
 */
export async function updateSubscriberPreferences(
  userId: string,
  preferences: {
    emailEnabled?: boolean;
    pushEnabled?: boolean;
    inAppEnabled?: boolean;
  }
): Promise<void> {
  const novu = getNovu();

  // Use the updateGlobalPreference API with proper ChannelTypeEnum values
  // Values: "email", "push", "in_app" map to ChannelTypeEnum from @novu/shared
  await novu.subscribers.updateGlobalPreference(userId, {
    enabled: true,
    preferences: [
      // Cast to any to avoid importing ChannelTypeEnum from @novu/shared
      // The enum values match the string literals expected by Novu
      { type: "email" as any, enabled: preferences.emailEnabled ?? true },
      { type: "push" as any, enabled: preferences.pushEnabled ?? true },
      { type: "in_app" as any, enabled: preferences.inAppEnabled ?? true },
    ],
  });
}

/**
 * Set subscriber credentials for push notifications (Expo push token).
 */
export async function setExpoPushCredentials(
  userId: string,
  tokens: string[]
): Promise<void> {
  const novu = getNovu();

  await novu.subscribers.setCredentials(userId, "expo-push", {
    deviceTokens: tokens,
  });
}
