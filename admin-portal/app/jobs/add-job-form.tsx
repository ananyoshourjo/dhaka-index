"use client";

import { format } from "date-fns";
import { CalendarDays } from "lucide-react";
import {
  useActionState,
  useCallback,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type AddManualJobState = {
  error: string | null;
  successId: string | null;
};

export type AddManualJobAction = (
  previousState: AddManualJobState,
  formData: FormData,
) => Promise<AddManualJobState>;

const initialState: AddManualJobState = {
  error: null,
  successId: null,
};

export function AddJobForm({ action }: { action: AddManualJobAction }) {
  const [open, setOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [deadlineValue, setDeadlineValue] = useState("");
  const [showError, setShowError] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const clientAction = useCallback(
    async (
      previousState: AddManualJobState,
      formData: FormData,
    ): Promise<AddManualJobState> => {
      const nextState = await action(previousState, formData);

      if (nextState.successId) {
        formRef.current?.reset();
        setSelectedDate(undefined);
        setDeadlineValue("");
        setCalendarOpen(false);
        setShowError(false);
        setOpen(false);
      } else if (nextState.error) {
        setShowError(true);
      }

      return nextState;
    },
    [action],
  );

  const [state, formAction, isPending] = useActionState(
    clientAction,
    initialState,
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        setCalendarOpen(false);
        if (nextOpen) {
          setShowError(false);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button">Add new</Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[30rem]">
        <DialogHeader>
          <DialogTitle>Add a new job</DialogTitle>
        </DialogHeader>

        <form
          ref={formRef}
          action={formAction}
          className="grid gap-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium">
              Company
              <Input
                name="company"
                autoComplete="organization"
                maxLength={240}
                required
              />
            </label>

            <label className="grid gap-1.5 text-sm font-medium">
              Role
              <Input
                name="title"
                autoComplete="off"
                maxLength={240}
                required
              />
            </label>
          </div>

          <label className="grid gap-1.5 text-sm font-medium">
            Job page URL
            <Input
              name="detailUrl"
              type="url"
              inputMode="url"
              autoComplete="url"
              required
            />
          </label>

          <div className="grid gap-1.5 text-sm font-medium">
            <span>
              Deadline <span className="font-normal text-muted-foreground">(optional)</span>
            </span>
            <input type="hidden" name="deadlineAt" value={deadlineValue} />
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground",
                  )}
                >
                  <CalendarDays className="size-4" aria-hidden="true" />
                  {selectedDate ? format(selectedDate, "PPP") : "Select a deadline"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setDeadlineValue(date ? format(date, "yyyy-MM-dd") : "");
                    setCalendarOpen(false);
                  }}
                />
                {selectedDate ? (
                  <div className="border-t p-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full text-muted-foreground"
                      onClick={() => {
                        setSelectedDate(undefined);
                        setDeadlineValue("");
                        setCalendarOpen(false);
                      }}
                    >
                      Clear deadline
                    </Button>
                  </div>
                ) : null}
              </PopoverContent>
            </Popover>
          </div>

          <div aria-live="polite" className="min-h-5 text-sm">
            {showError && state.error ? (
              <p className="text-destructive" role="alert">
                {state.error}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Adding…" : "Add job"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
