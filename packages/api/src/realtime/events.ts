export const SocketEvents = {
  BOOKING_CREATED: "booking:created",
  BOOKING_UPDATED: "booking:updated",
  ORDER_CREATED: "order:created",
  ORDER_UPDATED: "order:updated",
  POS_TRANSACTION_CREATED: "pos:transaction_created",
  NOTIFICATION_NEW: "notification:new",
  CHECKIN_CREATED: "checkin:created",
} as const;

export type SocketEvent = (typeof SocketEvents)[keyof typeof SocketEvents];
