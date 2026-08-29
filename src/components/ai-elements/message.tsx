"use client";

import type { HTMLAttributes } from "react";
import { memo } from "react";
import { Streamdown } from "streamdown";
import type { UIMessage } from "ai";
import { cn } from "@/lib/utils";

// Adapted from the official AI Elements message registry component.
export type MessageProps = HTMLAttributes<HTMLDivElement> & { from: UIMessage["role"] };

export function Message({ className, from, ...props }: MessageProps) {
  return <div className={cn("group flex w-full max-w-[95%] flex-col gap-2", from === "user" ? "is-user ml-auto items-end" : "is-assistant", className)} {...props} />;
}

export function MessageContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("min-w-0 max-w-full overflow-hidden text-sm", "group-[.is-user]:w-fit group-[.is-user]:rounded-lg group-[.is-user]:bg-secondary group-[.is-user]:px-4 group-[.is-user]:py-3", "group-[.is-assistant]:w-full", className)} {...props} />;
}

export const MessageResponse = memo(({ className, ...props }: React.ComponentProps<typeof Streamdown>) => (
  <Streamdown className={cn("size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0", className)} {...props} />
));
MessageResponse.displayName = "MessageResponse";
