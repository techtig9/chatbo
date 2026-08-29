"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "./button";

/**
 * Drop-in replacement for <Button type="submit"> inside a plain
 * <form action={serverAction}> — spec section 85 requires every button
 * to have a loading state, but a server-action form has no client-side
 * pending flag to hand to <Button> directly. useFormStatus reads the
 * nearest enclosing form's submission state, so this needs to be its
 * own component (the hook only works in a child of the <form>, not in
 * the same component that renders the <form> itself).
 */
export function SubmitButton({ children, ...props }: Omit<ButtonProps, "loading" | "type">) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} {...props}>
      {children}
    </Button>
  );
}
