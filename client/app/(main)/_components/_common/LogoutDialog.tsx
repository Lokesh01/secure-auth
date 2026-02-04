'use client';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import React, { useCallback } from 'react';
import { logoutMutationFn } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader } from 'lucide-react';

type PropsType = {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

const LogoutDialog = ({ isOpen, setIsOpen }: PropsType) => {
  const router = useRouter();
  const { mutate, isPending } = useMutation({
    mutationFn: logoutMutationFn,
    onSuccess: () => {
      router.replace('/');
    },
    onError: error => {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Something went wrong!',
        variant: 'destructive',
      });
    },
  });

  const handleLogout = useCallback(() => {
    mutate();
  }, []);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure you want to log out?</DialogTitle>
            <DialogDescription>
              This will end your current session and you will need to log in
              again to access your account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              disabled={isPending}
              onClick={handleLogout}
              type="button"
              className="!text-white"
            >
              {isPending && <Loader className="animate-spin" />}
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LogoutDialog;
