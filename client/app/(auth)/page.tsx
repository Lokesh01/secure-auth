'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { githubOAuthFn, googleOAuthFn, loginMutationFn } from '../../lib/api';
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
import { ArrowRight, Eye, EyeOff, Loader } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import { FaGithub } from 'react-icons/fa';
import { useEffect } from 'react';
import { loginSchema } from '../../lib/validations/auth.schema';

function LoginContent() {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const { mutate, isPending } = useMutation({
    mutationFn: loginMutationFn,
    retry: false,
    onSettled: () => {
      form.reset();
    },
  });

  useEffect(() => {
    if (searchParams.get('error') === 'oauth_failed') {
      toast({
        title: 'OAuth Login Failed',
        description:
          'Login with Google or GitHub failed. Please try again or use email and password.',
        variant: 'destructive',
      });
    }
  }, [searchParams]);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = (values: z.infer<typeof loginSchema>) => {
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

        <h1 className="text-xl tracking-[-0.16px] dark:text-[#fcfdffef] font-bold mb-1.5 mt-8 text-center">
          Log in to Secure-Auth
        </h1>
        <p className="mb-8 text-center text-base dark:text-[#f1f7feb5] font-normal">
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
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="********"
                          {...field}
                          disabled={isPending}
                          className="pr-10"
                          autoComplete="off"
                        />

                        <button
                          type="button"
                          onClick={() => setShowPassword(prev => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        >
                          {showPassword ? (
                            <Eye className="size-4" />
                          ) : (
                            <EyeOff className="size-4" />
                          )}
                        </button>
                      </div>
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

        {/* OAuth Buttons */}
        <div className="flex flex-col gap-3">
          <Button
            variant="outline"
            className="w-full h-[40px] flex items-center gap-2"
            onClick={googleOAuthFn}
          >
            <FcGoogle className="size-5" />
            Continue with Google
          </Button>

          <Button
            variant="outline"
            className="w-full h-[40px] flex items-center gap-2"
            onClick={githubOAuthFn}
          >
            <FaGithub className="size-5" />
            Continue with GitHub
          </Button>
        </div>

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

export default function Login() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
