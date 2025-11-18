import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
  FieldDescription
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useState } from "react"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  // Use mock credentials since environment variables are not accessible client-side in this context
  const correctUserEmail = process.env.NEXT_PUBLIC_EMAIL 
  const correctPassword = process.env.NEXT_PUBLIC_ANON_KEY 

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // <TASK> : Authenticate the user and save the session
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (email === correctUserEmail && password === correctPassword) {
      // 1. Save the mock session status to localStorage
      localStorage.setItem("mockSessionStatus", "authenticated");
      // 2. Redirect to the home page, which will now see the authenticated session via useMockSession()
      window.location.href = '/'; 
    } else {
      setError('Invalid email or password. ');
    }
  };

  return (
    <form className={cn("flex flex-col gap-6", className)} {...props} onSubmit={handleSubmit}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Login to your account</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Enter your email below to login to your account
          </p>
        </div>
        {error && (
            <div className="text-sm text-center text-red-500 p-2 border border-red-200 rounded-md bg-red-50">
                {error}
            </div>
        )}
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input 
            id="email" 
            type="email" 
            placeholder="m@example.com" 
            required 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            {/* <a
              href="#"
              className="ml-auto text-sm underline-offset-4 hover:underline"
            >
              Forgot your password?
            </a> */}
          </div>
          <Input 
            id="password" 
            type="password" 
            required 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Field>
          <Button type="submit">Login</Button>
        </Field>
        
      </FieldGroup>
    </form>
  )
}
// --- End components/login-form.tsx ---