"use client";

import { useState } from "react";
import { Building2, LogIn, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrentAgent } from "@/hooks/useCurrentAgent";

interface PinLoginScreenProps {
  onLogin: () => void;
}

export function PinLoginScreen({ onLogin }: PinLoginScreenProps) {
  const { login } = useCurrentAgent();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pin.trim()) {
      setError("يرجى إدخال الرمز السري");
      return;
    }

    setIsLoading(true);
    setError("");

    const result = await login(pin.trim());
    setIsLoading(false);

    if (result.success) {
      onLogin();
    } else {
      setError(result.error || "رمز سري غير صحيح");
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-background p-4"
      dir="rtl"
    >
      <Card className="w-full max-w-sm">
        <CardContent className="p-8 space-y-6">
          {/* Logo */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center">
              <Building2 className="w-8 h-8 text-primary-foreground" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold">عقاري</h1>
              <p className="text-sm text-muted-foreground mt-1">
                أدخل رمزك السري للمتابعة
              </p>
            </div>
          </div>

          {/* PIN Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pin-input" className="text-center block">
                الرمز السري
              </Label>
              <Input
                id="pin-input"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, ""));
                  setError("");
                }}
                placeholder="أدخل الرمز السري"
                dir="ltr"
                className="text-center text-2xl tracking-[0.5em] font-mono"
                autoFocus
                disabled={isLoading}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading || !pin.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  جاري التحقق...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4 ml-2" />
                  دخول
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}