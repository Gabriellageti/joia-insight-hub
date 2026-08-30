"use client";

import type { ComponentProps } from "react";
import { useCallback } from "react";
import { ArrowDownIcon } from "lucide-react";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Adapted from the official AI Elements conversation registry component.
export function Conversation({ className, ...props }: ComponentProps<typeof StickToBottom>) {
  return <StickToBottom className={cn("relative flex-1 overflow-y-hidden", className)} initial="smooth" resize="smooth" role="log" {...props} />;
}

export function ConversationContent({ className, ...props }: ComponentProps<typeof StickToBottom.Content>) {
  return <StickToBottom.Content className={cn("flex flex-col gap-6 p-4", className)} {...props} />;
}

export function ConversationScrollButton({ className, ...props }: ComponentProps<typeof Button>) {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();
  const handleClick = useCallback(() => scrollToBottom(), [scrollToBottom]);
  if (isAtBottom) return null;
  return <Button className={cn("absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full", className)} onClick={handleClick} size="icon" type="button" variant="outline" {...props}><ArrowDownIcon className="h-4 w-4" /><span className="sr-only">Ir para a resposta mais recente</span></Button>;
}
