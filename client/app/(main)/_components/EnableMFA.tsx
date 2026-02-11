'use client';
import React, { useCallback, useState } from 'react';
import { z } from 'zod';
import { useAuthContext } from '@/context/auth-provider';
import { useMutation, useQuery } from '@tanstack/react-query';
import { mfaSetupQueryFn, MfaType, verifyMfaMutationFn } from '@/lib/api';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, Copy, Loader } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import RevokeMFA from './_common/RevokeMFA';

const EnableMFA = () => {
  const { user, refetch } = useAuthContext();
  const [showKey, setShowKey] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['mfa-setup'],
    queryFn: mfaSetupQueryFn,
    enabled: isOpen,
    staleTime: Infinity,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: verifyMfaMutationFn,
  });

  const mfaData = data ?? ({} as MfaType);

  const formSchema = z.object({
    pin: z.string().min(6, {
      message: 'Your one-time password must be 6 characters.',
    }),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pin: '',
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const data = {
      code: values.pin,
      secretKey: mfaData.secret,
    };
    mutate(data, {
      onSuccess: (response: any) => {
        // queryClient.invalidateQueries({
        //   queryKey: ["authUser"],
        // });
        refetch();
        setIsOpen(false);
        toast({
          title: 'Success',
          description: response.message,
        });
      },
      onError: error => {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      },
    });
  }

  const onCopy = useCallback((value: string) => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);
  return (
    <div className="via-root to-root rounded-xl bg-gradient-to-r p-0.5">
      <div className="rounded-[10px] p-6">
        <div className="flex items-center gap-3">
          <h3 className="text-xl tracking-[-0.16px] text-slate-12 font-bold mb-1">
            Multi Factor Authentication (MFA)
          </h3>
          {user?.userPreferences?.enable2FA && (
            <span className="select-none whitespace-nowrap font-medium bg-green-100 text-green-500 text-xs h-6 px-2 rounded flex flex-row items-center justify-center gap-1">
              Enabled
            </span>
          )}
        </div>

        <p className="mb-6 text-sm text-[#0007149f] dark:text-gray-100 font-normal">
          Protect your account by adding an extra layer of security.
        </p>
        {user?.userPreferences?.enable2FA ? (
          <RevokeMFA />
        ) : (
          <Dialog modal open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button disabled={isLoading} className="h-[35px] text-white">
                Enable MFA
              </Button>
            </DialogTrigger>
            <DialogContent className="!gap-0">
              <DialogHeader>
                <DialogTitle className="text-[17px] text-slate-12 font-semibold">
                  Setup Multi-Factor Authentication
                </DialogTitle>
              </DialogHeader>
              <div>
                <p className="mt-6 text-sm text-[#0007149f] dark:text-inherit font-bold">
                  Scan the OR code
                </p>
                <span className="text-sm text-[#0007149f] dark:text-inherit font-normal">
                  Use an app like{' '}
                  <a
                    className="!text-primary underline decoration-primary decoration-1 underline-offset-2 transition duration-200 ease-in-out hover:decoration-blue-11 dark:text-current dark:decoration-slate-9 dark:hover:decoration-current "
                    rel="noopener noreferrer"
                    target="_blank"
                    href="https://support.1password.com/one-time-passwords/"
                  >
                    1Password
                  </a>{' '}
                  or{' '}
                  <a
                    className="!text-primary underline decoration-primary decoration-1 underline-offset-2 transition duration-200 ease-in-out hover:decoration-blue-11 dark:text-current dark:decoration-slate-9 dark:hover:decoration-current "
                    rel="noopener noreferrer"
                    target="_blank"
                    href="https://safety.google/authentication/"
                  >
                    Google Authenticator
                  </a>
                </span>
              </div>
              <div className="mt-4 flex flex-row items-center gap-4">
                <div className="shrink-0 rounded-md border p-2 border-[#0009321f] dark:border-gray-600 bg-white">
                  {isLoading || !mfaData?.qrImageUrl ? (
                    <Skeleton className="w-[160px] h-[160px]" />
                  ) : (
                    <img
                      alt="QR code"
                      decoding="async"
                      src={mfaData.qrImageUrl}
                      width="160"
                      height="160"
                      className="rounded-md"
                    />
                  )}
                </div>

                {showKey ? (
                  <div className="w-full">
                    <div className="flex items-center justify-between gap-1 text-sm text-[#0007149f] dark:text-muted-foreground font-normal">
                      <span>Copy setup key</span>
                      <Button
                        size="sm"
                        disabled={copied}
                        onClick={() => onCopy(mfaData?.qrImageUrl)}
                      >
                        {copied ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-sm block truncate w-[200px] text-black dark:text-muted-foreground">
                      {mfaData?.secret}
                    </p>
                  </div>
                ) : (
                  <span className="text-sm text-[#0007149f] dark:text-muted-foreground font-normal">
                    Can't scan the code ?
                    <button
                      className="block text-primary transition duration-200 ease-in-out hover:underline
                     dark:text-white"
                      type="button"
                      onClick={() => setShowKey(true)}
                    >
                      View the Setup Key
                    </button>
                  </span>
                )}
              </div>

              <div className="mt-8 border-t">
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="w-full mt-6 flex flex-col gap-4"
                  >
                    <FormField
                      control={form.control}
                      name="pin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm mb-1 text-slate-11 font-bold">
                            Then enter the code
                          </FormLabel>
                          <FormControl>
                            <InputOTP
                              className="!text-lg flex items-center"
                              maxLength={6}
                              pattern={REGEXP_ONLY_DIGITS}
                              {...field}
                              style={{ justifyContent: 'center' }}
                            >
                              <InputOTPGroup>
                                <InputOTPSlot
                                  index={0}
                                  className="!w-14 !h-12 !text-lg"
                                />
                                <InputOTPSlot
                                  index={1}
                                  className="!w-14 !h-12 !text-lg"
                                />
                              </InputOTPGroup>
                              <InputOTPGroup>
                                <InputOTPSlot
                                  index={2}
                                  className="!w-14 !h-12 !text-lg"
                                />
                                <InputOTPSlot
                                  index={3}
                                  className="!w-14 !h-12 !text-lg"
                                />
                              </InputOTPGroup>
                              <InputOTPGroup>
                                <InputOTPSlot
                                  index={4}
                                  className="!w-14 !h-12 !text-lg"
                                />
                                <InputOTPSlot
                                  index={5}
                                  className="!w-14 !h-12 !text-lg"
                                />
                              </InputOTPGroup>
                            </InputOTP>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button disabled={isPending} className="w-full h-[40px]">
                      {isPending && <Loader className="animate-spin" />}
                      Verify
                    </Button>
                  </form>
                </Form>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};

export default EnableMFA;
