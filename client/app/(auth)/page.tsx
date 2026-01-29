'use client';

import { useRouter } from 'next/navigation';
import { loginMutationFn } from '../../lib/api';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from '@/hooks/use-toast';
import Logo from '@/components/logo';
import Link from 'next/link';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader } from 'lucide-react';

export default function Login() {
  const router = useRouter();
  const { mutate, isPending } = useMutation({
    mutationFn: loginMutationFn,
    retry: false,
    onSettled: () => {
      form.reset();
    },
  });

  const formSchema = z.object({
    email: z.email().min(1, {
      message: 'Email is required',
    }),
    password: z.string().trim().min(6, {
      message: 'Password is required',
    }),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    mutate(values, {
      onSuccess: response => {
        if (response.data.mfaRequired) {
          router.replace(`/verify-mfa?email=${values.email}`);
          return;
        }
        router.replace('/home');
      },
      onError: error => {
        console.error(error);
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      },
    });
  };

  return (
    <main className="w-full min-h-[590px] h-auto max-w-full pt-10">
      <div className="w-full h-full p-5 rounded-md">
        <Logo />

        <h1 className="text-xl tracking-[-0.16px] dark:text-[#fcfdffef] font-bold mb-1.5 mt-8 text-center sm:text-left">
          Log in to Secure-Auth
        </h1>
        <p className="mb-8 text-center sm:text-left text-base dark:text-[#f1f7feb5] font-normal">
          Don't have an account?{' '}
          <Link className="text-primary" href="/signup">
            Sign up
          </Link>
          .
        </p>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="mb-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="dark:text-[#f1f7feb5] text-sm">
                      Email
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="lokesh@gmail.com"
                        {...field}
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="mb-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="dark:text-[#f1f7feb5] text-sm">
                      Password
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="********"
                        {...field}
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="mb-4 flex w-full items-center justify-end">
              <Link
                className="text-sm dark:text-white"
                href={`/forgot-password?email=${form.getValues().email}`}
              >
                Forgot your password?
              </Link>
            </div>
            <Button
              className="w-full text-[15px] h-[40px] text-white font-semibold"
              disabled={isPending}
              type="submit"
            >
              {isPending && <Loader className="animate-spin" />}
              Sign in
              <ArrowRight />
            </Button>

            <div className="mb-6 mt-6 flex items-center justify-center">
              <div
                aria-hidden="true"
                className="h-px w-full bg-[#eee] dark:bg-[#d6ebfd30]"
                data-orientation="horizontal"
                role="separator"
              ></div>
              <span className="mx-4 text-xs dark:text-[#f1f7feb5] font-normal">
                OR
              </span>
              <div
                aria-hidden="true"
                className="h-px w-full bg-[#eee] dark:bg-[#d6ebfd30]"
                data-orientation="horizontal"
                role="separator"
              ></div>
            </div>
          </form>
        </Form>
        <Button variant="outline" className="w-full h-[40px]">
          Email magic link
        </Button>
        <p className="text-xs dark:text-slate- font-normal mt-7">
          By signing in, you agree to our{' '}
          <a className="text-primary hover:underline" href="#">
            Terms of Service
          </a>{' '}
          and{' '}
          <a className="text-primary hover:underline" href="#">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </main>
  );
}
