import { Trash2 } from "lucide-react";

/**
 * A trash-can button that submits a bound Server Action. It's a real form, so it
 * works before JavaScript loads. For deletes that need a second click, use ConfirmButton.
 */
export function DeleteFormButton({ action, label }: { action: () => Promise<void>; label: string }) {
  return (
    <form action={action}>
      <button
        type="submit"
        className="-my-1 grid size-9 place-items-center rounded-lg text-subtle transition-colors hover:bg-surface-2 hover:text-danger"
        aria-label={label}
        title={label}
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
    </form>
  );
}
