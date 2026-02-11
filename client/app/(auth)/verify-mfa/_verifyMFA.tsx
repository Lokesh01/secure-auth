'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import React from 'react';
import { verifyMFALoginMutationFn } from '@/lib/api';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from '@/hooks/use-toast';
import Logo from '@/components/logo';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '../../../components/ui/input-otp';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { Button } from '../../../components/ui/button';
import { ArrowRight, Loader } from 'lucide-react';

const VerifyMFA = () => {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get('email');

  const { mutate, isPending } = useMutation({
    mutationFn: verifyMFALoginMutationFn,
  });

  const FormSchema = z.object({
    pin: z.string().min(6, {
      message: 'Your one-time password must be 6 characters.',
    }),
  });

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      pin: '',
    },
  });

  const onSubmit = (values: z.infer<typeof FormSchema>) => {
    if (!email) {
      router.replace('/');
      return;
    }
    const data = {
      code: values.pin,
      email,
    };

    mutate(data, {
      onSuccess: response => {
        router.replace('/home');
        toast({
          title: 'Success',
          description: response?.data?.message,
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
  };
  return (
    <main className="w-full tracking-[-0.16px] dark:text-[#fcfdffef] font-bold mt-8 text-center sm:text-left">
      <div className="w-full h-full p-5 rounded-md">
        <Logo />
        <h1
          className="text-xl tracking-[-0.16px] dark:text-[#fcfdffef] font-bold mt-8
        text-center sm:text-left"
        >
          Multi-Factor Authentication
        </h1>
        <p className="mb-6 text-center sm:text-left text-[15px] dark:text-[#f1f7feb5] font-normal">
          Enter the code from your authenticator app
        </p>

        <div className="mt-2">
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
                    <FormLabel className="text-sm mb-1 font-normal">
                      One-Time Code
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
                  </FormItem>
                )}
              />

              <Button disabled={isPending} className="w-full h-[40px] mt-2">
                {isPending && <Loader className="animate-spin" />}
                Continue
                <ArrowRight />
              </Button>
            </form>
          </Form>
        </div>

        <Button variant="ghost" className="w-full text-[15px] mt-2 h-[40px]">
          Return to sign in
        </Button>
      </div>
    </main>
  );
};

export default VerifyMFA;
