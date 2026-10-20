import { testLoginEnabled } from "@/lib/test-login";
import { GoogleButton } from "./google-button";
import { TestLoginForm } from "./test-login-form";

export default function LoginPage() {
  return (
    <main>
      <h1>Entrar a MH Executive OS</h1>
      <p>Usa tu cuenta de Google de Machinery Hunters.</p>
      <GoogleButton />
      {testLoginEnabled() && <TestLoginForm />}
    </main>
  );
}
