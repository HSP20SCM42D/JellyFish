import { Card, CardContent } from "@/components/ui/card";
import { SignInButton } from "@/components/SignInButton";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="w-full max-w-sm px-4">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🪼</div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Jellyfish
          </h1>
          <p className="text-zinc-400 mt-2 text-sm">
            Executive Relationship Intelligence
          </p>
        </div>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-6">
            <p className="text-zinc-400 text-sm text-center mb-6">
              Connect your Gmail and Google Calendar to get started.
            </p>
            <SignInButton />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
