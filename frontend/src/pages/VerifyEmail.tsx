import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Loader2, ArrowRight, Mail } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const emailHint = searchParams.get('email');
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'idle'>(token ? 'loading' : 'idle');
  const [resendEmail, setResendEmail] = useState(emailHint || '');
  const [isResending, setIsResending] = useState(false);
  const { verifyEmail, resendVerification } = useAuthStore();

  useEffect(() => {
    if (token && status === 'loading') {
      const performVerification = async () => {
        try {
          await verifyEmail(token);
          setStatus('success');
          toast.success('Email verified successfully!');
        } catch (error) {
          setStatus('error');
          toast.error('Verification failed. The link may be invalid or expired.');
        }
      };
      performVerification();
    }
  }, [token, verifyEmail]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail) return toast.error('Please enter your email');
    
    setIsResending(true);
    try {
      await resendVerification(resendEmail);
      toast.success('Verification email resent!');
      setStatus('idle');
    } catch (error: any) {
      toast.error(error.message || 'Failed to resend verification');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <Card className="border-border/40 shadow-elegant bg-card/50 backdrop-blur-sm text-center">
          <CardHeader>
            <div className="flex justify-center mb-6">
              {status === 'loading' && (
                <Loader2 className="w-16 h-16 text-primary animate-spin" />
              )}
              {status === 'success' && (
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-primary" />
                </div>
              )}
              {(status === 'error' || status === 'idle') && (
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
              )}
            </div>
            
            <CardTitle className="text-2xl font-display">
              {status === 'loading' && 'Verifying your email...'}
              {status === 'success' && 'Email Verified!'}
              {status === 'error' && 'Verification Link Expired'}
              {status === 'idle' && 'Check your inbox'}
            </CardTitle>
            
            <CardDescription className="text-lg pt-2">
              {status === 'loading' && 'Please wait while we confirm your account.'}
              {status === 'success' && 'Your account is now active. You can start using Zen-Do.'}
              {status === 'error' && 'The verification link is invalid or has expired. You can request a new one below.'}
              {status === 'idle' && 'We sent a verification link to your email address.'}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-4">
            {status === 'success' ? (
              <Link to="/login">
                <Button className="w-full gap-2 h-12 text-base">
                  Go to Login <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            ) : (status === 'error' || status === 'idle') ? (
              <form onSubmit={handleResend} className="space-y-4 text-left">
                <div className="space-y-2">
                  <Label htmlFor="resend-email" className="text-sm font-medium">Resend verification link</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="resend-email"
                      type="email"
                      placeholder="Enter your email"
                      className="pl-10 h-11"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-11 transition-spring"
                  disabled={isResending}
                >
                  {isResending ? 'Sending...' : 'Send Link'}
                </Button>
                <div className="text-center pt-2">
                  <Link to="/login" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Back to Login
                  </Link>
                </div>
              </form>
            ) : null}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default VerifyEmail;
