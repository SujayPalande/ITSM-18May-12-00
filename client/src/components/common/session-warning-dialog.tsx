import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface SessionWarningDialogProps {
  open: boolean;
  onStayLoggedIn: () => void;
  countdownSeconds?: number;
}

export function SessionWarningDialog({
  open,
  onStayLoggedIn,
  countdownSeconds = 60,
}: SessionWarningDialogProps) {
  const [timeLeft, setTimeLeft] = useState(countdownSeconds);

  useEffect(() => {
    if (open) {
      setTimeLeft(countdownSeconds);
      
      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [open, countdownSeconds]);

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/20">
              <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-500" />
            </div>
            <DialogTitle className="text-xl">Session Timeout Warning</DialogTitle>
          </div>
        </DialogHeader>
        <DialogDescription className="space-y-3 pt-4">
          <p className="text-base">
            Your session is about to expire due to inactivity.
          </p>
          <div className="rounded-lg bg-muted p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">
              You will be logged out in
            </p>
            <p className="text-3xl font-bold text-foreground">
              {timeLeft} {timeLeft === 1 ? 'second' : 'seconds'}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Click the button below to stay logged in, or perform any action on the page.
          </p>
        </DialogDescription>
        <DialogFooter className="sm:justify-center">
          <Button
            onClick={onStayLoggedIn}
            size="lg"
            className="w-full sm:w-auto"
          >
            Stay Logged In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
